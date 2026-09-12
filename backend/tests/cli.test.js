import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { main } from "../cli/ch.js";

const makeDir = async (prefix = "chtest-") =>
    fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const writeFile = async (dir, relative, content) => {
    const target = path.join(dir, relative);
    await fs.mkdirSync(path.dirname(target), { recursive: true });
    await fs.writeFileSync(target, content);
};

const readFile = async (dir, relative) =>
    fs.readFileSync(path.join(dir, relative), "utf-8");

const makeRepo = async () => {
    const dir = await makeDir();
    await main(["init"], dir);
    return dir;
};

const assertFatal = async (args, cwd, pattern) => {
    await assert.rejects(main(args, cwd), (error) => {
        assert.match(error.message, pattern);
        return true;
    });
};

test("ch --help prints usage and command list", async () => {
    const output = await main(["--help"], process.cwd());

    assert.match(output, /CommitHub CLI/);
    assert.match(output, /Usage:/);
    for (const command of [
        "init", "clone", "status", "add", "commit", "log",
        "branch", "checkout", "diff", "merge", "revert",
        "remote", "push", "pull"
    ]) {
        assert.match(output, new RegExp(`\\b${command}\\b`));
    }
});

test("ch init creates the canonical repository layout", async () => {
    const dir = await makeDir();
    const output = await main(["init"], dir);

    assert.match(output, /Initialized empty CommitHub repository/);

    const vcRoot = path.join(dir, ".CommitHub");
    assert.strictEqual(
        await readFile(dir, ".CommitHub/HEAD"),
        "ref: refs/heads/main"
    );

    const config = JSON.parse(
        await readFile(dir, ".CommitHub/config.json")
    );
    assert.strictEqual(config.currentBranch, "main");
    assert.deepStrictEqual(config.remotes, {});

    assert.ok(fs.existsSync(path.join(vcRoot, "commits")));
    assert.ok(fs.existsSync(path.join(vcRoot, "staging")));
    assert.ok(fs.existsSync(path.join(vcRoot, "refs", "heads", "main")));

    const again = await main(["init"], dir);
    assert.match(again, /Reinitialized existing CommitHub repository/);
});

test("ch status on a fresh repository reports no commits and clean tree", async () => {
    const dir = await makeRepo();
    const output = await main(["status"], dir);

    assert.match(output, /On branch main/);
    assert.match(output, /No commits yet/);
    assert.match(output, /nothing to commit/);
});

test("ch add . stages files and ch commit creates a commit with metadata", async () => {
    const dir = await makeRepo();

    await writeFile(dir, "README.md", "hello\n");
    await writeFile(dir, "src/app.js", "console.log(1)\n");

    await main(["add", "."], dir);

    const status = await main(["status"], dir);
    assert.match(status, /Changes to be committed:/);
    assert.match(status, /README\.md/);
    assert.match(status, /src\/app\.js/);
    assert.match(status, /new file/);

    const commitOutput = await main(["commit", "-m", "Initial commit"], dir);
    assert.match(commitOutput, /Initial commit/);

    const commitsDir = path.join(dir, ".CommitHub", "commits");
    const ids = fs.readdirSync(commitsDir);
    assert.strictEqual(ids.length, 1);

    const meta = JSON.parse(
        await readFile(
            dir,
            path.join(".CommitHub", "commits", ids[0], "meta.json")
        )
    );
    assert.strictEqual(meta.id, ids[0]);
    assert.strictEqual(meta.message, "Initial commit");
    assert.ok(meta.author && meta.author.name);
    assert.ok(meta.timestamp);
    assert.strictEqual(meta.parent, null);
    assert.strictEqual(fs.existsSync(path.join(commitsDir, ids[0], "snapshot", "README.md")), true);

    assert.strictEqual(
        await readFile(dir, path.join(".CommitHub", "refs", "heads", "main")),
        ids[0]
    );

    const log = await main(["log"], dir);
    assert.match(log, /Initial commit/);
});

test("ch commit requires a message and staged changes", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "a.txt", "a\n");

    await assertFatal(["commit"], dir, /commit requires a message/);
    await assertFatal(["commit", "-m", ""], dir, /commit requires a message/);
    await assertFatal(["commit", "-m", "  "], dir, /commit requires a message/);

    await main(["add", "."], dir);
    const output = await main(["commit", "-m", "first"], dir);
    assert.match(output, /\[main [0-9a-f]{4,40}\] first/);
});

