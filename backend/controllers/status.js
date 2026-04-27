const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

async function hashFile(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash("sha1").update(content).digest("hex");
}

async function statusRepo() {

    const rootPath = process.cwd();
    const repoPath = path.join(rootPath, ".CommitHub");
    const stagingPath = path.join(repoPath, "staging");
    const headPath = path.join(repoPath, "HEAD");

    try {

        // Check repo exists
        try {
            await fs.access(repoPath);
        } catch {
            console.log("Not a CommitHub repository. Run 'commithub init'");
            return;
        }

        // Current branch
        const branch = (await fs.readFile(headPath, "utf-8")).trim();
        console.log(`On branch: ${branch}\n`);

        // Last commit
        const branchFile = path.join(repoPath, "branches", branch);

        let lastCommit = null;
        let commitDir = null;

        try {
            lastCommit = (await fs.readFile(branchFile, "utf-8")).trim();
            commitDir = path.join(repoPath, "commits", lastCommit);
        } catch {}

        // Staged files
        let stagedFiles = [];
        try {
            stagedFiles = await fs.readdir(stagingPath);
        } catch {}

        console.log("Staged files:");
        if (stagedFiles.length === 0) {
            console.log("  (none)");
        } else {
            stagedFiles.forEach(file => console.log(`  ${file}`));
        }

        // All working directory files
        const allFiles = await fs.readdir(rootPath);

        let modified = [];
        let untracked = [];

        for (const file of allFiles) {

            if (file === ".CommitHub") continue;

            const workingFile = path.join(rootPath, file);

            // skip directories (for now)
            const stat = await fs.stat(workingFile);
            if (stat.isDirectory()) continue;

            if (stagedFiles.includes(file)) continue;

            if (commitDir) {

                const committedFile = path.join(commitDir, file);

                try {

                    await fs.access(committedFile);

                    const currentHash = await hashFile(workingFile);
                    const oldHash = await hashFile(committedFile);

                    if (currentHash !== oldHash) {
                        modified.push(file);
                    }

                } catch {
                    untracked.push(file);
                }

            } else {
                untracked.push(file);
            }
        }

        // Modified files
        console.log("\nModified files:");
        if (modified.length === 0) {
            console.log("  (none)");
        } else {
            modified.forEach(file => console.log(`  ${file}`));
        }

        // Untracked files
        console.log("\nUntracked files:");
        if (untracked.length === 0) {
            console.log("  (none)");
        } else {
            untracked.forEach(file => console.log(`  ${file}`));
        }

        // Clean message
        if (
            stagedFiles.length === 0 &&
            modified.length === 0 &&
            untracked.length === 0
        ) {
            console.log("\nWorking tree clean");
        }

    } catch (err) {
        console.error("Error getting status:", err.message);
    }
}

module.exports = { statusRepo };
