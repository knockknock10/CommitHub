const fs = require("fs");
const path = require("path");

function walkDir(dir) {
    let results = [];

    const list = fs.readdirSync(dir);

    list.forEach(file => {

        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            results.push(filePath);
        }

    });

    return results;
}

module.exports = { walkDir };
