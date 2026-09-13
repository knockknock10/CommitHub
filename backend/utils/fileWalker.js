import fs from "fs";
import path from "path";

const isPathWithin = (root, target) => {
    const realRoot = fs.realpathSync(root);
    const realTarget = fs.realpathSync(target);
    const relative = path.relative(realRoot, realTarget);

    return (
        !relative.startsWith("..") &&
        !path.isAbsolute(relative)
    );
};

const walkDir = (dir) => {
    let results = [];

    if (!dir) {
        return results;
    }

    try {
        if (!fs.existsSync(dir)) {
            return results;
        }
    } catch {
        return results;
    }

    const resolvedDir = fs.realpathSync(dir);

    let list;
    try {
        list = fs.readdirSync(resolvedDir);
    } catch {
        return results;
    }

    list.forEach((file) => {
        const filePath = path.join(resolvedDir, file);

        try {
            const stat = fs.statSync(filePath);
        } catch {
            return results;
        }

        if (stat && stat.isDirectory()) {
            const subResults = walkDir(filePath);
            results = results.concat(subResults.filter(r => isPathWithin(resolvedDir, path.join(resolvedDir, r))));
        } else {
            if (isPathWithin(resolvedDir, filePath)) {
                results.push(filePath);
            }
        }
    });

    return results;
};

export default walkDir;