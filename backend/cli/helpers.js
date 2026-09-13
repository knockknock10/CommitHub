import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

import {
    ensureVersionControl,
    getCurrentBranch,
    getHeadCommitId,
    getSnapshot
} from "../utils/repoVersion.js";

const EXCLUDED_TOP_LEVEL = new Set([
    ".CommitHub",
    ".git",
    "node_modules",
    ".env"
]);

const VCS_DIR = ".CommitHub";

const sanitizeRelativePath = (root, relative) => {
    const trimmed = relative.trim();

    if (trimmed === "") {
        return null;
    }

    if (
        trimmed.startsWith("/") ||
        trimmed.startsWith("\\") ||
        /^[a-zA-Z]:/.test(trimmed)
    ) {
        return null;
    }

    if (trimmed.split(/[\\/]+/).includes("..")) {
        return null;
    }

    const resolved = path.join(root, ...trimmed.split(/[\\/]+/));
    const relative2 = path.relative(root, resolved);

    if (
        relative2 === ".." ||
        relative2.startsWith(".." + path.sep) ||
        path.isAbsolute(relative2)
    ) {
        return null;
    }

    return resolved;
};

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

const hashContent = (content) =>
    crypto.createHash("sha1").update(content).digest("hex");

const hashFile = async (filePath) => {
    const content = await fs.promises.readFile(filePath);
    return hashContent(content);
};

const globToRegExp = (pattern) => {
    const escaped = pattern
        .split("/")
        .map((segment) =>
            segment
                .split("*")
                .map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&"))
                .join("[^/]*")
        )
        .join("/");

    return new RegExp(`^(?:${escaped})(?:/.*)?$`);
};

const parseIgnoreRules = (content) => {
    const rules = [];

    for (const rawLine of content.split("\n")) {
        let line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        let negate = false;

        if (line.startsWith("!") && line.length > 1) {
            negate = true;
            line = line.slice(1).trim();
        }

        line = line.replace(/\/+$/, "");

        if (!line) {
            continue;
        }

        let anchored = false;

        if (line.startsWith("/")) {
            anchored = true;
            line = line.slice(1);
        } else if (line.includes("/")) {
            anchored = true;
        }

        if (!line) {
            continue;
        }

        rules.push({ pattern: line, negate, anchored });
    }

    return rules;
};

const isIgnoredPath = (relPath, rules) => {
    if (rules.length === 0) {
        return false;
    }

    const parts = relPath.split("/");
    let ignored = false;

    for (const rule of rules) {
        const regex = globToRegExp(rule.pattern);
        let matched = regex.test(relPath);

        if (!rule.anchored) {
            for (let i = 0; i < parts.length && !matched; i += 1) {
                if (regex.test(parts.slice(i).join("/"))) {
                    matched = true;
                }
            }
        }

        if (matched) {
            ignored = !rule.negate;
        }
    }

    return ignored;
};

const loadIgnoreRules = async (repoRoot) => {
    const rules = [];

    for (const name of [".chignore", ".gitignore"]) {
        const ignorePath = path.join(repoRoot, name);
        let content;

        try {
            content = await fs.promises.readFile(ignorePath, "utf-8");
        } catch {
            continue;
        }

        rules.push(...parseIgnoreRules(content));
    }

    return rules;
};

const walkRepoFiles = async (repoRoot, opts = {}) => {
    const ignoreWorktree = opts.ignoreWorktree || false;
    const ignoreRules = opts.ignoreRules || await loadIgnoreRules(repoRoot);

    const results = [];

    let entries;

    try {
        entries = await fs.promises.readdir(
            repoRoot,
            { withFileTypes: true }
        );
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (EXCLUDED_TOP_LEVEL.has(entry.name)) {
            continue;
        }

        if (ignoreWorktree && entry.name === VCS_DIR) {
            continue;
        }

        const relative = entry.name;
        const fullPath = path.join(repoRoot, entry.name);

        if (entry.isDirectory()) {
            results.push(
                ...await collectFiles(fullPath, relative, [])
            );
        } else if (entry.isFile()) {
            results.push(relative);
        }
    }

    const filtered = results.filter(
        (file) => !isIgnoredPath(file, ignoreRules)
    );

    filtered.sort((a, b) => a.localeCompare(b));

    return filtered;
};

const findRepoRoot = async (startDir) => {
    let current = path.resolve(startDir);

    while (true) {
        try {
            await fs.promises.access(path.join(current, VCS_DIR));
            return current;
        } catch {
            /* not a repository at this level */
        }

        const parent = path.dirname(current);

        if (parent === current) {
            return null;
        }

        current = parent;
    }
};

