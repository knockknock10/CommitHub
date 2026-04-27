const fs = require("fs").promises;
const path = require("path");

async function initRepo() {
   const rootPath = process.cwd();
   const repoPath = path.join(rootPath, ".CommitHub");

   const commitsPath = path.join(repoPath, "commits");
   const stagingPath = path.join(repoPath, "staging");
   const refsHeadsPath = path.join(repoPath, "refs", "heads");

   try {
      // Prevent re-init
      const exists = await fs.stat(repoPath).catch(() => null);
      if (exists) {
         console.log("Repository already initialized");
         return;
      }

      // Create base folders
      await fs.mkdir(commitsPath, { recursive: true });
      await fs.mkdir(stagingPath, { recursive: true });
      await fs.mkdir(refsHeadsPath, { recursive: true });

      // Create main branch
      await fs.writeFile(
         path.join(refsHeadsPath, "main"),
         ""
      );

      // HEAD pointer
      await fs.writeFile(
         path.join(repoPath, "HEAD"),
         "ref: refs/heads/main"
      );

      // (Optional config — fine to keep)
      await fs.writeFile(
         path.join(repoPath, "config.json"),
         JSON.stringify({
            author: null,
            currentBranch: "main",
            remotes: {}
         }, null, 2)
      );

      console.log("Repository initialized successfully");
   } catch (err) {
      console.error("Error while initializing:", err.message);
   }
}

module.exports = { initRepo };