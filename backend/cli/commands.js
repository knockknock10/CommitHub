import fs from "fs";
import path from "path";

import {
    MAX_COMMIT_MESSAGE_LENGTH,
    ensureVersionControl as ensureVc,
    getCurrentBranch,
    getHeadCommitId,
    getCommit,
    getCommitHistory,
    listBranches,
    createBranch,
    getBranchCommitId,
    getCommitDiff,
    getSnapshot,
    isValidCommitId,
    isValidBranchName,
    fastForwardMerge
} from "../utils/repoVersion.js";

import {
    VCS_DIR,
    findRepoRoot,
    vcRootFor,
    readRepoConfig,
    saveRepoConfig,
    resolveAuthor,
    readIndex,
    clearIndex,
    stagePaths,
    stageAllChanges,
    computeStatus,
    writeCommit,
    applySnapshotToWorkingTree,
    pathExists
} from "./helpers.js";

import {
    getRemoteTransport,
    pushRemoteFiles,
    pullRemoteFiles
} from "./transport.js";

const fatal = (message, code) => {
    const error = new Error(message);
    error.code = code;
    return error;
};

const requireRepo = async (cwd) => {
    const repoRoot = await findRepoRoot(cwd);

    if (!repoRoot) {
        throw fatal(
            "not a CommitHub repository (or any of the parent directories): .CommitHub"
        );
    }

    return repoRoot;
};

const requireCleanIndex = async (repoRoot) => {
    const index = await readIndex(repoRoot);

    if (Object.keys(index.entries).length > 0) {
        throw fatal("cannot proceed with staged changes; commit or clear the staging area first");
    }
};

const resolveRef = async (repoRoot, token) => {
    if (token === "HEAD" || token === "head") {
        return getHeadCommitId(vcRootFor(repoRoot));
    }

    if (isValidBranchName(token)) {
        try {
            const branchCommitId = await getBranchCommitId(repoRoot, token);

            if (branchCommitId) {
                return branchCommitId;
            }
        } catch {
            /* not a branch — fall through */
        }
    }

    if (isValidCommitId(token)) {
        if (await pathExists(path.join(vcRootFor(repoRoot), "commits", token))) {
            return token;
        }
    }

    let commitsDir;

    try {
        commitsDir = await fs.promises.readdir(
            path.join(vcRootFor(repoRoot), "commits")
        );
    } catch {
        commitsDir = [];
    }

    const matches = commitsDir.filter(
        (id) => id.startsWith(token) && /^[0-9a-f]+$/.test(id)
    );

    if (matches.length === 1) {
        return matches[0];
    }

    if (matches.length > 1) {
        throw fatal(`ambiguous argument '${token}': commit id prefix matches multiple commits`);
    }

    return null;
};

const formatDiff = (diff) => {
    const lines = [];
    const insertions = diff.stats.additions;
    const deletions = diff.stats.deletions;

    for (const file of diff.files) {
        lines.push(`diff --ch a/${file.path} b/${file.path}`);

        if (file.status === "A") {
            lines.push("new file mode 100644");
        } else if (file.status === "D") {
            lines.push("deleted file mode 100644");
        }

        lines.push(`--- a/${file.path}`);
        lines.push(`+++ b/${file.path}`);

        if (file.binary) {
            lines.push("Binary files differ");
            continue;
        }

        for (const hunk of file.hunks) {
            const oldCount = hunk.oldLines;
            const newCount = hunk.newLines;
            const oldHeader = `${hunk.oldStart}${oldCount === 1 ? "" : `,${oldCount}`}`;
            const newHeader = `${hunk.newStart}${newCount === 1 ? "" : `,${newCount}`}`;

            lines.push(`@@ -${oldHeader} +${newHeader} @@`);

            for (const line of hunk.lines) {
                const prefix = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
                lines.push(`${prefix}${line.text}`);
            }
        }

        lines.push("");
    }

    const sections = [
        `${diff.files.length} file${diff.files.length === 1 ? "" : "s"} changed`,
        `${insertions} insertion${insertions === 1 ? "" : "s"}(+)`,
        `${deletions} deletion${deletions === 1 ? "" : "s"}(-)`
    ];

    lines.push(sections.join(", "));

    return lines.join("\n");
};