const vcRootFor = (repoRoot) => path.join(repoRoot, VCS_DIR);

const readRepoConfig = async (repoRoot) => {
    const configPath = path.join(vcRootFor(repoRoot), "config.json");
    let raw;

    try {
        raw = await fs.promises.readFile(configPath, "utf-8");
    } catch {
        return { author: null, currentBranch: "main", remotes: {} };
    }

    try {
        const config = JSON.parse(raw);

        if (!config || typeof config !== "object") {
            return { author: null, currentBranch: "main", remotes: {} };
        }

        return {
            author: config.author || null,
            currentBranch: config.currentBranch || "main",
            remotes: config.remotes || {}
        };
    } catch {
        return { author: null, currentBranch: "main", remotes: {} };
    }
};

const saveRepoConfig = async (
    repoRoot,
    { author, currentBranch, remotes }
) => {
    const config = {
        author: author || null,
        currentBranch: currentBranch || "main",
        remotes: remotes || {}
    };

    await fs.promises.writeFile(
        path.join(vcRootFor(repoRoot), "config.json"),
        JSON.stringify(config, null, 2)
    );
};

const osUsername = () => {
    try {
        return os.userInfo().username;
    } catch {
        return "user";
    }
};

const resolveAuthor = (repoRoot, config) => {
    const existing = config && config.author;

    if (existing && existing.name) {
        return {
            name: existing.name,
            email: existing.email || `${existing.name}@localhost`
        };
    }

    const username = process.env.COMMITHUB_USER_NAME || osUsername();

    return {
        name: username,
        email: process.env.COMMITHUB_USER_EMAIL
            || `${username}@localhost`
    };
};

const indexPath = (repoRoot) =>
    path.join(vcRootFor(repoRoot), "index.json");

const stagingRoot = (repoRoot) =>
    path.join(vcRootFor(repoRoot), "staging");

const readIndex = async (repoRoot) => {
    let raw;

    try {
        raw = await fs.promises.readFile(indexPath(repoRoot), "utf-8");
    } catch {
        return { entries: {} };
    }

    try {
        const index = JSON.parse(raw);

        if (!index || typeof index !== "object") {
            return { entries: {} };
        }

        return {
            entries: index.entries && typeof index.entries === "object"
                ? index.entries
                : {}
        };
    } catch {
        return { entries: {} };
    }
};

const saveIndex = async (repoRoot, entries) => {
    await fs.promises.writeFile(
        indexPath(repoRoot),
        JSON.stringify({ version: 1, entries }, null, 2)
    );
};

const clearIndex = async (repoRoot) => {
    await saveIndex(repoRoot, {});
    await fs.promises.rm(stagingRoot(repoRoot), {
        recursive: true,
        force: true
    });
};

const stageBlob = async (repoRoot, file) => {
    const source = path.join(repoRoot, file);
    const target = path.join(stagingRoot(repoRoot), file);

    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.copyFile(source, target);

    return hashFile(source);
};

const stageDeleted = async (repoRoot, file) => {
    await fs.promises.rm(
        path.join(stagingRoot(repoRoot), file),
        { force: true }
    );
};

const inHeadSnapshot = async (repoRoot, file) => {
    const vcRoot = vcRootFor(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);

    if (!headCommitId) {
        return false;
    }

    const snapshot = await getSnapshot(vcRoot, headCommitId);

    return snapshot.files.includes(file);
};

const stagePaths = async (repoRoot, paths) => {
    const index = await readIndex(repoRoot);
    const staged = paths.map((file) => {
        const sanitized = sanitizeRelativePath(repoRoot, file);

        if (!sanitized) {
            return { file, error: `invalid path: '${file}'` };
        }

        const relative = path.relative(repoRoot, sanitized).split(path.sep).join("/");

        if (EXCLUDED_TOP_LEVEL.has(relative.split("/")[0])) {
            return { file, error: `cannot stage '${relative}': reserved path` };
        }

        return { file, relative };
    });

    const stageResult = [];

    for (const entry of staged) {
        if (entry.error) {
            stageResult.push(entry);
            continue;
        }

        const { relative } = entry;
        const fullPath = path.join(repoRoot, relative);

        let stat;

        try {
            stat = await fs.promises.stat(fullPath);
        } catch {
            stat = null;
        }

        if (stat && stat.isFile()) {
            index.entries[relative] = {
                hash: await stageBlob(repoRoot, relative),
                deleted: false
            };
            stageResult.push({ file: relative, staged: true });
        } else if (await inHeadSnapshot(repoRoot, relative)) {
            index.entries[relative] = {
                hash: null,
                deleted: true
            };
            await stageDeleted(repoRoot, relative);
            stageResult.push({ file: relative, staged: true, deleted: true });
        } else {
            stageResult.push({
                file: relative,
                error: `'${entry.file}' did not match any files`
            });
        }
    }

    await saveIndex(repoRoot, index.entries);

    return stageResult;
};

