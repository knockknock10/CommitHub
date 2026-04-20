const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const COMMITHUB = path.join(ROOT, ".CommitHub");
const CONFIG_PATH = path.join(COMMITHUB, "config.json");

// Ensure repository exists
function validateRepo() {
    if (!fs.existsSync(COMMITHUB)) {
        throw new Error("Not a CommitHub repository");
    }
    if (!fs.existsSync(CONFIG_PATH)) {
        throw new Error("config.json missing");
    }
}

// Read config.json
function readConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

// Write config.json
function writeConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Add a new remote
function addRemoteRepo(name, url) {
    try {
        validateRepo();

        const config = readConfig();

        if (!config.remotes) {
            config.remotes = {};
        }

        if (config.remotes[name]) {
            console.log(`Remote "${name}" already exists.`);
            return;
        }

        config.remotes[name] = url;

        writeConfig(config);

        console.log(`Remote "${name}" added`);
    } catch (err) {
        console.log("Error:", err.message);
    }
}

// Remove a remote
function removeRemoteRepo(name) {
    try {
        validateRepo();

        const config = readConfig();

        if (!config.remotes || !config.remotes[name]) {
            console.log(`Remote "${name}" does not exist.`);
            return;
        }

        delete config.remotes[name];

        writeConfig(config);

        console.log(`Remote "${name}" removed`);
    } catch (err) {
        console.log("Error:", err.message);
    }
}

// List all remotes
function listRemotes() {
    try {
        validateRepo();

        const config = readConfig();

        if (!config.remotes || Object.keys(config.remotes).length === 0) {
            console.log("No remotes found");
            return;
        }

        for (const [name, url] of Object.entries(config.remotes)) {
            console.log(`${name}\t${url}`);
        }
    } catch (err) {
        console.log("Error:", err.message);
    }
}

module.exports = {
    addRemoteRepo,
    removeRemoteRepo,
    listRemotes
};