require("dotenv").config({ path: "./.env" });

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");


const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const { commitRepo } = require("./controllers/commit");
const { branchRepo } = require("./controllers/branch");
const { checkoutRepo } = require("./controllers/checkout");
const { mergeRepo } = require("./controllers/merge");
const { addRemoteRepo } = require("./controllers/remote");
const { pushRepo } = require("./controllers/push");
const { pullRepo } = require("./controllers/pull");
const { logRepo } = require("./controllers/log");
const { statusRepo } = require("./controllers/status");
const { revertRepo } = require("./controllers/revert");

yargs(hideBin(process.argv))
  .scriptName("commithub")
  .usage("Usage: $0 <command> [options]")

  // init
  .command(
    "init",
    "Initialize a new CommitHub repository",
    {},
    () => {
      initRepo();
    }
  )

  
  .command(
    "add <file>",
    "Stage a file for commit",
    (args) => {
      args.positional("file", {
        describe: "File to stage",
        type: "string",
      });
    },
    (argv) => {
      addRepo(argv.file);
    }
  )

  
  .command(
    "commit",
    "Create a new commit from staged files",
    (args) => {
      args.option("m", {
        alias: "message",
        describe: "Commit message",
        type: "string",
        demandOption: true,
      });
    },
    (argv) => {
      commitRepo(argv.message);
    }
  )

  
  .command(
    "branch <name>",
    "Create a new branch",
    (args) => {
      args.positional("name", {
        describe: "Branch name",
        type: "string",
      });
    },
    (argv) => {
      branchRepo(argv.name);
    }
  )

  
  .command(
    "checkout <name>",
    "Switch to another branch",
    (args) => {
      args.positional("name", {
        describe: "Branch to switch to",
        type: "string",
      });
    },
    (argv) => {
      checkoutRepo(argv.name);
    }
  )

  
  .command(
    "merge <branch>",
    "Merge specified branch into current branch",
    (args) => {
      args.positional("branch", {
        describe: "Branch to merge",
        type: "string",
      });
    },
    (argv) => {
      mergeRepo(argv.branch);
    }
  )

  
  .command(
    "remote add <name> <url>",
    "Add a remote repository",
    (args) => {
      args.positional("name", {
        describe: "Remote name",
        type: "string",
      });

      args.positional("url", {
        describe: "Remote repository URL",
        type: "string",
      });
    },
    (argv) => {
      addRemoteRepo(argv.name, argv.url);
    }
  )

  
  .command(
    "push <remote> <branch>",
    "Push local branch to remote repository",
    (args) => {
      args.positional("remote", {
        describe: "Remote name",
        type: "string",
      });

      args.positional("branch", {
        describe: "Branch name",
        type: "string",
      });
    },
    (argv) => {
      pushRepo(argv.remote, argv.branch);
    }
  )

  
  .command(
    "pull <remote> <branch>",
    "Fetch and merge changes from remote",
    (args) => {
      args.positional("remote", {
        describe: "Remote name",
        type: "string",
      });

      args.positional("branch", {
        describe: "Branch name",
        type: "string",
      });
    },
    (argv) => {
      pullRepo(argv.remote, argv.branch);
    }
  )

  // log
  .command(
    "log",
    "Show commit history",
    {},
    () => {
      logRepo();
    }
  )

  
  .command(
    "status",
    "Show repository status",
    {},
    () => {
      statusRepo();
    }
  )

  // revert
  .command(
    "revert <commitId>",
    "Revert to a previous commit",
    (args) => {
      args.positional("commitId", {
        describe: "Commit ID to revert to",
        type: "string",
      });
    },
    (argv) => {
      revertRepo(argv.commitId);
    }
  )

  .demandCommand(1, "You need at least one command")
  .strict()
  .recommendCommands()
  .alias("h", "help")
  .help()
  .version("1.0.0")
  .argv;