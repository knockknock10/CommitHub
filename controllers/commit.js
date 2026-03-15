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

function generateHash(data){
    return crypto
        .createHash("sha1")
        .update(data)
        .digest("hex");
}

function commitRepo(message){

    const repoPath = process.cwd();
    const commithubPath = path.join(repoPath,".CommitHub");

    const headPath = path.join(commithubPath,"HEAD");

    if(!fs.existsSync(headPath)){
        console.log("Repository not initialized");
        return;
    }

    const currentBranch = fs.readFileSync(headPath,"utf-8").trim();

    const branchFile = path.join(commithubPath,"branches",currentBranch);

    let parent = null;

    if(fs.existsSync(branchFile)){
        parent = fs.readFileSync(branchFile,"utf-8").trim();
    }

    const stagingPath = path.join(commithubPath,"staging");

    if(!fs.existsSync(stagingPath)){
        console.log("Nothing to commit");
        return;
    }

    const files = fs.readdirSync(stagingPath);

    if(files.length === 0){
        console.log("Nothing staged");
        return;
    }

    const timestamp = Date.now();

    let hashContent = message + timestamp + parent;

    files.forEach(file=>{
        const filePath = path.join(stagingPath,file);
        const content = fs.readFileSync(filePath);
        hashContent += content;
    });

    const commitId = generateHash(hashContent);

    const commitFolder = path.join(
        commithubPath,
        "commits",
        commitId
    );

    fs.mkdirSync(commitFolder,{recursive:true});

    files.forEach(file=>{
        const src = path.join(stagingPath,file);
        const dest = path.join(commitFolder,file);
        fs.copyFileSync(src,dest);
    });

    const commitData = {
        id: commitId,
        message: message,
        parent: parent,
        timestamp: timestamp,
        branch: currentBranch
    };

    fs.writeFileSync(
        path.join(commitFolder,"commit.json"),
        JSON.stringify(commitData,null,2)
    );

    fs.writeFileSync(branchFile,commitId);

    files.forEach(file=>{
        const filePath = path.join(stagingPath,file);
        fs.unlinkSync(filePath);
    });

    console.log("Commit created:",commitId);
}

module.exports = { commitRepo };