test("modified files appear as unstaged until staged", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "f.txt", "one\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "first"], dir);

    await writeFile(dir, "f.txt", "one\ntwo\n");

    const unstaged = await main(["status"], dir);
    assert.match(unstaged, /Changes not staged for commit:/);
    assert.match(unstaged, /modified:   f\.txt/);
    assert.doesNotMatch(unstaged, /nothing to commit, working tree clean/);

    await main(["add", "f.txt"], dir);
    const staged = await main(["status"], dir);
    assert.match(staged, /Changes to be committed:/);
    assert.match(staged, /modified:   f\.txt/);

    await main(["commit", "-m", "second"], dir);
    assert.match(await main(["status"], dir), /nothing to commit, working tree clean/);
});

test("ch branch lists, creates, and rejects duplicates", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "a.txt", "a\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "first"], dir);

    const created = await main(["branch", "feature"], dir);
    assert.match(created, /Branch "feature" created/);

    const list = await main(["branch"], dir);
    assert.match(list, /\* main/);
    assert.match(list, /feature/);

    await assertFatal(["branch", "feature"], dir, /already exists|conflicts/);
});

test("ch branch and checkout keep tracked files isolated per branch", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "shared.txt", "base\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "c1"], dir);

    await main(["branch", "feature"], dir);
    await main(["checkout", "feature"], dir);
    await writeFile(dir, "feature.txt", "only on feature\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "feature work"], dir);

    await main(["checkout", "main"], dir);
    assert.strictEqual(fs.existsSync(path.join(dir, "feature.txt")), false);
    assert.strictEqual(await readFile(dir, "shared.txt"), "base\n");

    await writeFile(dir, "dirty.txt", "dirty\n");
    await main(["add", "."], dir);
    await assertFatal(["checkout", "feature"], dir, /staged changes/);
});

test("ch diff shows line-level differences and ignores untracked files", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "f.txt", "a\nb\n");
    await writeFile(dir, "keep.txt", "keep\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "c1"], dir);

    const firstId = fs.readdirSync(path.join(dir, ".CommitHub", "commits")).sort()[0];

    await writeFile(dir, "f.txt", "a\nb\nc\n");
    await writeFile(dir, "untracked.txt", "new\n");
    await writeFile(dir, "keep.log", "ignored\n");

    const worktreeDiff = await main(["diff"], dir);
    assert.match(worktreeDiff, /diff --ch a\/f\.txt b\/f\.txt/);
    assert.match(worktreeDiff, /\+c/);
    assert.doesNotMatch(worktreeDiff, /untracked\.txt/);
    assert.doesNotMatch(worktreeDiff, /keep\.log/);
    assert.match(worktreeDiff, /1 file changed, 1 insertion\(\+\), 0 deletions/);

    await main(["add", "."], dir);
    await main(["commit", "-m", "c2"], dir);

    const commits = fs.readdirSync(path.join(dir, ".CommitHub", "commits"));
    const secondId = commits.find((id) => id !== firstId);
    const diff = await main(["diff", firstId, secondId], dir);
    assert.match(diff, /diff --ch a\/f\.txt b\/f\.txt/);
    assert.match(diff, /3 files changed, 3 insertions\(\+\), 0 deletions/);
});

