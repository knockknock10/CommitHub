const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const COMMITHUB = path.join(ROOT, ".CommitHub");
const REFS_HEADS = path.join(COMMITHUB, "branches");
const HEAD_FILE = path.join(COMMITHUB, "HEAD");


//  HELPERS

// Get current branch name
function getCurrentBranch() {
    const headContent = fs.readFileSync(HEAD_FILE, "utf-8").trim();

    if (!headContent.startsWith("ref:")) {
        throw new Error("Detached HEAD not supported yet");
    }

    const refPath = headContent.split(" ")[1]; // refs/heads/main
    return path.basename(refPath); // main
}

// Get current commit hash
function getCurrentCommit() {
    const branch = getCurrentBranch();
    const branchFile = path.join(REFS_HEADS, branch);

    if (!fs.existsSync(branchFile)) {
        throw new Error("No commits found on current branch");
    }

    return fs.readFileSync(branchFile, "utf-8").trim();
}

// Validate repo
function validateRepo() {
    if (!fs.existsSync(COMMITHUB)) {
        throw new Error("Not a CommitHub repository");
    }

    if (!fs.existsSync(HEAD_FILE)) {
        throw new Error("HEAD file missing");
    }

    if (!fs.existsSync(REFS_HEADS)) {
        fs.mkdirSync(REFS_HEADS, { recursive: true });
    }
}


// MAIN FUNCTION


function branchRepo(branchName) {
    try {
        validateRepo();

        // If no name → list branches
        if (!branchName) {
            const branches = fs.readdirSync(REFS_HEADS);
            const current = getCurrentBranch();

            branches.forEach((b) => {
                if (b === current) {
                    console.log(`* ${b}`);
                } else {
                    console.log(`  ${b}`);
                }
            });

            return;
        }

        // CREATE BRANCH
        const newBranchPath = path.join(REFS_HEADS, branchName);

        if (fs.existsSync(newBranchPath)) {
            console.log(`Branch "${branchName}" already exists.`);
            return;
        }

        const currentCommit = getCurrentCommit();

        fs.writeFileSync(newBranchPath, currentCommit);

        console.log(`Branch "${branchName}" created at ${currentCommit}`);

    } catch (err) {
        console.log("Error:", err.message);
    }
}

module.exports = { branchRepo };












// const fs = require("fs");
// const path = require("path");

// async function branchRepo(branchName){
//     const rootPath = process.cwd();
//     const repoPath = path.join(rootPath,".CommitHub");
//     const branchPath  = path.join(repoPath,"branches");
//     const headPath = path.join(repoPath,"HEAD");
    
//     if(!fs.existsSync(repoPath)){
//         console.log("Not a CommitHub Repository!");
//         return;
//     }
    
//     if(fs.existsSync(branchName)){
//         console.log("branch already exits!");
//     }
//     if(!fs.existsSync(headPath)){
//         console.log("No Commits exits!");
//     }
//     let branch = null;
//     const head = fs.readFileSync(headPath,"utf-8").trim();
//     if(head.startsWith("ref:")){
//         const refpath = headPath.split(" ")[1];
//         branch =  refpath.split("/").pop();
//         const branchFile = path.join(repoPath,"branches",branch);
//         if(!fs.existsSync(branchFile)){
//             console.log("No Commits Found!");
//         }
//         let newbranch = await fs.mkdir(branchName);
//         path.join(branchPath,newbranch);
//         headPath = 
        
//     }
    
//     const newbranch = path.join(branch,"main");
//     fs.mkdirSync(newbranch);
//     console.log("Branch created successfully!");
    
// }


// module.exports = {branchRepo}