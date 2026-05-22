import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const COMMITHUB = path.join(ROOT, ".CommitHub");
const REFS_HEADS = path.join(COMMITHUB, "refs", "heads");
const HEAD_FILE = path.join(COMMITHUB, "HEAD");

/* current branch */

function getCurrentBranch() {
    const headContent = fs.readFileSync(HEAD_FILE, "utf-8").trim();

    if (!headContent.startsWith("ref:")) {
        throw new Error("Detached HEAD not supported yet");
    }

    const refPath = headContent.split(" ")[1];
    return path.basename(refPath);
}

/* current commit */

function getCurrentCommit() {
    const branch = getCurrentBranch();
    const branchFile = path.join(REFS_HEADS, branch);

    if (!fs.existsSync(branchFile)) {
        throw new Error("No commits found on current branch");
    }

    return fs.readFileSync(branchFile, "utf-8").trim();
}

/* validate repo */

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

/* main */

function branchRepo(branchName) {
    try {
        validateRepo();
        if (!branchName) {
            const branches = fs.readdirSync(REFS_HEADS);
            const current = getCurrentBranch();

            branches.forEach((branch) => {
                if (branch === current) {
                    console.log(`* ${branch}`);
                } else {
                    console.log(`  ${branch}`);
                }
            });

            return;
        }

        const newBranchPath = path.join(REFS_HEADS, branchName);

        if (fs.existsSync(newBranchPath)) {
            console.log(`Branch "${branchName}" already exists.`);
            return;
        }

        const currentCommit = getCurrentCommit();
        fs.writeFileSync(newBranchPath, currentCommit);
        console.log(`Branch "${branchName}" created at ${currentCommit}`);
    } catch (error) {
        console.log("Error:", error.message);
    }
}

export { branchRepo };