#!/usr/bin/env node

import fs from "fs";
import url from "url";

import { commands, fatal } from "./commands.js";

const HELP = [
    "CommitHub CLI (ch)",
    "",
    "Usage:",
    "  ch <command> [<args>]",
    "",
    "Commands:",
    "  init [<dir>]                 Initialize an empty repository",
    "  clone <repository> [<dir>]   Clone a repository from a remote",
    "  status                       Show working tree status",
    "  add <file>...                Stage changes (or 'add .')",
    "  commit -m \"<message>\"        Create a commit from the staging area",
    "  log                          Show commit history",
    "  branch [<name>]              List branches or create one",
    "  checkout <name>              Switch to an existing branch",
    "  diff [<base> <head>]         Show line-level differences",
    "  merge <branch>               Fast-forward merge into the current branch",
    "  revert <commit>              Add a new commit that reverses another",
    "  remote [add <name> <url>]    List or add remote locations",
    "  push [<remote>] [<branch>]   Push the branch to a remote",
    "  pull [<remote>] [<branch>]   Pull a branch from a remote",
    "",
    "Run 'ch <command> -h' support is handled per command; use 'ch --help'."
].join("\n");

const parseCommitArgs = (tokens) => {
    const positional = [];
    let message = null;

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];

        if (token === "-m") {
            message = tokens[i + 1] || "";
            i += 1;
        } else if (token.startsWith("-m=")) {
            message = token.slice(3);
        } else if (token.startsWith("-m") && token.length > 2) {
            message = token.slice(2);
        } else {
            positional.push(token);
        }
    }

    return { positional, message };
};

const main = async (args, cwd = process.cwd()) => {
    if (args.length === 0 || args[0] === "-h" || args[0] === "--help" || args[0] === "help") {
        return HELP + "\n";
    }

    const command = args[0];

    if (!(command in commands)) {
        throw fatal(`unknown command '${command}'`);
    }

    const rest = args.slice(1);
    const parsed = command === "commit"
        ? parseCommitArgs(rest)
        : { positional: rest, message: null };

    const output = await commands[command](parsed, cwd);

    if (output && output.length > 0) {
        return (output.endsWith("\n") ? output : `${output}\n`);
    }

    return "";
};

const run = async () => {
    try {
        process.stdout.write(await main(process.argv.slice(2)));
        process.exitCode = 0;
    } catch (error) {
        const message = error && error.message
            ? error.message
            : "unknown error";
        process.stderr.write(`fatal: ${message}\n`);
        process.exitCode = 1;
    }
};

const isEntrypoint = () => {
    const entry = process.argv[1];

    if (!entry) {
        return false;
    }

    try {
        return import.meta.url === url.pathToFileURL(fs.realpathSync(entry)).href;
    } catch {
        return false;
    }
};

export { main, run };

if (isEntrypoint()) {
    run();
}