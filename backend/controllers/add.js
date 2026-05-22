import fs from "fs";
import path from "path";

function addRepo(fileName) {
    const root = process.cwd();
    const repoPath = path.join(root, ".CommitHub");
    const stagingPath = path.join(repoPath, "staging");
    const filePath = path.join(root, fileName);

    if (!fs.existsSync(repoPath)) {
        console.log("Not a CommitHub repository");
        return;
    }

    if (!fs.existsSync(filePath)) {
        console.log("File does not exist!");
        return;
    }

    if (!fs.existsSync(stagingPath)) {
        fs.mkdirSync(stagingPath, { recursive: true });
    }

    const destPath = path.join(stagingPath, path.basename(fileName));
    fs.copyFileSync(filePath, destPath);
    console.log("File added to staging");
}

export { addRepo };