const workingChanges = async (repoRoot) => {
    const vcRoot = vcRootFor(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);
    const ignoreRules = await loadIgnoreRules(repoRoot);
    const workingFiles = await walkRepoFiles(repoRoot, { ignoreRules });
    const workingSet = new Set(workingFiles);

    if (!headCommitId) {
        return workingFiles.map((file) => ({
            path: file,
            status: "A"
        }));
    }

    const snapshot = await getSnapshot(vcRoot, headCommitId);
    const snapshotSet = new Set(snapshot.files);
    const snapshotHashes = await fileHashes(snapshot.root, snapshot.files);
    const changes = [];

    for (const file of workingFiles) {
        if (!snapshotSet.has(file)) {
            changes.push({ path: file, status: "A" });
            continue;
        }

        const workingHash = await hashFile(path.join(repoRoot, file));

        if (workingHash !== snapshotHashes[file]) {
            changes.push({ path: file, status: "M" });
        }
    }

    for (const file of snapshot.files) {
        if (!workingSet.has(file)) {
            changes.push({ path: file, status: "D" });
        }
    }

    changes.sort((a, b) => a.path.localeCompare(b.path));

    return changes;
};

const stageAllChanges = async (repoRoot) => {
    const index = { entries: {} };
    const changes = await workingChanges(repoRoot);

    for (const change of changes) {
        if (change.status === "D") {
            index.entries[change.path] = {
                hash: null,
                deleted: true
            };
            await stageDeleted(repoRoot, change.path);
        } else {
            index.entries[change.path] = {
                hash: await stageBlob(repoRoot, change.path),
                deleted: false
            };
        }
    }

    await saveIndex(repoRoot, index.entries);
};

const fileHashes = async (root, files) => {
    const hashes = {};

    for (const file of files) {
        try {
            hashes[file] = await hashFile(path.join(root, file));
        } catch {
            hashes[file] = null;
        }
    }

    return hashes;
};

const computeStatus = async (repoRoot) => {
    const vcRoot = vcRootFor(repoRoot);
    const branch = await getCurrentBranch(vcRoot);
    const headCommitId = await getHeadCommitId(vcRoot);

    const index = await readIndex(repoRoot);
    const indexEntries = index.entries;
    const indexPaths = new Set(Object.keys(indexEntries));

    const worktreeFiles = await walkRepoFiles(repoRoot);
    const worktreeSet = new Set(worktreeFiles);
    const worktreeHashes = await fileHashes(repoRoot, worktreeFiles);
    const worktreeHashOf = (file) => worktreeHashes[file] || null;

    let headFiles = [];
    let headHashes = {};
    const headSet = new Set();

    if (headCommitId) {
        const snapshot = await getSnapshot(vcRoot, headCommitId);
        headFiles = snapshot.files;
        headHashes = await fileHashes(snapshot.root, headFiles);

        for (const file of headFiles) {
            headSet.add(file);
        }
    }

    const noCommits = !headCommitId;

    const stagedChanges = [];
    const unstagedChanges = [];

    const stagedStatusFor = (indexPath, entry) => {
        if (indexPath in headHashes) {
            return entry.deleted
                ? { path: indexPath, status: "D" }
                : { path: indexPath, status: "M" };
        }

        if (entry.deleted) {
            return null;
        }

        return { path: indexPath, status: "A" };
    };

    for (const [file, entry] of Object.entries(indexEntries)) {
        const staged = stagedStatusFor(file, entry);

        if (!staged) {
            continue;
        }

        if (entry.deleted) {
            stagedChanges.push(staged);
        } else if (headSet.has(file)) {
            if (entry.hash !== headHashes[file]) {
                stagedChanges.push(staged);
            }
        } else {
            stagedChanges.push(staged);
        }
    }

    const referencedFiles = new Set([
        ...headFiles,
        ...indexPaths,
        ...worktreeFiles
    ]);

    for (const file of referencedFiles) {
        const entry = indexEntries[file];
        const worktreePresent = worktreeSet.has(file);
        const worktreeHash = worktreePresent ? worktreeHashOf(file) : null;

        if (entry) {
            if (entry.deleted) {
                if (worktreePresent) {
                    unstagedChanges.push({ path: file, status: "A" });
                }
                continue;
            }

            if (!worktreePresent) {
                unstagedChanges.push({ path: file, status: "D" });
            } else if (worktreeHash !== entry.hash) {
                unstagedChanges.push({ path: file, status: "M" });
            }

            continue;
        }

        if (headSet.has(file)) {
            if (!worktreePresent) {
                unstagedChanges.push({ path: file, status: "D" });
            } else if (worktreeHash !== headHashes[file]) {
                unstagedChanges.push({ path: file, status: "M" });
            }
        }
    }

    unstagedChanges.sort((a, b) => a.path.localeCompare(b.path));
    stagedChanges.sort((a, b) => a.path.localeCompare(b.path));

    const untracked = worktreeFiles.filter(
        (file) => !headSet.has(file) && !indexPaths.has(file)
    );

    return {
        branch,
        currentBranch: branch,
        noCommits,
        staged: stagedChanges,
        unstaged: unstagedChanges,
        untracked
    };
};

