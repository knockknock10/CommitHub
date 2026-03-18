const fs = require('fs').promises;
const path = require("path");

async function addRepo(args) {
    const rootPath = process.cwd();
    const repoPath = path.join(rootPath, ".CommitHub");
    const stagingPath = path.join(repoPath, "staging");

    const fileToAdd = path.basename(args);
    const sourcePath = path.join(rootPath, fileToAdd);
    const destinationPath = path.join(stagingPath, fileToAdd);

    try {
        // Check if repo exists
        try {
            await fs.access(repoPath);
        } catch {
            console.log("Not a CommitHub repository. Run 'commithub init'");
            return;
        }

        // Check if file exists
        await fs.access(sourcePath);

        // Check if already staged
        const alreadyExists = await fs.access(destinationPath).then(() => true).catch(() => false);
        if (alreadyExists) {
            console.log("File already staged");
            return;
        }

        // Copy file
        await fs.copyFile(sourcePath, destinationPath);

        console.log(`${fileToAdd} added to staging.`);
        
    } catch (err) {
        console.error("Error adding file:", err.message);
    }
}

module.exports = { addRepo };