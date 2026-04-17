require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.AWS_REGION
});

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function pullRepo(remote) {

    const repoPath = process.cwd();
    const commithubPath = path.join(repoPath, ".CommitHub");

    const configPath = path.join(commithubPath, "config.json");

    if (!fs.existsSync(configPath)) {
        console.log("Remote config not found");
        return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    const bucket = config.remotes[remote];

    if (!bucket) {
        console.log("Remote not found");
        return;
    }

    const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: ".CommitHub/"
    });

    const objects = await s3.send(listCommand);

    if (!objects.Contents || objects.Contents.length === 0) {
        console.log("No files found in remote");
        return;
    }

    for (const obj of objects.Contents) {

        if (!obj.Key) continue;

        const key = obj.Key;

        const localPath = path.join(repoPath, key);
        const dir = path.dirname(localPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });

        const response = await s3.send(command);

        if (!response.Body) continue;

        const buffer = await streamToBuffer(response.Body);

        fs.writeFileSync(localPath, buffer);

        console.log("Downloaded:", key);
    }

    console.log("Pull complete");
}

module.exports = { pullRepo };