const generateCommitId = (
    author,
    message,
    timestamp,
    parent,
    changes
) =>
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

const writeCommit = async (
    repoRoot,
    {
        message,
        author,
        tree,
        changes,
        parent,
        timestamp = Date.now()
    }
) => {
    const vcRoot = vcRootFor(repoRoot);
    const commitId = generateCommitId(
        author,
        message,
        timestamp,
        parent,
        changes
    );
    const commitDir = path.join(vcRoot, "commits", commitId);
    const snapshotDir = path.join(commitDir, "snapshot");

    await fs.promises.mkdir(snapshotDir, { recursive: true });

    try {
        for (const [file, content] of tree.entries()) {
            const targetPath = path.join(snapshotDir, file);

            await fs.promises.mkdir(
                path.dirname(targetPath),
                { recursive: true }
            );
            await fs.promises.writeFile(targetPath, content);
        }

        const metadata = {
            id: commitId,
            message,
            author: {
                name: author.name,
                email: author.email
            },
            timestamp,
            parent,
            parents: parent ? [parent] : [],
            merge: false,
            files: changes
        };

        await fs.promises.writeFile(
            path.join(commitDir, "meta.json"),
            JSON.stringify(metadata, null, 2)
        );

        const branch = await getCurrentBranch(vcRoot);

        await fs.promises.writeFile(
            path.join(vcRoot, "refs", "heads", `${branch}`),
            commitId
        );

        return metadata;
    } catch (error) {
        await fs.promises.rm(commitDir, { recursive: true, force: true });
        throw error;
    }
};

const applySnapshotToWorkingTree = async (repoRoot, commitId) => {
    const vcRoot = vcRootFor(repoRoot);
    const target = commitId
        ? await getSnapshot(vcRoot, commitId)
        : null;
    const targetRoot = target ? target.root : null;
    const targetFiles = target ? target.files : [];
    const targetSet = new Set(targetFiles);

    const workingFiles = await collectFiles(repoRoot, "", [VCS_DIR]);

    for (const file of workingFiles) {
        if (!targetSet.has(file)) {
            await fs.promises.rm(
                path.join(repoRoot, file),
                { force: true }
            );
        }
    }

    if (targetRoot) {
        for (const file of targetFiles) {
            const source = path.join(targetRoot, file);
            const targetPath = path.join(repoRoot, file);

            await fs.promises.mkdir(
                path.dirname(targetPath),
                { recursive: true }
            );
            await fs.promises.copyFile(source, targetPath);
        }
    }
};

const pathExists = async (filePath) => {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
};

export {
    VCS_DIR,
    EXCLUDED_TOP_LEVEL,
    sanitizeRelativePath,
    collectFiles,
    hashFile,
    loadIgnoreRules,
    isIgnoredPath,
    walkRepoFiles,
    findRepoRoot,
    vcRootFor,
    readRepoConfig,
    saveRepoConfig,
    resolveAuthor,
    readIndex,
    saveIndex,
    clearIndex,
    stagePaths,
    stageAllChanges,
    workingChanges,
    computeStatus,
    generateCommitId,
    writeCommit,
    applySnapshotToWorkingTree,
    pathExists,
    ensureVersionControl
};