import fs from "fs/promises";
import path from "path";

async function initRepo() {
    const rootPath = process.cwd();
    const repoPath = path.join(rootPath, ".CommitHub");
    const commitsPath = path.join(repoPath, "commits");
    const stagingPath = path.join(repoPath, "staging");
    const refsHeadsPath = path.join(repoPath, "refs", "heads");

    try {
        const exists = await fs.stat(repoPath).catch(() => null);

        if (exists) {
            console.log("Repository already initialized");
            return;
        }

        await fs.mkdir(commitsPath, { recursive: true });
        await fs.mkdir(stagingPath, { recursive: true });
        await fs.mkdir(refsHeadsPath, { recursive: true });

        await fs.writeFile(path.join(refsHeadsPath, "main"), "");
        await fs.writeFile(path.join(repoPath, "HEAD"), "ref: refs/heads/main");
        await fs.writeFile(
            path.join(repoPath, "config.json"),
            JSON.stringify({ author: null, currentBranch: "main", remotes: {} }, null, 2)
        );

        console.log("Repository initialized successfully");
    } catch (error) {
        console.error("Error while initializing:", error.message);
    }
}

export { initRepo };