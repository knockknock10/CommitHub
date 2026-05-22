import fs from "fs";
import path from "path";
import crypto from "crypto";

function generateHash(data) {
    return crypto.createHash("sha1").update(data).digest("hex").slice(0, 7);
}

function commitRepo(message) {
    const root = process.cwd();
    const repoPath = path.join(root, ".CommitHub");
    const stagingPath = path.join(repoPath, "staging");
    const commitsPath = path.join(repoPath, "commits");
    const headPath = path.join(repoPath, "HEAD");

    if (!fs.existsSync(repoPath)) {
        console.log("Not a CommitHub repository");
        return;
    }

    if (!fs.existsSync(stagingPath)) {
        console.log("Nothing to commit");
        return;
    }

    const files = fs.readdirSync(stagingPath);

    if (files.length === 0) {
        console.log("Nothing to commit");
        return;
    }

    const timestamp = Date.now().toString();
    const commitHash = generateHash(message + timestamp);
    const commitDir = path.join(commitsPath, commitHash);

    fs.mkdirSync(commitDir, { recursive: true });

    files.forEach((file) => {
        const src = path.join(stagingPath, file);
        const dest = path.join(commitDir, file);
        fs.copyFileSync(src, dest);
    });

    const metadata = {
        message,
        timestamp
    };

    fs.writeFileSync(path.join(commitDir, "meta.json"), JSON.stringify(metadata, null, 2));
    fs.rmSync(stagingPath, {
        recursive: true,
        force: true
    });

    fs.mkdirSync(stagingPath);

    const headContent = fs.readFileSync(headPath, "utf-8").trim();

    if (headContent.startsWith("ref:")) {
        const refPath = headContent.split(" ")[1];
        const branchFile = path.join(repoPath, refPath);
        fs.writeFileSync(branchFile, commitHash);
    }

    console.log(`Commit created: ${commitHash}`);
}

export { commitRepo };