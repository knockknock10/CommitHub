import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_COMMIT_MESSAGE_LENGTH = 200;
const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 100;
const COMMIT_ID_PATTERN = /^[0-9a-f]{4,40}$/i;
const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,62}$/;

const isValidCommitId = (commitId) =>
    typeof commitId === "string" && COMMIT_ID_PATTERN.test(commitId);

const isValidBranchName = (branchName) =>
    typeof branchName === "string" &&
    BRANCH_NAME_PATTERN.test(branchName) &&
    !branchName.includes("..") &&
    branchName
        .split("/")
        .every((part) => part.length > 0 && part !== ".");

const getVcRoot = (repoRoot) =>
    path.join(repoRoot, ".CommitHub");

const getBranchRefPath = (vcRoot, branch) =>
    path.join(vcRoot, "refs", "heads", branch);

const ensureVersionControl = async (repoRoot) => {
    const vcRoot = getVcRoot(repoRoot);

    await fs.promises.mkdir(
        path.join(vcRoot, "commits"),
        { recursive: true }
    );
    await fs.promises.mkdir(
        path.join(vcRoot, "staging"),
        { recursive: true }
    );
    await fs.promises.mkdir(
        path.join(vcRoot, "refs", "heads"),
        { recursive: true }
    );

    const headPath = path.join(vcRoot, "HEAD");

    try {
        await fs.promises.access(headPath);
    } catch {
        await fs.promises.writeFile(headPath, "ref: refs/heads/main");
    }

    const configPath = path.join(vcRoot, "config.json");

    try {
        await fs.promises.access(configPath);
    } catch {
        await fs.promises.writeFile(
            configPath,
            JSON.stringify({
                author: null,
                currentBranch: "main",
                remotes: {}
            }, null, 2)
        );
    }

    const mainRefPath = getBranchRefPath(vcRoot, "main");

    try {
        await fs.promises.access(mainRefPath);
    } catch {
        await fs.promises.writeFile(mainRefPath, "");
    }

    return vcRoot;
};

const getCurrentBranch = async (vcRoot) => {
    const headContent = (
        await fs.promises.readFile(
            path.join(vcRoot, "HEAD"),
            "utf-8"
        )
    ).trim();

    if (headContent.startsWith("ref:")) {
        return headContent.replace(/^ref: refs\/heads\//, "");
    }

    return headContent;
};

const getHeadCommitId = async (vcRoot) => {
    const branch = await getCurrentBranch(vcRoot);
    const refPath = getBranchRefPath(vcRoot, branch);

    try {
        const value = (
            await fs.promises.readFile(refPath, "utf-8")
        ).trim();

        return value || null;
    } catch {
        return null;
    }
};

const collectFiles = async (dir, base, skip) => {
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

const hashFile = async (filePath) => {
    const content = await fs.promises.readFile(filePath);
    return crypto.createHash("sha1").update(content).digest("hex");
};

const getSnapshotRoot = (vcRoot, commitId) => {
    const commitDir = path.join(vcRoot, "commits", commitId);
    const snapshotDir = path.join(commitDir, "snapshot");

    if (fs.existsSync(snapshotDir)) {
        return snapshotDir;
    }

    return commitDir;
};

const getWorkingTreeChanges = async (repoRoot) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);

    const workingFiles = await collectFiles(
        repoRoot,
        "",
        [".CommitHub"]
    );
    const workingSet = new Set(workingFiles);

    if (!headCommitId) {
        return workingFiles.map((file) => ({
            path: file,
            status: "A"
        }));
    }

    const snapshotRoot = getSnapshotRoot(vcRoot, headCommitId);
    const snapshotFiles = await collectFiles(
        snapshotRoot,
        "",
        ["meta.json"]
    );
    const snapshotSet = new Set(snapshotFiles);

    const changes = [];

    for (const file of workingFiles) {
        if (!snapshotSet.has(file)) {
            changes.push({ path: file, status: "A" });
            continue;
        }

        const workingHash = await hashFile(path.join(repoRoot, file));
        const snapshotHash = await hashFile(path.join(snapshotRoot, file));

        if (workingHash !== snapshotHash) {
            changes.push({ path: file, status: "M" });
        }
    }

    for (const file of snapshotFiles) {
        if (!workingSet.has(file)) {
            changes.push({ path: file, status: "D" });
        }
    }

    changes.sort((a, b) => a.path.localeCompare(b.path));

    return changes;
};

const generateCommitId = (author, message, timestamp, parent, changes) =>
    crypto.createHash("sha1")
        .update(JSON.stringify({
            author,
            message,
            timestamp,
            parent,
            changes
        }))
        .digest("hex")
        .slice(0, 12);

