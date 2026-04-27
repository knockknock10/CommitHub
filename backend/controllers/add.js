const fs = require("fs");
const path = require("path");

function addRepo(fileName) {
    const root = process.cwd();
    const repoPath = path.join(root, ".CommitHub");
    const stagingPath = path.join(repoPath, "staging");

    const filePath = path.join(root, fileName);

    // Check repo
    if (!fs.existsSync(repoPath)) {
        console.log("Not a CommitHub repository");
        return;
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
        console.log("File does not exist!");
        return;
    }

    // Ensure staging exists
    if (!fs.existsSync(stagingPath)) {
        fs.mkdirSync(stagingPath, { recursive: true });
    }

    const destPath = path.join(stagingPath, path.basename(fileName));

    // Copy file to staging
    fs.copyFileSync(filePath, destPath);

    console.log("File added to staging");
}

module.exports = { addRepo };