const commandInit = async (args, cwd) => {
    const target = args.positional[0] || ".";
    const dir = path.resolve(cwd, target);

    const alreadyExists = await fs.promises.access(
        path.join(dir, VCS_DIR)
    ).then(() => true, () => false);

    await fs.promises.mkdir(dir, { recursive: true });
    await ensureVc(dir);

    return alreadyExists
        ? `Reinitialized existing CommitHub repository in ${dir}`
        : `Initialized empty CommitHub repository in ${dir}`;
};

const commandStatus = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const status = await computeStatus(repoRoot);
    const lines = [];

    lines.push(`On branch ${status.branch}`);
    lines.push("");

    if (status.noCommits) {
        lines.push("No commits yet");
        lines.push("");
    }

    const stageLabel = (change) =>
        change.status === "A"
            ? "new file"
            : change.status === "D"
                ? "deleted"
                : "modified";

    if (status.staged.length > 0) {
        lines.push("Changes to be committed:");
        lines.push("");

        for (const change of status.staged) {
            lines.push(`\t${stageLabel(change)}:   ${change.path}`);
        }

        lines.push("");
    }

    let hasChangeLines = status.staged.length > 0
        || status.unstaged.length > 0;

    if (status.unstaged.length > 0) {
        lines.push("Changes not staged for commit:");
        lines.push("");

        for (const change of status.unstaged) {
            lines.push(`\t${stageLabel(change)}:   ${change.path}`);
        }

        lines.push("");
    }

    if (status.untracked.length > 0) {
        lines.push("Untracked files:");
        lines.push("");

        for (const file of status.untracked) {
            lines.push(`\t${file}`);
        }

        lines.push("");
    }

    const clean = status.staged.length === 0
        && status.unstaged.length === 0
        && status.untracked.length === 0;

    if (status.noCommits) {
        lines.push(
            clean
                ? "nothing to commit"
                : "nothing added to commit but untracked files present (use \"ch add\" to track)"
        );
    } else if (clean) {
        lines.push("nothing to commit, working tree clean");
    } else {
        lines.push(
            "use \"ch add <file>...\" or \"ch add .\" to update what will be committed"
        );
    }

    return lines.join("\n");
};

const commandAdd = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);

    if (args.positional.length === 0) {
        throw fatal("nothing specified, nothing added");
    }

    const isAll = args.positional.some(
        (entry) => entry === "." || entry === "all"
    );

    const results = isAll
        ? await (async () => {
            await stageAllChanges(repoRoot);
            return [];
        })()
        : await stagePaths(repoRoot, args.positional);

    const lines = [];

    for (const result of results) {
        if (result.error) {
            lines.push(`fatal: ${result.error}`);
        } else if (result.deleted) {
            lines.push(`deleted:   ${result.file}`);
        } else {
            lines.push(`added:     ${result.file}`);
        }
    }

    return lines.join("\n");
};

const commandCommit = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const message = typeof args.message === "string"
        ? args.message.trim()
        : "";

    if (!message) {
        throw fatal("commit requires a message; use 'ch commit -m \"<message>\"'");
    }

    if (message.length > MAX_COMMIT_MESSAGE_LENGTH) {
        throw fatal(`commit message exceeds ${MAX_COMMIT_MESSAGE_LENGTH} characters`);
    }

    const vcRoot = vcRootFor(repoRoot);
    const index = await readIndex(repoRoot);

    if (Object.keys(index.entries).length === 0) {
        throw fatal("nothing to commit (no staged changes; use \"ch add\")");
    }

    const status = await computeStatus(repoRoot);

    if (status.staged.length === 0) {
        throw fatal("nothing to commit (staged files match the last commit)");
    }

    const config = await readRepoConfig(repoRoot);
    const author = resolveAuthor(repoRoot, config);

    if (!config.author) {
        await saveRepoConfig(repoRoot, {
            author,
            currentBranch: status.branch,
            remotes: config.remotes
        });
    }

    const headCommitId = await getHeadCommitId(vcRoot);
    const tree = new Map();

    if (headCommitId) {
        const snapshot = await getSnapshot(vcRoot, headCommitId);

        for (const file of snapshot.files) {
            tree.set(
                file,
                await fs.promises.readFile(path.join(snapshot.root, file))
            );
        }
    }

    for (const [file, entry] of Object.entries(index.entries)) {
        if (entry.deleted) {
            tree.delete(file);
            continue;
        }

        const stagedPath = path.join(vcRoot, "staging", file);

        if (!(await pathExists(stagedPath))) {
            throw fatal(`staged content for '${file}' is missing; re-run 'ch add'`);
        }

        tree.set(file, await fs.promises.readFile(stagedPath));
    }

    const metadata = await writeCommit(repoRoot, {
        message,
        author,
        tree,
        changes: status.staged,
        parent: headCommitId
    });

    await clearIndex(repoRoot);

    const branch = await getCurrentBranch(vcRoot);

    return `[${branch} ${metadata.id}] ${message.split("\n")[0]}`;
};

