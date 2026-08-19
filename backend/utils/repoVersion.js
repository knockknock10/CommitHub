import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_COMMIT_MESSAGE_LENGTH = 200;
const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 100;
const MAX_FILE_SIZE = 1024 * 1024;
const COMMIT_ID_PATTERN = /^[0-9a-f]{4,40}$/i;
const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,62}$/;
const TAG_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;

const isValidCommitId = (commitId) =>
    typeof commitId === "string" && COMMIT_ID_PATTERN.test(commitId);

const isValidBranchName = (branchName) =>
    typeof branchName === "string" &&
    BRANCH_NAME_PATTERN.test(branchName) &&
    !branchName.includes("..") &&
    branchName
        .split("/")
        .every((part) => part.length > 0 && part !== ".");

const isValidTagName = (tagName) =>
    typeof tagName === "string" &&
    TAG_NAME_PATTERN.test(tagName) &&
    !tagName.includes("..") &&
    !tagName.endsWith(".") &&
    !tagName.endsWith(".lock");

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
    await fs.promises.mkdir(
        path.join(vcRoot, "refs", "tags"),
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

const getSnapshot = async (vcRoot, commitId) => {
    const commitDir = path.join(vcRoot, "commits", commitId);
    const snapshotDir = path.join(commitDir, "snapshot");
    const hasSnapshotLayout = fs.existsSync(snapshotDir);
    const root = hasSnapshotLayout ? snapshotDir : commitDir;

    /*
     * Legacy commits stored files directly in the commit directory next to
     * meta.json, so that metadata file must be skipped there. Commits in the
     * snapshot layout keep only tracked files in snapshot/, so a working-tree
     * file literally named "meta.json" is a legitimate committed file and
     * must never be skipped.
     */
    const skip = hasSnapshotLayout ? [] : ["meta.json"];

    return {
        root,
        files: await collectFiles(root, "", skip)
    };
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

    const { root: snapshotRoot, files: snapshotFiles } = await getSnapshot(
        vcRoot,
        headCommitId
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

const generateCommitId = (
    author,
    message,
    timestamp,
    parent,
    changes,
    parents
) =>
    crypto.createHash("sha1")
        .update(JSON.stringify({
            author,
            message,
            timestamp,
            parent,
            changes,
            parents: parents || undefined
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
            parents: headCommitId ? [headCommitId] : [],
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

const createMergeCommit = async (
    repoRoot,
    { message, author, parents }
) => {
    if (!Array.isArray(parents) || parents.length < 2) {
        const error = new Error(
            "Merge commit requires at least two parents"
        );
        error.code = "INVALID_PARENTS";
        throw error;
    }

    for (const parentId of parents) {
        if (!isValidCommitId(parentId)) {
            const error = new Error("Invalid parent commit ID");
            error.code = "INVALID_COMMIT_ID";
            throw error;
        }
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const timestamp = Date.now();

    const parentMeta = await Promise.all(
        parents.map((p) => readMeta(vcRoot, p))
    );

    for (let i = 0; i < parentMeta.length; i += 1) {
        if (!parentMeta[i]) {
            const error = new Error(
                `Parent commit "${parents[i]}" not found`
            );
            error.code = "COMMIT_NOT_FOUND";
            throw error;
        }
    }

    const sourceSnapshot = await getSnapshot(vcRoot, parents[1]);
    const sourceFiles = new Set(sourceSnapshot.files);

    const mergedFiles = new Set();

    for (const file of sourceSnapshot.files) {
        mergedFiles.add(file);
    }

    const baseSnapshot = await getSnapshot(vcRoot, parents[0]);

    for (const file of baseSnapshot.files) {
        if (!sourceFiles.has(file)) {
            mergedFiles.add(file);
        }
    }

    const commitId = generateCommitId(
        author,
        message,
        timestamp,
        parents[0],
        [],
        parents
    );

    const commitDir = path.join(vcRoot, "commits", commitId);
    const snapshotDir = path.join(commitDir, "snapshot");

    await fs.promises.mkdir(snapshotDir, { recursive: true });

    try {
        for (const file of mergedFiles) {
            const sourcePath = sourceFiles.has(file)
                ? path.join(sourceSnapshot.root, file)
                : path.join(baseSnapshot.root, file);

            const targetPath = path.join(snapshotDir, file);

            await fs.promises.mkdir(
                path.dirname(targetPath),
                { recursive: true }
            );
            await fs.promises.copyFile(sourcePath, targetPath);
        }

        const metadata = {
            id: commitId,
            message,
            author: {
                name: author.name,
                email: author.email
            },
            timestamp,
            parent: parents[0],
            parents,
            merge: true,
            files: []
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
        parents: metadata.parents || (metadata.parent ? [metadata.parent] : []),
        merge: metadata.merge || false,
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
                parent: metadata.parent,
                parents: metadata.parents || (metadata.parent ? [metadata.parent] : []),
                merge: metadata.merge || false
            });
        }

        index += 1;
        const allParents = metadata.parents && metadata.parents.length > 0
            ? metadata.parents
            : (metadata.parent ? [metadata.parent] : []);
        current = allParents[0] || null;
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

    const branchExists = async () => {
        try {
            const stat = await fs.promises.stat(refPath);

            /*
             * A directory at the ref path means an existing branch is a
             * prefix of the requested name, e.g. "feature/x" exists and
             * "feature" is requested, or the reverse.
             */
            return { exists: true, isDirectory: stat.isDirectory() };
        } catch {
            return { exists: false, isDirectory: false };
        }
    };

    const ancestorIsBranch = async () => {
        const parts = branchName.split("/");

        for (let i = 1; i < parts.length; i += 1) {
            const ancestorPath = getBranchRefPath(
                vcRoot,
                parts.slice(0, i).join("/")
            );

            try {
                const stat = await fs.promises.stat(ancestorPath);

                if (stat.isFile()) {
                    return true;
                }
            } catch {
                /* prefix does not exist yet */
            }
        }

        return false;
    };

    const conflictError = (message) => {
        const error = new Error(message);
        error.code = "BRANCH_EXISTS";
        return error;
    };

    const existing = await branchExists();

    if (existing.exists) {
        throw existing.isDirectory
            ? conflictError(
                `Branch "${branchName}" conflicts with an existing branch`
            )
            : conflictError(`Branch "${branchName}" already exists`);
    }

    if (await ancestorIsBranch()) {
        throw conflictError(
            `Branch "${branchName}" conflicts with an existing branch`
        );
    }

    const headCommitId = await getHeadCommitId(vcRoot);

    if (!headCommitId) {
        const error = new Error(
            "Cannot create a branch before the first commit"
        );
        error.code = "NO_HEAD_COMMIT";
        throw error;
    }

    try {
        await fs.promises.mkdir(path.dirname(refPath), { recursive: true });
        await fs.promises.writeFile(refPath, headCommitId);
    } catch {
        throw conflictError(
            `Branch "${branchName}" conflicts with an existing branch`
        );
    }

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

    const target = targetCommitId
        ? await getSnapshot(vcRoot, targetCommitId)
        : null;
    const targetSnapshotRoot = target ? target.root : null;
    const targetFiles = target ? target.files : [];
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

const MAX_LINE_DIFF_CELLS = 40000;
const MAX_DIFF_FILE_LINES = 2000;

const getBranchCommitId = async (repoRoot, branchName) => {
    if (!isValidBranchName(branchName)) {
        const error = new Error("Invalid branch name");
        error.code = "INVALID_BRANCH_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const refPath = getBranchRefPath(vcRoot, branchName);

    let raw;

    try {
        raw = await fs.promises.readFile(refPath, "utf-8");
    } catch (error) {
        if (error.code === "ENOENT") {
            const missing = new Error(
                `Branch "${branchName}" does not exist`
            );
            missing.code = "BRANCH_NOT_FOUND";
            throw missing;
        }

        throw error;
    }

    return raw.trim() || null;
};

const MAX_TAG_WALK = 5000;

const getTagRefPath = (vcRoot, tagName) =>
    path.join(vcRoot, "refs", "tags", tagName);

const getTagCommitId = async (repoRoot, tagName) => {
    if (!isValidTagName(tagName)) {
        const error = new Error("Invalid tag name");
        error.code = "INVALID_TAG_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const refPath = getTagRefPath(vcRoot, tagName);

    let raw;

    try {
        raw = await fs.promises.readFile(refPath, "utf-8");
    } catch (error) {
        if (error.code === "ENOENT") {
            const missing = new Error(`Tag "${tagName}" does not exist`);
            missing.code = "TAG_NOT_FOUND";
            throw missing;
        }

        throw error;
    }

    return raw.trim() || null;
};

const listTagRefs = async (repoRoot) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const tagsDir = path.join(vcRoot, "refs", "tags");
    const names = (await readRefNames(tagsDir)).sort();
    const tags = [];

    for (const name of names) {
        let commitId = null;

        try {
            commitId = (
                await fs.promises.readFile(
                    path.join(tagsDir, name),
                    "utf-8"
                )
            ).trim() || null;
        } catch {
            commitId = null;
        }

        tags.push({ name, commitId });
    }

    return tags;
};

const createTagRef = async (repoRoot, tagName, commitId) => {
    if (!isValidTagName(tagName)) {
        const error = new Error("Invalid tag name");
        error.code = "INVALID_TAG_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const refPath = getTagRefPath(vcRoot, tagName);

    try {
        await fs.promises.writeFile(refPath, commitId, { flag: "wx" });
    } catch (error) {
        if (error.code === "EEXIST") {
            const existing = new Error(`Tag "${tagName}" already exists`);
            existing.code = "TAG_EXISTS";
            throw existing;
        }

        throw error;
    }
};

const deleteTagRef = async (repoRoot, tagName) => {
    if (!isValidTagName(tagName)) {
        const error = new Error("Invalid tag name");
        error.code = "INVALID_TAG_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const refPath = getTagRefPath(vcRoot, tagName);

    try {
        await fs.promises.unlink(refPath);
    } catch (error) {
        if (error.code === "ENOENT") {
            const missing = new Error(`Tag "${tagName}" does not exist`);
            missing.code = "TAG_NOT_FOUND";
            throw missing;
        }

        throw error;
    }
};

const isAncestorCommit = async (vcRoot, ancestorId, commitId) => {
    if (!ancestorId || !commitId) {
        return false;
    }

    const queue = [commitId];
    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === ancestorId) {
            return true;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        const metadata = await readMeta(vcRoot, current);

        if (!metadata) {
            continue;
        }

        const allParents = metadata.parents && metadata.parents.length > 0
            ? metadata.parents
            : (metadata.parent ? [metadata.parent] : []);

        for (const p of allParents) {
            if (!visited.has(p)) {
                queue.push(p);
            }
        }
    }

    return false;
};

const getMergeBase = async (vcRoot, aCommitId, bCommitId) => {
    if (!aCommitId || !bCommitId) {
        return null;
    }

    const getParents = async (commitId) => {
        const metadata = await readMeta(vcRoot, commitId);

        if (!metadata) {
            return [];
        }

        if (metadata.parents && metadata.parents.length > 0) {
            return metadata.parents;
        }

        return metadata.parent ? [metadata.parent] : [];
    };

    const aAncestors = new Set();
    const aQueue = [aCommitId];

    while (aQueue.length > 0) {
        const current = aQueue.shift();

        if (aAncestors.has(current)) {
            continue;
        }

        aAncestors.add(current);

        const parents = await getParents(current);

        for (const p of parents) {
            if (!aAncestors.has(p)) {
                aQueue.push(p);
            }
        }
    }

    const bQueue = [bCommitId];
    const bVisited = new Set();

    while (bQueue.length > 0) {
        const current = bQueue.shift();

        if (bVisited.has(current)) {
            continue;
        }

        if (aAncestors.has(current)) {
            return current;
        }

        bVisited.add(current);

        const parents = await getParents(current);

        for (const p of parents) {
            if (!bVisited.has(p)) {
                bQueue.push(p);
            }
        }
    }

    return null;
};

const getCommitsBetween = async (
    repoRoot,
    baseCommitId,
    headCommitId
) => {
    if (!headCommitId) {
        return [];
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const commits = [];
    const visited = new Set();
    const queue = [headCommitId];

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === baseCommitId) {
            continue;
        }

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);

        const metadata = await readMeta(vcRoot, current);

        if (!metadata) {
            continue;
        }

        commits.push({
            id: metadata.id || current,
            message: metadata.message,
            author: metadata.author,
            timestamp: metadata.timestamp,
            parent: metadata.parent,
            parents: metadata.parents || (metadata.parent ? [metadata.parent] : [])
        });

        const allParents = metadata.parents && metadata.parents.length > 0
            ? metadata.parents
            : (metadata.parent ? [metadata.parent] : []);

        for (const p of allParents) {
            if (!visited.has(p) && p !== baseCommitId) {
                queue.push(p);
            }
        }
    }

    return commits;
};

/* find the nearest ancestor of fromCommitId (walking parent chain) that is
   referenced by one of taggedCommitIds, or null. Bounded to MAX_TAG_WALK
   steps so a pathological chain cannot stall the request. */
const findPreviousTaggedCommit = async (
    repoRoot,
    fromCommitId,
    taggedCommitIds
) => {
    if (!fromCommitId) {
        return null;
    }

    const tagged = new Set(taggedCommitIds || []);
    const vcRoot = await ensureVersionControl(repoRoot);
    const visited = new Set();
    const queue = [fromCommitId];
    let steps = 0;

    while (queue.length > 0 && steps < MAX_TAG_WALK) {
        const current = queue.shift();

        if (visited.has(current)) {
            continue;
        }

        visited.add(current);
        steps += 1;

        if (tagged.has(current)) {
            return current;
        }

        const metadata = await readMeta(vcRoot, current);

        if (!metadata) {
            continue;
        }

        const allParents = metadata.parents && metadata.parents.length > 0
            ? metadata.parents
            : (metadata.parent ? [metadata.parent] : []);

        for (const p of allParents) {
            if (!visited.has(p)) {
                queue.push(p);
            }
        }
    }

    return null;
};

const toLines = (content) => {
    const lines = content.split("\n");

    if (
        lines.length > 0 &&
        lines[lines.length - 1] === ""
    ) {
        lines.pop();
    }

    return lines;
};

const isBinaryContent = (content) => content.includes("\0");

const computeLineOperations = (oldLines, newLines) => {
    const n = oldLines.length;
    const m = newLines.length;
    const tooLarge =
        n * m > MAX_LINE_DIFF_CELLS ||
        n > MAX_DIFF_FILE_LINES ||
        m > MAX_DIFF_FILE_LINES;

    if (tooLarge) {
        let prefix = 0;

        while (
            prefix < n &&
            prefix < m &&
            oldLines[prefix] === newLines[prefix]
        ) {
            prefix += 1;
        }

        let suffix = 0;

        while (
            suffix < n - prefix &&
            suffix < m - prefix &&
            oldLines[n - 1 - suffix] === newLines[m - 1 - suffix]
        ) {
            suffix += 1;
        }

        const operations = [];
        let i = prefix;
        let j = prefix;
        let oldLine = prefix + 1;
        let newLine = prefix + 1;

        for (; i < n - suffix; i += 1) {
            operations.push({
                type: "del",
                text: oldLines[i],
                oldLine,
                newLine
            });
            oldLine += 1;
        }

        for (; j < m - suffix; j += 1) {
            operations.push({
                type: "add",
                text: newLines[j],
                oldLine,
                newLine
            });
            newLine += 1;
        }

        return { operations, approximate: true };
    }

    const dp = Array.from(
        { length: n + 1 },
        () => new Array(m + 1).fill(0)
    );

    for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
            dp[i][j] =
                oldLines[i] === newLines[j]
                    ? dp[i + 1][j + 1] + 1
                    : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const operations = [];
    let i = 0;
    let j = 0;
    let oldLine = 1;
    let newLine = 1;

    while (i < n && j < m) {
        if (oldLines[i] === newLines[j]) {
            operations.push({
                type: "context",
                text: oldLines[i],
                oldLine,
                newLine
            });
            i += 1;
            j += 1;
            oldLine += 1;
            newLine += 1;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            operations.push({
                type: "del",
                text: oldLines[i],
                oldLine,
                newLine
            });
            i += 1;
            oldLine += 1;
        } else {
            operations.push({
                type: "add",
                text: newLines[j],
                oldLine,
                newLine
            });
            j += 1;
            newLine += 1;
        }
    }

    while (i < n) {
        operations.push({
            type: "del",
            text: oldLines[i],
            oldLine,
            newLine
        });
        i += 1;
        oldLine += 1;
    }

    while (j < m) {
        operations.push({
            type: "add",
            text: newLines[j],
            oldLine,
            newLine
        });
        j += 1;
        newLine += 1;
    }

    return { operations, approximate: false };
};

const buildDiffHunks = (operations, context = 3) => {
    const hunks = [];
    let index = 0;

    while (index < operations.length) {
        while (
            index < operations.length &&
            operations[index].type === "context"
        ) {
            index += 1;
        }

        if (index >= operations.length) {
            break;
        }

        let end = index;
        let contextTail = 0;

        while (end < operations.length) {
            if (operations[end].type === "context") {
                contextTail += 1;

                if (contextTail > context * 2) {
                    break;
                }
            } else {
                contextTail = 0;
            }

            end += 1;
        }

        let hunkOperations = operations.slice(index, end);
        let trailing = 0;

        for (
            let k = hunkOperations.length - 1;
            k >= 0;
            k -= 1
        ) {
            if (hunkOperations[k].type === "context") {
                trailing += 1;
            } else {
                break;
            }
        }

        if (trailing > context) {
            hunkOperations = hunkOperations.slice(
                0,
                hunkOperations.length - (trailing - context)
            );
        }

        const hasDeletion = hunkOperations.some(
            (operation) => operation.type === "del"
        );
        const oldStart = hasDeletion
            ? hunkOperations[0].oldLine
            : Math.max(0, hunkOperations[0].oldLine - 1);
        const newStart = hunkOperations[0].newLine;
        const oldLines = hunkOperations.filter(
            (operation) => operation.type !== "add"
        ).length;
        const newLines = hunkOperations.filter(
            (operation) => operation.type !== "del"
        ).length;

        hunks.push({
            oldStart,
            oldLines,
            newStart,
            newLines,
            lines: hunkOperations.map((operation) => ({
                type: operation.type,
                text: operation.text
            }))
        });

        index = end;
    }

    return hunks;
};

const buildFullHunk = (lines, type) => ({
    oldStart: type === "add" ? 0 : 1,
    oldLines: type === "add" ? 0 : lines.length,
    newStart: 1,
    newLines: type === "del" ? 0 : lines.length,
    lines: lines.map((text) => ({ type, text }))
});

const getCommitDiff = async (
    repoRoot,
    baseCommitId,
    headCommitId
) => {
    const vcRoot = await ensureVersionControl(repoRoot);

    const [baseSnapshot, headSnapshot] = await Promise.all([
        baseCommitId
            ? getSnapshot(vcRoot, baseCommitId)
            : null,
        headCommitId
            ? getSnapshot(vcRoot, headCommitId)
            : null
    ]);

    const baseFiles = baseSnapshot ? baseSnapshot.files : [];
    const headFiles = headSnapshot ? headSnapshot.files : [];
    const baseSet = new Set(baseFiles);
    const headSet = new Set(headFiles);

    const readLinesFrom = async (snapshot, file) => {
        const content = await fs.promises.readFile(
            path.join(snapshot.root, file),
            "utf-8"
        );
        return content;
    };

    const diffFiles = [];
    let addedFiles = 0;
    let modifiedFiles = 0;
    let deletedFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const file of headFiles) {
        if (baseSet.has(file)) {
            continue;
        }

        let lines = [];

        if (headSnapshot) {
            const content = await readLinesFrom(
                headSnapshot,
                file
            );

            if (isBinaryContent(content)) {
                diffFiles.push({
                    path: file,
                    status: "A",
                    additions: null,
                    deletions: null,
                    binary: true,
                    hunks: []
                });
                addedFiles += 1;
                continue;
            }

            lines = toLines(content);
        }

        diffFiles.push({
            path: file,
            status: "A",
            additions: lines.length,
            deletions: 0,
            binary: false,
            hunks: lines.length > 0
                ? [buildFullHunk(lines, "add")]
                : []
        });
        addedFiles += 1;
        totalAdditions += lines.length;
    }

    for (const file of baseFiles) {
        if (headSet.has(file)) {
            continue;
        }

        let lines = [];

        if (baseSnapshot) {
            const content = await readLinesFrom(
                baseSnapshot,
                file
            );

            if (isBinaryContent(content)) {
                diffFiles.push({
                    path: file,
                    status: "D",
                    additions: null,
                    deletions: null,
                    binary: true,
                    hunks: []
                });
                deletedFiles += 1;
                continue;
            }

            lines = toLines(content);
        }

        diffFiles.push({
            path: file,
            status: "D",
            additions: 0,
            deletions: lines.length,
            binary: false,
            hunks: lines.length > 0
                ? [buildFullHunk(lines, "del")]
                : []
        });
        deletedFiles += 1;
        totalDeletions += lines.length;
    }

    for (const file of headFiles) {
        if (!baseSet.has(file)) {
            continue;
        }

        const [baseContent, headContent] = await Promise.all([
            readLinesFrom(baseSnapshot, file),
            readLinesFrom(headSnapshot, file)
        ]);

        if (baseContent === headContent) {
            continue;
        }

        if (
            isBinaryContent(baseContent) ||
            isBinaryContent(headContent)
        ) {
            diffFiles.push({
                path: file,
                status: "M",
                additions: null,
                deletions: null,
                binary: true,
                hunks: []
            });
            modifiedFiles += 1;
            continue;
        }

        const baseLines = toLines(baseContent);
        const headLines = toLines(headContent);
        const { operations, approximate } =
            computeLineOperations(baseLines, headLines);
        const hunks = buildDiffHunks(operations);
        const additions = operations.filter(
            (operation) => operation.type === "add"
        ).length;
        const deletions = operations.filter(
            (operation) => operation.type === "del"
        ).length;

        diffFiles.push({
            path: file,
            status: "M",
            additions,
            deletions,
            binary: false,
            approximate,
            hunks
        });
        modifiedFiles += 1;
        totalAdditions += additions;
        totalDeletions += deletions;
    }

    diffFiles.sort((a, b) => a.path.localeCompare(b.path));

    return {
        baseCommitId,
        headCommitId,
        files: diffFiles,
        stats: {
            added: addedFiles,
            modified: modifiedFiles,
            deleted: deletedFiles,
            additions: totalAdditions,
            deletions: totalDeletions
        }
    };
};

const applySnapshotToWorkingTree = async (
    repoRoot,
    vcRoot,
    commitId
) => {
    const target = commitId
        ? await getSnapshot(vcRoot, commitId)
        : null;
    const targetSnapshotRoot = target ? target.root : null;
    const targetFiles = target ? target.files : [];
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
            const targetPath = path.join(repoRoot, file);

            await fs.promises.mkdir(
                path.dirname(targetPath),
                { recursive: true }
            );
            await fs.promises.copyFile(source, targetPath);
        }
    }
};

const fastForwardMerge = async (
    repoRoot,
    sourceBranch,
    targetBranch
) => {
    if (!isValidBranchName(sourceBranch)) {
        const error = new Error("Invalid source branch name");
        error.code = "INVALID_BRANCH_NAME";
        throw error;
    }

    if (!isValidBranchName(targetBranch)) {
        const error = new Error("Invalid target branch name");
        error.code = "INVALID_BRANCH_NAME";
        throw error;
    }

    if (sourceBranch === targetBranch) {
        const error = new Error(
            "Source and target branches must be different"
        );
        error.code = "SAME_BRANCH";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);

    const readBranchCommit = async (branch) => {
        const refPath = getBranchRefPath(vcRoot, branch);

        try {
            const raw = await fs.promises.readFile(
                refPath,
                "utf-8"
            );
            return raw.trim() || null;
        } catch (error) {
            if (error.code === "ENOENT") {
                const missing = new Error(
                    `Branch "${branch}" does not exist`
                );
                missing.code = "BRANCH_NOT_FOUND";
                throw missing;
            }

            throw error;
        }
    };

    const sourceCommitId = await readBranchCommit(sourceBranch);
    const targetCommitId = await readBranchCommit(targetBranch);

    if (!sourceCommitId) {
        const error = new Error(
            `Branch "${sourceBranch}" has no commits`
        );
        error.code = "BRANCH_HAS_NO_COMMITS";
        throw error;
    }

    if (!targetCommitId) {
        const error = new Error(
            `Branch "${targetBranch}" has no commits`
        );
        error.code = "BRANCH_HAS_NO_COMMITS";
        throw error;
    }

    if (
        await isAncestorCommit(
            vcRoot,
            sourceCommitId,
            targetCommitId
        )
    ) {
        return {
            merged: false,
            reason: "ALREADY_UP_TO_DATE",
            sourceBranch,
            targetBranch,
            sourceCommitId,
            targetCommitId
        };
    }

    const baseCommitId = await getMergeBase(
        vcRoot,
        sourceCommitId,
        targetCommitId
    );

    if (baseCommitId !== targetCommitId) {
        const error = new Error(
            `Branches "${sourceBranch}" and "${targetBranch}" have diverged; a fast-forward merge is not possible`
        );
        error.code = "DIVERGED";
        throw error;
    }

    const currentBranch = await getCurrentBranch(vcRoot);
    const updateWorkingTree = currentBranch === targetBranch;

    if (updateWorkingTree) {
        const changes = await getWorkingTreeChanges(repoRoot);

        if (changes.length > 0) {
            const error = new Error(
                "Cannot merge into a checked-out branch with uncommitted changes"
            );
            error.code = "DIRTY_TREE";
            throw error;
        }
    }

    await fs.promises.writeFile(
        getBranchRefPath(vcRoot, targetBranch),
        sourceCommitId
    );

    if (updateWorkingTree) {
        await applySnapshotToWorkingTree(
            repoRoot,
            vcRoot,
            sourceCommitId
        );
    }

    return {
        merged: true,
        fastForward: true,
        sourceBranch,
        targetBranch,
        sourceCommitId,
        targetCommitId: sourceCommitId,
        previousTargetCommitId: targetCommitId,
        baseCommitId,
        workingTreeUpdated: updateWorkingTree
    };
};

const restoreBranchRef = async (
    repoRoot,
    branchName,
    expectedCommitId,
    commitId
) => {
    if (!isValidBranchName(branchName)) {
        const error = new Error("Invalid branch name");
        error.code = "INVALID_BRANCH_NAME";
        throw error;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const refPath = getBranchRefPath(vcRoot, branchName);

    let current = null;

    try {
        current = (
            await fs.promises.readFile(refPath, "utf-8")
        ).trim();
    } catch {
        return false;
    }

    if (current !== expectedCommitId) {
        return false;
    }

    await fs.promises.writeFile(refPath, commitId);

    const currentBranch = await getCurrentBranch(vcRoot);

    if (currentBranch === branchName) {
        await applySnapshotToWorkingTree(
            repoRoot,
            vcRoot,
            commitId
        );
    }

    return true;
};

const getTreeAtSnapshot = async (vcRoot, commitId, dirPath) => {
    const snapshot = await getSnapshot(vcRoot, commitId);
    const prefix = dirPath ? dirPath + "/" : "";
    const entries = [];

    const seenDirs = new Set();

    for (const filePath of snapshot.files) {
        if (!filePath.startsWith(prefix)) {
            continue;
        }

        const relative = filePath.slice(prefix.length);

        if (relative === "" || relative.includes("/")) {
            const topLevel = relative.split("/")[0];

            if (!seenDirs.has(topLevel)) {
                seenDirs.add(topLevel);
                entries.push({
                    name: topLevel,
                    type: "folder",
                    path: prefix + topLevel
                });
            }

            continue;
        }

        const fullPath = path.join(snapshot.root, filePath);
        let size = 0;

        try {
            const stat = await fs.promises.stat(fullPath);
            size = stat.size;
        } catch {
            /* file missing from snapshot */
        }

        entries.push({
            name: relative,
            type: "file",
            path: filePath,
            size
        });
    }

    entries.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === "folder" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    return entries;
};

const getFileAtSnapshot = async (vcRoot, commitId, filePath) => {
    const snapshot = await getSnapshot(vcRoot, commitId);
    const fullPath = path.join(snapshot.root, filePath);

    let stat;

    try {
        stat = await fs.promises.stat(fullPath);
    } catch {
        return null;
    }

    if (stat.isDirectory()) {
        return { type: "directory" };
    }

    if (stat.size > MAX_FILE_SIZE) {
        return {
            type: "file",
            size: stat.size,
            tooLarge: true
        };
    }

    const content = await fs.promises.readFile(fullPath, "utf8");

    if (content.includes("\0")) {
        return {
            type: "file",
            size: stat.size,
            binary: true
        };
    }

    return {
        type: "file",
        content,
        size: stat.size,
        hash: crypto.createHash("sha1").update(content).digest("hex")
    };
};

const getRawFileAtSnapshot = async (vcRoot, commitId, filePath) => {
    const snapshot = await getSnapshot(vcRoot, commitId);
    const fullPath = path.join(snapshot.root, filePath);

    let stat;

    try {
        stat = await fs.promises.stat(fullPath);
    } catch {
        return null;
    }

    if (stat.isDirectory()) {
        return null;
    }

    const buffer = await fs.promises.readFile(fullPath);

    return {
        buffer,
        size: stat.size,
        name: path.basename(filePath)
    };
};

const getFileHistoryForPath = async (
    repoRoot,
    filePath,
    { limit = DEFAULT_HISTORY_LIMIT } = {}
) => {
    const vcRoot = await ensureVersionControl(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);

    if (!headCommitId) {
        return [];
    }

    const commits = [];
    let current = headCommitId;

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

        const files = metadata.files || [];
        const touched = files.some(
            (f) => f.path === filePath || f.status === "D" && f.path === filePath
        );

        if (touched) {
            commits.push({
                id: metadata.id || current,
                message: metadata.message,
                author: metadata.author,
                timestamp: metadata.timestamp,
                files: files.filter(
                    (f) => f.path === filePath
                )
            });
        }

        const allParents = metadata.parents && metadata.parents.length > 0
            ? metadata.parents
            : (metadata.parent ? [metadata.parent] : []);
        current = allParents[0] || null;
    }

    return commits;
};

export {
    MAX_COMMIT_MESSAGE_LENGTH,
    DEFAULT_HISTORY_LIMIT,
    MAX_HISTORY_LIMIT,
    isValidCommitId,
    isValidBranchName,
    isValidTagName,
    ensureVersionControl,
    getCurrentBranch,
    getHeadCommitId,
    getWorkingTreeChanges,
    createCommit,
    createMergeCommit,
    getCommit,
    isAncestorCommit,
    getCommitHistory,
    listBranches,
    createBranch,
    checkoutBranch,
    getBranchCommitId,
    getTagCommitId,
    listTagRefs,
    createTagRef,
    deleteTagRef,
    findPreviousTaggedCommit,
    getCommitsBetween,
    getCommitDiff,
    getMergeBase,
    fastForwardMerge,
    restoreBranchRef,
    getTreeAtSnapshot,
    getSnapshot,
    getFileAtSnapshot,
    getRawFileAtSnapshot,
    getFileHistoryForPath
};