test("ch merge fast-forwards when the branch is ahead, is a no-op when up to date, and refuses divergence", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "f.txt", "base\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "c1"], dir);

    await main(["branch", "feature"], dir);
    await main(["checkout", "feature"], dir);
    await writeFile(dir, "feature.txt", "feat\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "feature"], dir);

    await main(["checkout", "main"], dir);
    assert.match(await main(["merge", "feature"], dir), /Fast-forward/);

    assert.strictEqual(fs.existsSync(path.join(dir, "feature.txt")), true);
    assert.match(await main(["merge", "feature"], dir), /Already up to date\./);

    await writeFile(dir, "div.txt", "main\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "main track div"], dir);

    await main(["branch", "diverged"], dir);
    await main(["checkout", "diverged"], dir);
    await writeFile(dir, "div.txt", "main\ndiverged\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "diverged"], dir);

    await main(["checkout", "main"], dir);
    await writeFile(dir, "f.txt", "base\nmore from main\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "main continues"], dir);

    await assertFatal(
        ["merge", "diverged"],
        dir,
        /have diverged.*fast-forward merge is not possible/
    );
});

test("ch revert creates a new commit without deleting history", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "f.txt", "one\ntwo\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "c1"], dir);
    await writeFile(dir, "f.txt", "one\ntwo\nthree\n");
    await main(["add", "."], dir);
    await main(["commit", "-m", "c2"], dir);

    const before = fs.readdirSync(path.join(dir, ".CommitHub", "commits")).length;
    const log = await main(["log"], dir);
    const commitId = log.match(/commit ([0-9a-f]{12})/)[1];

    const revertOutput = await main(["revert", commitId], dir);
    assert.match(revertOutput, /Revert "c2"/);

    assert.strictEqual(
        fs.readFileSync(path.join(dir, "f.txt"), "utf-8"),
        "one\ntwo\n"
    );
    assert.strictEqual(
        fs.readdirSync(path.join(dir, ".CommitHub", "commits")).length,
        before + 1
    );
    assert.match(await main(["log"], dir), /Revert "c2"/);

    const history = await main(["log"], dir);
    assert.strictEqual((history.match(/^commit /gm) || []).length, before + 1);
});

test("ch remote add validates urls and rejects duplicates", async () => {
    const dir = await makeRepo();
    const added = await main(["remote", "add", "origin", "/tmp/somewhere"], dir);
    assert.match(added, /Adding remote 'origin'/);

    const list = await main(["remote"], dir);
    assert.match(list, /origin\t\/tmp\/somewhere/);

    await assertFatal(["remote", "add", "origin", "/tmp/other"], dir, /already exists/);
    await assertFatal(["remote", "add", "bad name", "/tmp/x"], dir, /invalid remote name/);
    await assertFatal(["remote", "add", "bad", "not-a-valid-url"], dir, /invalid remote url/);
});

test("ch push, pull, and clone replicate the repository through a local remote", async () => {
    const remoteDir = path.join(await makeDir("chremote-"), "repo");
    const work = await makeRepo();
    const cloneDir = path.join(await makeDir("chclone-"), "clone");
    const secondDir = await makeDir("chsecond-");

    await writeFile(work, "notes.txt", "alpha\nbeta\n");
    await main(["add", "."], work);
    await main(["commit", "-m", "first"], work);

    await main(["remote", "add", "origin", remoteDir], work);
    const push = await main(["push"], work);
    assert.match(push, /To /);
    assert.strictEqual(fs.existsSync(path.join(remoteDir, "refs", "heads", "main")), true);

    const clone = await main(["clone", remoteDir, cloneDir], work);
    assert.match(clone, /Cloning into/);
    assert.strictEqual(await readFile(cloneDir, "notes.txt"), "alpha\nbeta\n");
    assert.match(await main(["status"], cloneDir), /nothing to commit, working tree clean/);

    await writeFile(cloneDir, "clone.txt", "added from clone\n");
    await main(["add", "."], cloneDir);
    await main(["commit", "-m", "clone work"], cloneDir);
    await main(["push"], cloneDir);

    await main(["init"], secondDir);
    await main(["remote", "add", "origin", remoteDir], secondDir);
    const pull = await main(["pull"], secondDir);
    assert.match(pull, /fast-forward/);
    assert.strictEqual(await readFile(secondDir, "clone.txt"), "added from clone\n");
    assert.strictEqual(await readFile(secondDir, "notes.txt"), "alpha\nbeta\n");
});

test("ch excludes node_modules, .env, .git, and .CommitHub from staging", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "app.js", "code\n");
    await writeFile(dir, "node_modules/pkg/index.js", "nm\n");
    await writeFile(dir, ".env", "SECRET=1\n");
    await writeFile(dir, ".CommitHub/scratch.txt", "vc\n");

    await main(["add", "."], dir);

    const staged = await main(["status"], dir);
    assert.doesNotMatch(staged, /node_modules/);
    assert.doesNotMatch(staged, /\.env/);
    assert.doesNotMatch(staged, /\.CommitHub/);
});

test("ch respects gitignore-style exclusions from .chignore", async () => {
    const dir = await makeRepo();
    await writeFile(dir, "keep.js", "keep\n");
    await writeFile(dir, ".chignore", "build/\n*.log\n");
    await writeFile(dir, "build/out.js", "out\n");
    await writeFile(dir, "debug.log", "log\n");

    await main(["add", "."], dir);

    const staged = await main(["status"], dir);
    assert.match(staged, /keep\.js/);
    assert.doesNotMatch(staged, /build/);
    assert.doesNotMatch(staged, /debug\.log/);

    await main(["commit", "-m", "c1"], dir);
    assert.match(await main(["status"], dir), /nothing to commit, working tree clean/);
});

test("unknown commands and user errors fail with fatal messages and a non-zero exit code", async () => {
    const dir = await makeRepo();

    await assertFatal(["frobnicate"], dir, /unknown command/);
    await assertFatal(["status"], fs.mkdtempSync(path.join(os.tmpdir(), "ch-uninit-")), /not a CommitHub repository/);

    const { spawnSync } = await import("node:child_process");
    const result = spawnSync(
        process.execPath,
        [path.resolve("cli/ch.js"), "frobnicate"],
        { cwd: dir }
    );

    assert.strictEqual(result.status, 1);
    assert.match(result.stderr.toString(), /fatal: unknown command 'frobnicate'/);
});