const commandLog = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const history = await getCommitHistory(repoRoot, { limit: 1000 });
    const lines = [];

    if (history.length === 0) {
        throw fatal("does not have any commits yet");
    }

    for (const commit of history) {
        const author = commit.author || {};
        const name = author.name || "unknown";
        const email = author.email || "";
        const rawTimestamp = Number(commit.timestamp);
        const date = Number.isFinite(rawTimestamp) && rawTimestamp > 0
            ? new Date(rawTimestamp).toISOString()
            : "unknown";
        const shortId = String(commit.id || "?").slice(0, 12);

        lines.push(`commit ${shortId}${commit.merge ? " (merge)" : ""}`);
        lines.push(`Author: ${name} <${email}>`);
        lines.push(`Date:   ${date}`);
        lines.push("");
        lines.push(`    ${commit.message}`);
        lines.push("");
    }

    return lines.join("\n").replace(/\n+$/, "");
};

const commandBranch = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const name = args.positional[0];

    if (!name) {
        const { currentBranch, branches } = await listBranches(repoRoot);
        const lines = branches.map((branch) =>
            `${branch.isCurrent ? "*" : " "} ${branch.name}`
        );

        if (lines.length === 0) {
            return `* ${currentBranch}`;
        }

        return lines.join("\n");
    }

    const created = await createBranch(repoRoot, name);

    return `Branch "${created.name}" created at ${created.commitId}`;
};

const commandCheckout = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const name = args.positional[0];

    if (!name) {
        throw fatal("checkout requires a branch name");
    }

    if (!isValidBranchName(name)) {
        throw fatal(`invalid branch name '${name}'`);
    }

    await requireCleanIndex(repoRoot);

    const vcRoot = vcRootFor(repoRoot);
    const current = await getCurrentBranch(vcRoot);

    if (name === current) {
        return `Already on branch "${name}"`;
    }

    const targetCommitId = await getBranchCommitId(repoRoot, name);
    const status = await computeStatus(repoRoot);

    if (status.unstaged.length > 0) {
        throw fatal("cannot switch branches with unstaged changes");
    }

    const headCommitId = await getHeadCommitId(vcRoot);
    const headSnapshot = headCommitId
        ? await getSnapshot(vcRoot, headCommitId)
        : null;
    const headTracked = headSnapshot ? headSnapshot.files : [];
    const headSet = new Set(headTracked);
    const targetSnapshot = targetCommitId
        ? await getSnapshot(vcRoot, targetCommitId)
        : null;
    const targetSet = new Set(targetSnapshot ? targetSnapshot.files : []);

    for (const file of headSet) {
        if (targetSet.has(file)) {
            continue;
        }

        await fs.promises.rm(path.join(repoRoot, file), { force: true });
    }

    if (targetSnapshot) {
        for (const file of targetSnapshot.files) {
            const source = path.join(targetSnapshot.root, file);
            const dest = path.join(repoRoot, file);

            await fs.promises.mkdir(path.dirname(dest), { recursive: true });
            await fs.promises.copyFile(source, dest);
        }
    }

    await fs.promises.writeFile(
        path.join(vcRoot, "HEAD"),
        `ref: refs/heads/${name}`
    );

    return `Switched to branch "${name}"`;
};

