require("dotenv").config({ path: "./.env" });
const yargs = require('yargs');
const { hideBin } =  require("yargs/helpers");

const { initRepo } = require('./controllers/init');
const {addRepo} = require('./controllers/add');
const {commitRepo} = require('./controllers/commit');
const {branchRepo} = require('./controllers/branch');
const {checkoutRepo} = require('./controllers/checkout');
const {mergeRepo} = require('./controllers/merge');
const {addRemoteRepo} = require('./controllers/remote');
const {pushRepo} = require('./controllers/push');
const {pullRepo} = require('./controllers/pull');
const {logRepo} = require('./controllers/log');
const {statusRepo} = require('./controllers/status');
const {revertRepo} = require('./controllers/revert');


yargs(hideBin(process.argv))
    .command('init',"Initialize a new repository",{},initRepo )
    .command("add <file>","Stage a file for tracking",
        (args)=>{
            args.positional("file",{
                describe: "File to be Staged",
                type: "string"
            })
        },(argv)=>{
            addRepo(argv.file);
        }
    )
    .command(
        "commit",
        "Create a new commit with staged changes",
        (args)=>{
            args.option('m',{
                alias: 'message',
                describe: "Commit message",
                type: 'string',
                demandOption: true
            });
        },
        (argv)=>{
            commitRepo(argv.message);
        }
    )
    .command(
        "branch <name>",
        "Create a new branch",
        (args)=>{
            args.positional("name",{
                describe:"branch name",
                type: "string"
            });
        },(argv)=>{
            branchRepo(argv.name);
        }
    )
    .command(
        "checkout <name>",
        "Switch branches",
        (args)=>{
            args.positional("name",{
                describe:"switch branch",
                type:"string"
            });
        },(argv)=>{
            checkoutRepo(argv.name);
        }
    )
    .command(
        "merge <branch>",
        "Merge specified branch into current branch",
        (args)=>{
            args.positional("branch",{
                describe:"Branch to merge",
                type:"string"
            })
        },(argv)=>{
            mergeRepo(argv.branch);
        }
    )
    .command(
        "remote add <name> <url>",
        "Add a remote repository",
        (args)=>{
            args.positional("name",{
                describe:"Remote name",
                type:"string"
            });
            args.positional("url",{
                describe:"Remote url",
                type:"string"
            });
        },
        (argv)=>{
            addRemoteRepo(argv.name, argv.url);
        }
    )
    .command(
        "push <remote> <branch>",
        "Push local branch to remote repository",
        (args)=>{
            args.positional("remote",{
                describe:"Remote name",
                type:"string"
            });
            args.positional("branch",{
                describe:"Branch name",
                type:"string"
            })
        },(argv)=>{
            pushRepo(argv.remote, argv.branch);
        }
    )
    .command(
        "pull <remote> <branch>",
        "Fetch and Merge changes from remote repository",
        (args)=>{
            args.positional("remote",{type:"string"});
            args.positional("branch",{type:"string"});
        },
        (argv)=>{
            pullRepo(argv.remote, argv.branch);
        }
    )
    .command(
        "log",
        "Display commit history",
        {},logRepo
    )
    .command(
        "status",
        "Show working directory status",
        {},statusRepo
    )
    .command(
        "revert <commitId>",
        "Rollback to previous changes",
        (args)=>{
            args.positional("commitId",{
                describe: "Commit ID to revert",
                type:"string"
            });
        },(argv)=>{
            revertRepo(argv.commitId);
        }
    )
    
    .demandCommand(1,"You need at least one cmd")
    .strict()
    .recommendCommands()
    .alias('h','help')
    .help()
    .version()
    .argv;