const createCommit = async (repoRoot, { message, author }) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);
    const changes = await getWorkingTreeChanges(repoRoot);

    if (changes.length === 0) {
        const error = new Error("No changes to commit");
        error.code = "NO_CHANGES";
        throw error;
    }

    const timestamp = Date.now();
    const commitId = generateCommitId(
        author,
        message,
        timestamp,
        headCommitId,
        changes
    );
    const commitDir = path.join(vcRoot, "commits", commitId);
    const snapshotDir = path.join(commitDir, "snapshot");

    await fs.promises.mkdir(snapshotDir, { recursive: true });

    const workingFiles = await collectFiles(repoRoot, "", [".CommitHub"]);

    try {
        for (const file of workingFiles) {
            const source = path.join(repoRoot, file);
            const target = path.join(snapshotDir, file);

            await fs.promises.mkdir(
                path.dirname(target),
                { recursive: true }
            );
            await fs.promises.copyFile(source, target);
        }

        const metadata = {
            id: commitId,
            message,
            author: {
                name: author.name,
                email: author.email
            },
            timestamp,
            parent: headCommitId,
            files: changes
        };

        await fs.promises.writeFile(
            path.join(commitDir, "meta.json"),
            JSON.stringify(metadata, null, 2)
        );

        const branch = await getCurrentBranch(vcRoot);

        await fs.promises.writeFile(
            getBranchRefPath(vcRoot, branch),
            commitId
        );

        return metadata;
    } catch (error) {
        await fs.promises.rm(commitDir, { recursive: true, force: true });
        throw error;
    }
};

const readMeta = async (vcRoot, commitId) => {
    if (!isValidCommitId(commitId)) {
        const error = new Error("Invalid commit ID");
        error.code = "INVALID_COMMIT_ID";
        throw error;
    }

    const metaPath = path.join(vcRoot, "commits", commitId, "meta.json");

    let raw;

    try {
        raw = await fs.promises.readFile(metaPath, "utf-8");
    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }

        throw error;
    }

    try {
        const metadata = JSON.parse(raw);

        if (!metadata || typeof metadata !== "object") {
            return null;
        }

        return metadata;
    } catch {
        const error = new Error("Commit metadata is corrupted");
        error.code = "CORRUPT_COMMIT";
        throw error;
    }
};

const getCommit = async (repoRoot, commitId) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const metadata = await readMeta(vcRoot, commitId);

    if (!metadata) {
        return null;
    }

    return {
        id: metadata.id || commitId,
        message: metadata.message,
        author: metadata.author,
        timestamp: metadata.timestamp,
        parent: metadata.parent,
        files: metadata.files || []
    };
};

const getCommitHistory = async (
    repoRoot,
    { limit = DEFAULT_HISTORY_LIMIT, offset = 0 } = {}
) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);

    if (!headCommitId) {
        return [];
    }

    const commits = [];
    let current = headCommitId;
    let index = 0;

    while (current && commits.length < limit) {
        let metadata;

        try {
            metadata = await readMeta(vcRoot, current);
        } catch {
            break;
        }

        if (!metadata) {
            break;
        }

        if (index >= offset) {
            commits.push({
                id: metadata.id || current,
                message: metadata.message,
                author: metadata.author,
                timestamp: metadata.timestamp,
                parent: metadata.parent
            });
        }

        index += 1;
        current = metadata.parent;
    }

    return commits;
};

const removeEmptyDirectories = async (dir, repoRoot) => {
    let entries;

    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const fullPath = path.join(dir, entry.name);

            if (entry.name === ".CommitHub" || fullPath === repoRoot) {
                continue;
            }

            await removeEmptyDirectories(fullPath, repoRoot);
        }
    }

    if (dir === repoRoot) {
        return;
    }

    try {
        await fs.promises.rmdir(dir);
    } catch {
        /* not empty or another error — keep the directory */
    }
};

const readRefNames = async (dir, prefix = "") => {
    const names = [];

    let entries;

    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        return names;
    }

    for (const entry of entries) {
        const name = prefix
            ? `${prefix}/${entry.name}`
            : entry.name;

        if (entry.isDirectory()) {
            names.push(
                ...await readRefNames(path.join(dir, entry.name), name)
            );
        } else if (entry.isFile()) {
            names.push(name);
        }
    }

    return names;
};