const commandDiff = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const [baseArg, headArg] = args.positional;

    if (!baseArg && !headArg) {
        const vcRoot = vcRootFor(repoRoot);
        const headCommitId = await getHeadCommitId(vcRoot);

        if (!headCommitId) {
            throw fatal("no commits yet; nothing to diff against");
        }

        if (Object.keys((await readIndex(repoRoot)).entries).length > 0) {
            throw fatal("diff against the working tree is not shown while staged changes exist; run 'ch commit' or 'ch reset' first");
        }

        const tempId = `_cli_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 8)}`;
        const tempDir = path.join(vcRoot, "commits", tempId);
        const snapshotDir = path.join(tempDir, "snapshot");

        await fs.promises.mkdir(snapshotDir, { recursive: true });

        const snapshotHead = await getSnapshot(vcRoot, headCommitId);
        const tracked = new Set(snapshotHead.files);
        const files = (await (
            await import("./helpers.js")
        ).collectFiles(repoRoot, "", [VCS_DIR])).filter(
            (file) => tracked.has(file)
        );

        try {
            for (const file of files) {
                const target = path.join(snapshotDir, file);

                await fs.promises.mkdir(
                    path.dirname(target),
                    { recursive: true }
                );
                await fs.promises.copyFile(
                    path.join(repoRoot, file),
                    target
                );
            }

            const diff = await getCommitDiff(repoRoot, headCommitId, tempId);

            return formatDiff(diff);
        } finally {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    }

    if (!headArg) {
        throw fatal("diff requires two commit references: 'ch diff <base> <head>'");
    }

    const baseId = await resolveRef(repoRoot, baseArg);

    if (!baseId) {
        throw fatal(`unknown commit '${baseArg}'`);
    }

    const headId = await resolveRef(repoRoot, headArg);

    if (!headId) {
        throw fatal(`unknown commit '${headArg}'`);
    }

    const diff = await getCommitDiff(repoRoot, baseId, headId);

    return formatDiff(diff);
};

const commandMerge = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const source = args.positional[0];

    if (!source) {
        throw fatal("merge requires a branch name");
    }

    if (!isValidBranchName(source)) {
        throw fatal(`invalid branch name '${source}'`);
    }

    const current = await getCurrentBranch(vcRootFor(repoRoot));

    if (source === current) {
        throw fatal(`cannot merge branch "${source}" into itself`);
    }

    await requireCleanIndex(repoRoot);

    const result = await fastForwardMerge(repoRoot, source, current);

    if (!result.merged) {
        return "Already up to date.";
    }

    const lines = ["Fast-forward"];

    if (result.workingTreeUpdated) {
        lines.push(`   ${current} -> ${source}`);
    } else {
        lines.push(`   refs merged ${current} -> ${source}`);
    }

    return lines.join("\n");
};

