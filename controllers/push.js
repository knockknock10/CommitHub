const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const { s3, S3_BUCKET } = require("../config/aws-config");

/*
    Recursively get all files inside a directory
*/
function getAllFiles(dirPath, arrayOfFiles = []) {

    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {

        const fullPath = path.join(dirPath, file);

        if (fs.statSync(fullPath).isDirectory()) {

            getAllFiles(fullPath, arrayOfFiles);

        } else {

            arrayOfFiles.push(fullPath);

        }

    });

    return arrayOfFiles;
}

async function pushRepo(remote, branch) {

    try {

        // Read current branch
        const headPath = ".CommitHub/HEAD";
        const currentBranch = fs.readFileSync(headPath, "utf-8").trim();

        if (currentBranch !== branch) {
            console.log("Branch mismatch. Current branch:", currentBranch);
            return;
        }

        // Read commit id
        const branchPath = `.CommitHub/branches/${branch}`;
        const commitId = fs.readFileSync(branchPath, "utf-8").trim();

        const commitDir = `.CommitHub/commits/${commitId}`;

        if (!fs.existsSync(commitDir)) {
            console.log("Commit folder not found");
            return;
        }

        /*
            Upload HEAD
        */
        console.log("Uploading .CommitHub/HEAD");

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: ".CommitHub/HEAD",
            Body: fs.readFileSync(headPath)
        }));

        /*
            Upload branch pointer
        */
        console.log(`Uploading .CommitHub/branches/${branch}`);

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `.CommitHub/branches/${branch}`,
            Body: fs.readFileSync(branchPath)
        }));


        /*
            Upload commit files (recursive)
        */
        const allFiles = getAllFiles(commitDir);

        for (const filePath of allFiles) {

            const relativePath = path
                .relative(".CommitHub", filePath)
                .replace(/\\/g, "/");

            const s3Key = `.CommitHub/${relativePath}`;

            console.log(`Uploading ${s3Key}`);

            await s3.send(new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
                Body: fs.readFileSync(filePath)
            }));

        }

        console.log("Push completed !!");

    } catch (err) {

        console.error("Push failed:", err.message);

    }

}

module.exports = { pushRepo };
