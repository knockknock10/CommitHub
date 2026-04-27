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

// const fs = require("fs");
// const path = require("path");
// const crypto = require("crypto");
// const os = require("os");

// //HASH 
// function hashfile(filepath) {
//     const content = fs.readFileSync(filepath);
//     return crypto.createHash("sha1").update(content).digest("hex");
// }

// // AUTHOR 
// function getAuthor(repoPath) {
//     const configPath = path.join(repoPath, "config.json");

//     //From config
//     if (fs.existsSync(configPath)) {
//         try {
//             const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
//             if (config.author) return config.author;
//         } catch {}
//     }

//     //From system
//     const username = os.userInfo().username;
//     if (username) return username;

//     //allback
//     return "Unknown";
// }

//MAIN COMMIT
// function commitRepo(message) {
//     const rootPath = process.cwd();
//     const repoPath = path.join(rootPath, ".CommitHub");

//     const stagingPath = path.join(repoPath, "staging");
//     const commitsPath = path.join(repoPath, "commits");
//     const headPath = path.join(repoPath, "HEAD");

//     // CHECK REPO 
//     if (!fs.existsSync(repoPath)) {
//         console.log("Not a CommitHub repository");
//         return;
//     }

//     //READ HEAD
//     const headContent = fs.readFileSync(headPath, "utf-8").trim();

//     let branch;
//     if (headContent.startsWith("ref:")) {
//         branch = headContent.split(" ")[1].replace("refs/heads/", "");
//     } else {
//         console.log("Detached HEAD not supported yet");
//         return;
//     }

//     const branchFile = path.join(repoPath, "branches", branch);

//     //  GET PARENT 
//     let parentCommit = null;
//     if (fs.existsSync(branchFile)) {
//         parentCommit = fs.readFileSync(branchFile, "utf-8").trim();
//         if (parentCommit === "") parentCommit = null;
//     }

//     //  READ STAGING 
//     if (!fs.existsSync(stagingPath)) {
//         console.log("Staging area missing");
//         return;
//     }

//     const files = fs.readdirSync(stagingPath).sort();

//     if (files.length === 0) {
//         console.log("Nothing to commit");
//         return;
//     }

//   //hash
//     let combHash = "";
//     for(const file of files){
//         const filepath = path.join(stagingPath, file);
//         combHash+=hashfile(filepath);
//     }

//     const commitHash = crypto
//         .createHash("sha1")
//         .update(combHash + message + parentCommit)
//         .digest("hex");

//     const commitDir = path.join(commitsPath, commitHash);

//     if (fs.existsSync(commitDir)) {
//         console.log("Commit already exists");
//         return;
//     }

//     //create commit
//     fs.mkdirSync(commitDir, { recursive: true });

//     for (const file of files) {
//         const src = path.join(stagingPath, file);
//         const dest = path.join(commitDir, file);
//         fs.copyFileSync(src, dest);
//     }

//     const commitData = {
//         message,
//         parent: parentCommit || null,
//         author: getAuthor(repoPath),
//         timestamp: new Date().toISOString()
//     };

//     fs.writeFileSync(
//         path.join(commitDir, "commit.json"),
//         JSON.stringify(commitData, null, 2)
//     );

//     //update branch
//     fs.writeFileSync(branchFile, commitHash);

//     //clear staging 
//     for (const file of files) {
//         fs.unlinkSync(path.join(stagingPath, file));
//     }

//     console.log(`Commit created: ${commitHash.substring(0, 7)}`);
// }

// module.exports = { commitRepo };



const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function generateHash(data) {
    return crypto.createHash("sha1").update(data).digest("hex").slice(0, 7);
}

function commitRepo(message) {
    const root = process.cwd();
    const repoPath = path.join(root, ".CommitHub");

    const stagingPath = path.join(repoPath, "staging");
    const commitsPath = path.join(repoPath, "commits");
    const headPath = path.join(repoPath, "HEAD");

    // Check repo
    if (!fs.existsSync(repoPath)) {
        console.log("Not a CommitHub repository");
        return;
    }

    // Check staging
    if (!fs.existsSync(stagingPath)) {
        console.log("Nothing to commit");
        return;
    }

    const files = fs.readdirSync(stagingPath);

    if (files.length === 0) {
        console.log("Nothing to commit");
        return;
    }

    // Create commit hash
    const timestamp = Date.now().toString();
    const commitHash = generateHash(message + timestamp);

    const commitDir = path.join(commitsPath, commitHash);
    fs.mkdirSync(commitDir, { recursive: true });

    // Copy staged files to commit
    files.forEach(file => {
        const src = path.join(stagingPath, file);
        const dest = path.join(commitDir, file);
        fs.copyFileSync(src, dest);
    });

    // Save metadata
    const metadata = {
        message,
        timestamp,
    };

    fs.writeFileSync(
        path.join(commitDir, "meta.json"),
        JSON.stringify(metadata, null, 2)
    );

    // CLEAR STAGING
    fs.rmSync(stagingPath, { recursive: true, force: true });
    fs.mkdirSync(stagingPath);

    // UPDATE BRANCH POINTER
    const headContent = fs.readFileSync(headPath, "utf-8").trim();

    if (headContent.startsWith("ref:")) {
        const refPath = headContent.split(" ")[1]; // refs/heads/main
        const branchFile = path.join(repoPath, refPath);

        fs.writeFileSync(branchFile, commitHash);
    }

    console.log(`Commit created: ${commitHash}`);
}

module.exports = { commitRepo };