const commandRevert = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const reference = args.positional[0];

    if (!reference) {
        throw fatal("revert requires a commit id or reference");
    }

    await requireCleanIndex(repoRoot);

    const commitId = await resolveRef(repoRoot, reference);

    if (!commitId) {
        throw fatal(`commit '${reference}' not found`);
    }

    const meta = await getCommit(repoRoot, commitId);

    if (!meta) {
        throw fatal(`commit '${commitId}' not found`);
    }

    const vcRoot = vcRootFor(repoRoot);
    const headCommitId = await getHeadCommitId(vcRoot);

    if (!headCommitId) {
        throw fatal("cannot revert without a current commit");
    }

    const parentId = meta.parents
        ? (meta.parents.length > 0 ? meta.parents[0] : null)
        : meta.parent;
    const baseSnapshot = parentId
        ? await getSnapshot(vcRoot, parentId)
        : null;
    const targetSnapshot = await getSnapshot(vcRoot, commitId);
    const headSnapshot = await getSnapshot(vcRoot, headCommitId);

    const headMap = new Map();

    for (const file of headSnapshot.files) {
        headMap.set(
            file,
            await fs.promises.readFile(path.join(headSnapshot.root, file))
        );
    }

    const baseFiles = baseSnapshot ? baseSnapshot.files : [];
    const baseSet = new Set(baseFiles);
    const targetFiles = targetSnapshot.files;
    const targetSet = new Set(targetFiles);
    const frontFile = new Set([...headMap.keys()]);

    const revertMap = new Map();

    const baseContentOf = async (file) =>
        fs.promises.readFile(path.join(baseSnapshot.root, file));

    for (const file of baseFiles) {
        if (!targetSet.has(file)) {
            revertMap.set(file, { restore: await baseContentOf(file) });
        }
    }

    for (const file of targetFiles) {
        if (!baseSet.has(file)) {
            revertMap.set(file, { remove: true });
        } else {
            const baseContent = await baseContentOf(file);
            const targetContent = await fs.promises.readFile(
                path.join(targetSnapshot.root, file)
            );

            if (!baseContent.equals(targetContent)) {
                revertMap.set(file, { restore: baseContent });
            }
        }
    }

    const resultTree = new Map(headMap);

    for (const [file, action] of revertMap.entries()) {
        if (action.remove) {
            resultTree.delete(file);
            frontFile.delete(file);
        } else {
            resultTree.set(file, action.restore);
        }
    }

    const changes = [];

    for (const [file, content] of resultTree.entries()) {
        if (!headMap.has(file)) {
            changes.push({ path: file, status: "A" });
            continue;
        }

        if (!headMap.get(file).equals(content)) {
            changes.push({ path: file, status: "M" });
        }
    }

    for (const file of headSnapshot.files) {
        if (!resultTree.has(file)) {
            changes.push({ path: file, status: "D" });
        }
    }

    if (changes.length === 0) {
        throw fatal(`commit '${commitId}' has no changes to revert`);
    }

    const config = await readRepoConfig(repoRoot);
    const author = resolveAuthor(repoRoot, config);
    const branch = await getCurrentBranch(vcRoot);
    const message = `Revert "${meta.message}"`;

    const metadata = await writeCommit(repoRoot, {
        message,
        author,
        tree: resultTree,
        changes,
        parent: headCommitId
    });

    await applySnapshotToWorkingTree(repoRoot, metadata.id);

    return `[${branch} ${metadata.id}] ${message}`;
};

const commandRemote = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const config = await readRepoConfig(repoRoot);
    const subcommand = args.positional[0];
    const remotes = config.remotes || {};

    if (!subcommand) {
        const names = Object.keys(remotes);

        if (names.length === 0) {
            return "No remotes configured";
        }

        return names.map((name) => `${name}\t${remotes[name]}`).join("\n");
    }

    if (subcommand !== "add") {
        throw fatal(`unknown remote subcommand '${subcommand}'`);
    }

    const name = args.positional[1];
    const url = args.positional[2];

    if (!name || !url) {
        throw fatal("usage: ch remote add <name> <url>");
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,62}$/.test(name)) {
        throw fatal(`invalid remote name '${name}'`);
    }

    if (Object.prototype.hasOwnProperty.call(remotes, name)) {
        throw fatal(`remote '${name}' already exists`);
    }

    const normalized = url.trim();

    if (!/^s3:\/\//.test(normalized) && !normalized.startsWith("/") && !normalized.startsWith("./") && !normalized.startsWith("../")) {
        throw fatal(`invalid remote url '${normalized}'; use an s3:// url or a filesystem path`);
    }

    remotes[name] = normalized;

    await saveRepoConfig(repoRoot, {
        author: config.author,
        currentBranch: config.currentBranch,
        remotes
    });

    return `Adding remote '${name}' (${normalized})`;
};

const commandPush = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const config = await readRepoConfig(repoRoot);
    const remoteName = args.positional[0] || "origin";
    const branch = args.positional[1]
        || await getCurrentBranch(vcRootFor(repoRoot));
    const url = (config.remotes || {})[remoteName];

    if (!url) {
        throw fatal(`remote '${remoteName}' does not exist; use 'ch remote add ${remoteName} <url>'`);
    }

    const branchCommitId = await getBranchCommitId(repoRoot, branch);

    if (!branchCommitId) {
        throw fatal(`branch '${branch}' has no commits to push`);
    }

    const transport = await getRemoteTransport(url);
    const files = await pushRemoteFiles(repoRoot, transport);

    return `To ${transport.description}\n   ${branch} -> ${branch}\n   pushed ${files.length} object${files.length === 1 ? "" : "s"}`;
};

