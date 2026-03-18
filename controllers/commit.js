// const fs = require("fs").promises;
// const path = require("path");
// const { v4: uuidv4 } = require("uuid");

// async function commitRepo(args) {

//     const message = args.message;
//     const rootPath = process.cwd();

//     const repoPath = path.join(rootPath, ".CommitHub");
//     const stagingPath = path.join(repoPath, "staging");
//     const commitsPath = path.join(repoPath, "commits");
//     const branchesPath = path.join(repoPath, "branches");
//     const headPath = path.join(repoPath, "HEAD");

//     try {

//         // Check repo exists
//         await fs.access(repoPath);

//         const files = await fs.readdir(stagingPath);

//         if (files.length === 0) {
//             console.log("Nothing to commit!");
//             return;
//         }

        
//         const currentBranch = (await fs.readFile(headPath, "utf-8")).trim();

//         let parent = null;
//         const branchFilePath = path.join(branchesPath, currentBranch);

//         try {
//             parent = (await fs.readFile(branchFilePath, "utf-8")).trim();
//             if (parent === "") parent = null;
//         } catch {
//             parent = null;
//         }

//         // Create commit
//         const commitId = uuidv4();
//         const commitDir = path.join(commitsPath, commitId);

//         await fs.mkdir(commitDir);

//         for (const file of files) {
//             await fs.copyFile(
//                 path.join(stagingPath, file),
//                 path.join(commitDir, file)
//             );
//         }

//         const commitData = {
//             id: commitId,
//             message: message,
//             parent: parent,
//             date: new Date().toISOString()
//         };

//         await fs.writeFile(
//             path.join(commitDir, "commit.json"),
//             JSON.stringify(commitData, null, 2)
//         );

//         // Update branch pointer
//         await fs.writeFile(branchFilePath, commitId);

//         // Clear staging
//         for (const file of files) {
//             await fs.unlink(path.join(stagingPath, file));
//         }
//         console.log(commitData);
//         console.log(`Commit ${commitId} created successfully.`);

//     } catch (err) {
//         console.error("Error during commit:", err.message);
//     }
// }

// module.exports = { commitRepo };

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function hashfile(filepath) {
    const content = fs.readFileSync(filepath);
    return crypto
        .createHash("sha1")
        .update(content)
        .digest("hex");
}

function commitRepo(message) {
    const repoPath = process.cwd();
    const commitsPath = path.join(repoPath, ".CommitHub");
    const stagingPath = path.join(commitsPath, "staging");
    const headPath = path.join(commitsPath, "HEAD");

    const branch = fs.readFileSync(headPath, "utf-8").trim();
    const branchFile = path.join(commitsPath, "branches", branch);

    const parentCommit = fs.existsSync(branchFile)
        ? fs.readFileSync(branchFile, "utf-8").trim()
        : null;

    const files = fs.readdirSync(stagingPath);

    if (files.length === 0) {
        console.log("Nothing to Commit");
        return;
    }

    let combHash = "";
    for (const file of files) {
        const filepath = path.join(stagingPath, file);
        combHash += hashfile(filepath);
    }

    const commitHash = crypto
        .createHash("sha1")
        .update(combHash + message)
        .digest("hex");

    const commitDir = path.join(commitsPath, "commits", commitHash);

    if (fs.existsSync(commitDir)) {
        console.log("commit already exists");
        return;
    }

    fs.mkdirSync(commitDir, { recursive: true });

    for (const file of files) {
        const src = path.join(stagingPath, file);
        const dest = path.join(commitDir, file);
        fs.copyFileSync(src, dest);
    }

    const commitData = {
        message,
        parent: parentCommit,
        timeStamp: Date.now()
    };

    fs.writeFileSync(
        path.join(commitDir, "commit.json"),
        JSON.stringify(commitData, null, 2)
    );

    fs.writeFileSync(branchFile, commitHash);

    console.log("commit created:", commitHash);
}

module.exports = { commitRepo };