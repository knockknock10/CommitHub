const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const { s3, S3_BUCKET } = require("../config/aws-config");

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

        // Upload HEAD
        console.log("Uploading .CommitHub/HEAD");

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: ".CommitHub/HEAD",
            Body: fs.readFileSync(headPath)
        }));

        // Upload branch pointer
        console.log(`Uploading .CommitHub/branches/${branch}`);

        await s3.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `.CommitHub/branches/${branch}`,
            Body: fs.readFileSync(branchPath)
        }));

        // Upload commit files
        const files = fs.readdirSync(commitDir);

        for (const file of files) {

            const filePath = path.join(commitDir, file);

            console.log(`Uploading .CommitHub/commits/${commitId}/${file}`);

            await s3.send(new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: `.CommitHub/commits/${commitId}/${file}`,
                Body: fs.readFileSync(filePath)
            }));
        }

        console.log("Push completed !!");

    } catch (err) {

        console.error("Push failed:", err);

    }
}

module.exports = { pushRepo };