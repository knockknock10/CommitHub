import fs from "fs";
import path from "path";

import { VCS_DIR } from "./helpers.js";

const parseRemoteLocation = (location) => {
    if (location.startsWith("file://")) {
        return {
            type: "local",
            root: path.resolve(location.slice("file://".length))
        };
    }

    if (location.startsWith("s3://")) {
        const remainder = location.slice("s3://".length);
        let bucket = "";
        let key = "";

        if (remainder.startsWith("/")) {
            key = remainder.slice(1);
        } else {
            const slash = remainder.indexOf("/");

            if (slash === -1) {
                bucket = remainder;
            } else {
                bucket = remainder.slice(0, slash);
                key = remainder.slice(slash + 1);
            }
        }

        return {
            type: "s3",
            bucket: bucket || null,
            key: key.replace(/^\/+|\/+$/g, "")
        };
    }

    return {
        type: "local",
        root: path.resolve(location.replace(/[\\/]+$/, ""))
    };
};

const localTransport = (root) => ({
    description: root,
    async list() {
        return collectFiles(root, "", []);
    },
    async read(relative) {
        return fs.promises.readFile(path.join(root, relative));
    },
    async write(relative, data) {
        const target = path.join(root, relative);

        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.writeFile(target, data);
    },
    async remove(relative) {
        await fs.promises.rm(path.join(root, relative), { force: true });
    }
});

const collectFiles = async (dir, base = "", skip = []) => {
    const results = [];
    const entries = await fs.promises.readdir(
        dir,
        { withFileTypes: true }
    );

    for (const entry of entries) {
        if (skip.includes(entry.name)) {
            continue;
        }

        const relative = base ? `${base}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            results.push(
                ...await collectFiles(fullPath, relative, skip)
            );
        } else if (entry.isFile()) {
            results.push(relative);
        }
    }

    return results;
};

const loadS3Client = async () => {
    const { s3, S3_BUCKET } = await import("../config/aws-config.js");
    return { s3, S3_BUCKET };
};

const s3Transport = async (bucket, key) => {
    const { s3, S3_BUCKET } = await loadS3Client();
    const bucketName = bucket || S3_BUCKET;
    const prefix = key ? `${key}/` : "";

    if (!bucketName) {
        const error = new Error(
            `S3 remote requires a bucket or the S3_BUCKET environment variable`
        );
        error.code = "S3_REMOTE_CONFIG";
        throw error;
    }

    return {
        description: `s3://${bucketName}/${key}`,
        prefix,
        async list() {
            const names = [];
            let continuationToken;

            do {
                const response = await s3.listObjectsV2({
                    Bucket: bucketName,
                    Prefix: prefix,
                    ContinuationToken: continuationToken
                });

                for (const entry of response.Contents || []) {
                    if (entry.Key && entry.Key !== prefix) {
                        names.push(entry.Key);
                    }
                }

                continuationToken = response.IsTruncated
                    ? response.NextContinuationToken
                    : null;
            } while (continuationToken);

            return names.map((entry) => entry.slice(prefix.length));
        },
        async read(relative) {
            const response = await s3.getObject({
                Bucket: bucketName,
                Key: prefix + relative
            });

            const body = await response.Body.transformToByteArray();

            return Buffer.from(body);
        },
        async write(relative, data) {
            await s3.putObject({
                Bucket: bucketName,
                Key: prefix + relative,
                Body: data
            });
        },
        async remove(relative) {
            await s3.deleteObject({
                Bucket: bucketName,
                Key: prefix + relative
            });
        }
    };
};

const getRemoteTransport = async (location) => {
    const parsed = parseRemoteLocation(location);

    if (parsed.type === "s3") {
        return s3Transport(parsed.bucket, parsed.key);
    }

    return localTransport(parsed.root);
};

const pushRemoteFiles = async (repoRoot, transport) => {
    const files = await collectFiles(
        path.join(repoRoot, VCS_DIR),
        "",
        ["staging", "index.json"]
    );

    for (const file of files) {
        const content = await fs.promises.readFile(
            path.join(repoRoot, VCS_DIR, file)
        );

        await transport.write(file, content);
    }

    return files;
};

const pullRemoteFiles = async (repoRoot, transport, downloadAll = false) => {
    const names = await transport.list();
    const downloaded = [];

    for (const name of names) {
        if (name === "index.json" || name.startsWith("staging/")) {
            continue;
        }

        if (!downloadAll && name !== "config.json" && !name.startsWith("refs/heads/")) {
            continue;
        }

        const content = await transport.read(name);
        const target = path.join(repoRoot, VCS_DIR, name);

        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.writeFile(target, content);
        downloaded.push(name);
    }

    return downloaded;
};

const listRemoteFiles = async (repoRoot, transport) => {
    const names = await transport.list();
    const files = [];

    for (const name of names) {
        if (name !== "index.json" && !name.startsWith("staging/")) {
            files.push(name);
        }
    }

    return files;
};

export {
    parseRemoteLocation,
    getRemoteTransport,
    pushRemoteFiles,
    pullRemoteFiles,
    listRemoteFiles
};