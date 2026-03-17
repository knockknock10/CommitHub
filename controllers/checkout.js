const fs = require("fs").promises;
const path = require("path");

function checkoutRepo(branchName){

    const repoPath = process.cwd();
    const commithubPath = path.join(repoPath,".CommitHub");

    const branchFile = path.join(commithubPath,"branches",branchName);

    if(!fs.existsSync(branchFile)){
        console.log("Branch does not exist");
        return;
    }

    const commitId = fs.readFileSync(branchFile,"utf-8").trim();

    const commitFolder = path.join(
        commithubPath,
        "commits",
        commitId
    );

    if(!fs.existsSync(commitFolder)){
        console.log("Commit not found");
        return;
    }

    const files = fs.readdirSync(commitFolder);

    files.forEach(file => {

        if(file === "commit.json") return;

        const src = path.join(commitFolder,file);
        const dest = path.join(repoPath,file);

        fs.copyFileSync(src,dest);
    });

    fs.writeFileSync(
        path.join(commithubPath,"HEAD"),
        branchName
    );

    console.log("Switched to branch:",branchName);
}

module.exports = { checkoutRepo };
