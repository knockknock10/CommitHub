const fs = require('fs');
const path = require('path');
const { cwd } = require('process');

function logRepo(){
   const rootPath = process.cwd();
   const repoPath = path.join(rootPath,".CommitHub");
   const commitsPath = path.join(repoPath,"commits");
   const headPath = path.join(repoPath,"HEAD");
   
   if(!fs.existsSync(repoPath)){
      console.log("Not a COmmitHub repository");
      return;
   }
   if(!fs.existsSync(headPath)){
      console.log("No commit found!");
      return;
   }
   const headcont = fs.readFileSync(headPath,"utf-8").trim();
   let branch = null;
   let currCommit = null;
   
   if(headcont.startsWith("ref:")){
      const refpath = headcont.split(" ")[1];  
      branch =  refpath.split("/").pop();
      const branchFile = path.join(repoPath,"branches",branch);
      if(!fs.existsSync(branchFile)){
         console.log("No commits found!!");
         return;
      }
      
      currCommit = fs.readFileSync(branchFile,"utf-8").trim();
   }else{
      //fallback
      currCommit = headcont;
   }
   if(!currCommit){
      console.log("No commit yet!");
      return;
   }
   
   let isfirst=true;
   
   while(currCommit){
      const commitDir = path.join(commitsPath,currCommit);
      const commitFile = path.join(commitDir,"commit.json");
      
      if(!fs.existsSync(commitFile)) break;
      
      const data = JSON.parse(fs.readFileSync(commitFile,"utf-8"));
      let header = `commit ${currCommit}`;
      
      if(isfirst && branch){
         header += `(HEAD -> ${branch})`;
         isfirst = false;
      }
      
      console.log(header);
      console.log(`Author: ${data.author || "Unknown"} `);
      console.log(`Date: ${new Date(data.timestamp).toString()}`);
      console.log(`\n    ${data.message}\n`);
      
      currCommit = data.parent;
   }
}
module.exports = {logRepo};