const commandPull = async (args, cwd) => {
    const repoRoot = await requireRepo(cwd);
    const config = await readRepoConfig(repoRoot);
    const remoteName = args.positional[0] || "origin";
    const branchArg = args.positional[1] || null;
    const url = (config.remotes || {})[remoteName];

    if (!url) {
        throw fatal(`remote '${remoteName}' does not exist; use 'ch remote add ${remoteName} <url>'`);
    }

    const status = await computeStatus(repoRoot);

    if (status.staged.length > 0 || status.unstaged.length > 0) {
        throw fatal("cannot pull with uncommitted changes");
    }

    const transport = await getRemoteTransport(url);
    const downloaded = await pullRemoteFiles(repoRoot, transport, true);

    const remoteConfig = await readRepoConfig(repoRoot);
    const branch = branchArg || remoteConfig.currentBranch || "main";
    const commitId = await getBranchCommitId(repoRoot, branch);
    const vcRoot = vcRootFor(repoRoot);

    if (!commitId) {
        await applySnapshotToWorkingTree(repoRoot, null);

        return `From ${transport.description}\n   branch '${branch}' has no commits`;
    }

    await fs.promises.writeFile(
        path.join(vcRoot, "HEAD"),
        `ref: refs/heads/${branch}`
    );

    await saveRepoConfig(repoRoot, {
        author: remoteConfig.author,
        currentBranch: branch,
        remotes: Object.assign({}, remoteConfig.remotes, { [remoteName]: url })
    });

    await applySnapshotToWorkingTree(repoRoot, commitId);

    return `From ${transport.description}\n   ${branch} -> ${branch} (fast-forward)\n   downloaded ${downloaded.length} object${downloaded.length === 1 ? "" : "s"}`;
};

const commandClone = async (args, cwd) => {
    const repository = args.positional[0];

    if (!repository) {
        throw fatal("clone requires a repository name or url: 'ch clone <repository>'");
    }

    let url;

    if (/^s3:\/\//.test(repository) || /^file:\/\//.test(repository)) {
        url = repository;
    } else if (path.isAbsolute(repository) || repository.startsWith("./") || repository.startsWith("../")) {
        url = path.resolve(cwd, repository);
    } else {
        const base = process.env.COMMITHUB_CLONE_BASE;

        if (!base) {
            throw fatal(
                `cannot resolve '${repository}' to a remote location; pass an s3:// or filesystem path, or set COMMITHUB_CLONE_BASE`
            );
        }

        if (base.startsWith("s3://")) {
            url = `${base.replace(/\/+$/, "")}/${repository}`;
        } else {
            url = path.resolve(base, repository);
        }
    }

    const defaultDir = repository
        .split("/")
        .filter(Boolean)
        .pop()
        .replace(/\.git$/, "");
    const dir = args.positional[1] ? path.resolve(cwd, args.positional[1]) : path.resolve(cwd, defaultDir || "repository");

    if (await pathExists(dir)) {
        const existing = await fs.promises.readdir(dir).catch(() => []);

        if (existing.some((entry) => !entry.startsWith("."))) {
            throw fatal(`destination path '${dir}' already exists and is not an empty directory`);
        }
    }

    await fs.promises.mkdir(dir, { recursive: true });
    await ensureVc(dir);

    await saveRepoConfig(dir, {
        author: null,
        currentBranch: "main",
        remotes: { origin: url }
    });

    const pullResult = await commandPull(
        { positional: ["origin", null] },
        dir
    );

    return `Cloning into '${dir}'...\n${pullResult}`;
};

const commands = {
    init: commandInit,
    clone: commandClone,
    status: commandStatus,
    add: commandAdd,
    commit: commandCommit,
    log: commandLog,
    branch: commandBranch,
    checkout: commandCheckout,
    diff: commandDiff,
    merge: commandMerge,
    revert: commandRevert,
    remote: commandRemote,
    push: commandPush,
    pull: commandPull
};

export { commands, requireRepo, resolveRef, formatDiff, fatal };