const listBranches = async (repoRoot) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const currentBranch = await getCurrentBranch(vcRoot);
    const headsDir = path.join(vcRoot, "refs", "heads");

    const names = (await readRefNames(headsDir)).sort();

    const branches = [];

    for (const name of names) {
        let commitId = null;

        try {
            commitId = (
                await fs.promises.readFile(
                    path.join(headsDir, name),
                    "utf-8"
                )
            ).trim() || null;
        } catch {
            commitId = null;
        }

        branches.push({
            name,
            isCurrent: name === currentBranch,
            isDefault: name === "main",
            commitId
        });
    }

    branches.sort((a, b) => {
        if (a.isCurrent !== b.isCurrent) {
            return a.isCurrent ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    return { currentBranch, branches };
};

const createBranch = async (repoRoot, branchName) => {
    if (!isValidBranchName(branchName)) {
        const error = new Error("Invalid branch name");
        error.code = "INVALID_BRANCH_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const refPath = getBranchRefPath(vcRoot, branchName);

    try {
        await fs.promises.access(refPath);

        const error = new Error(`Branch "${branchName}" already exists`);
        error.code = "BRANCH_EXISTS";
        throw error;
    } catch (error) {
        if (error.code === "BRANCH_EXISTS") {
            throw error;
        }
        /* ENOENT — the branch does not exist yet */
    }

    const headCommitId = await getHeadCommitId(vcRoot);

    if (!headCommitId) {
        const error = new Error(
            "Cannot create a branch before the first commit"
        );
        error.code = "NO_HEAD_COMMIT";
        throw error;
    }

    await fs.promises.mkdir(path.dirname(refPath), { recursive: true });
    await fs.promises.writeFile(refPath, headCommitId);

    return {
        name: branchName,
        commitId: headCommitId
    };
};

const checkoutBranch = async (
    repoRoot,
    branchName,
    { force = false } = {}
) => {
    if (!isValidBranchName(branchName)) {
        const error = new Error("Invalid branch name");
        error.code = "INVALID_BRANCH_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const currentBranch = await getCurrentBranch(vcRoot);

    if (branchName === currentBranch) {
        return {
            name: branchName,
            commitId: await getHeadCommitId(vcRoot),
            switched: false
        };
    }

    const refPath = getBranchRefPath(vcRoot, branchName);

    try {
        await fs.promises.access(refPath);
    } catch {
        const error = new Error(`Branch "${branchName}" does not exist`);
        error.code = "BRANCH_NOT_FOUND";
        throw error;
    }

    if (!force) {
        const changes = await getWorkingTreeChanges(repoRoot);

        if (changes.length > 0) {
            const error = new Error(
                "Cannot switch branches with uncommitted changes"
            );
            error.code = "DIRTY_TREE";
            throw error;
        }
    }

    let targetCommitId = null;

    try {
        targetCommitId = (
            await fs.promises.readFile(refPath, "utf-8")
        ).trim() || null;
    } catch {
        targetCommitId = null;
    }

    const targetSnapshotRoot = targetCommitId
        ? getSnapshotRoot(vcRoot, targetCommitId)
        : null;
    const targetFiles = targetSnapshotRoot
        ? await collectFiles(targetSnapshotRoot, "", ["meta.json"])
        : [];
    const targetSet = new Set(targetFiles);

    const workingFiles = await collectFiles(
        repoRoot,
        "",
        [".CommitHub"]
    );

    for (const file of workingFiles) {
        if (!targetSet.has(file)) {
            await fs.promises.rm(
                path.join(repoRoot, file),
                { force: true }
            );
        }
    }

    await removeEmptyDirectories(repoRoot, repoRoot);

    if (targetSnapshotRoot) {
        for (const file of targetFiles) {
            const source = path.join(targetSnapshotRoot, file);
            const target = path.join(repoRoot, file);

            await fs.promises.mkdir(
                path.dirname(target),
                { recursive: true }
            );
            await fs.promises.copyFile(source, target);
        }
    }

    await fs.promises.writeFile(
        path.join(vcRoot, "HEAD"),
        `ref: refs/heads/${branchName}`
    );

    return {
        name: branchName,
        commitId: targetCommitId,
        switched: true
    };
};

export {
    MAX_COMMIT_MESSAGE_LENGTH,
    DEFAULT_HISTORY_LIMIT,
    MAX_HISTORY_LIMIT,
    isValidCommitId,
    isValidBranchName,
    ensureVersionControl,
    getCurrentBranch,
    getHeadCommitId,
    getWorkingTreeChanges,
    createCommit,
    getCommit,
    getCommitHistory,
    listBranches,
    createBranch,
    checkoutBranch
};
