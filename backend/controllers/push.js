const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const { s3, S3_BUCKET } = require("../config/aws-config");

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
        const headPath = path.join(".CommitHub", "HEAD");
        const currentBranch = fs.readFileSync(headPath, "utf-8").trim();

        if (currentBranch !== branch) {
            console.log("Branch mismatch. Current branch:", currentBranch);
            return;
        }

        const branchPath = path.join(".CommitHub", "branches", branch);
        const commitId = fs.readFileSync(branchPath, "utf-8").trim();

        const commitDir = path.join(".CommitHub", "commits", commitId);

        if (!fs.existsSync(commitDir)) {
            console.log("Commit folder not found");
            return;
        }

        console.log("Uploading .CommitHub/HEAD");

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: ".CommitHub/HEAD",
            Body: fs.createReadStream(headPath)
        }));

        console.log(`Uploading .CommitHub/branches/${branch}`);

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `.CommitHub/branches/${branch}`,
            Body: fs.createReadStream(branchPath)
        }));

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
                Body: fs.createReadStream(filePath)
            }));
        }

        console.log("Push completed !!");

    } catch (err) {
        console.error("Push failed:", err.message);
    }
}

module.exports = { pushRepo };