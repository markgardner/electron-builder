"use strict";

const asar_1 = require("asar");
const util_1 = require("./util");
const glob_1 = require("glob");
const fs_extra_p_1 = require("fs-extra-p");
const bluebird_1 = require("bluebird");
const path = require("path");
//noinspection JSUnusedLocalSymbols
const __awaiter = require("./awaiter");
function createAsarArchive(src, resourcesPath, options) {
    return __awaiter(this, void 0, void 0, function* () {
        // dot: true as in the asar by default by we use glob default - do not copy hidden files
        let glob = null;
        const files = (yield new bluebird_1.Promise((resolve, reject) => {
            glob = new glob_1.Glob("**/*", {
                cwd: src,
                dot: options.dot
            }, (error, matches) => {
                if (error == null) {
                    resolve(matches);
                } else {
                    reject(error);
                }
            });
        })).map(it => path.join(src, it));
        const metadata = {};
        // https://github.com/electron-userland/electron-builder/issues/482#issuecomment-225100630
        const stats = yield bluebird_1.Promise.map(files, it => {
            const systemIndependentPath = process.platform === "win32" ? it.replace(/\\/g, "/") : it;
            if (glob.symlinks[systemIndependentPath]) {
                // asar doesn't use stat for link
                metadata[it] = {
                    type: "link"
                };
                return null;
            }
            const cachedType = glob.cache[systemIndependentPath];
            if (cachedType == null || cachedType === "FILE") {
                const stat = glob.statCache[systemIndependentPath];
                return stat == null ? fs_extra_p_1.lstat(it) : stat;
            } else {
                // asar doesn't use stat for dir
                metadata[it] = {
                    type: "directory"
                };
            }
            return null;
        });
        for (let i = 0, n = files.length; i < n; i++) {
            const stat = stats[i];
            if (stat != null) {
                metadata[files[i]] = {
                    type: stat.isFile() ? "file" : stat.isDirectory() ? "directory" : "link",
                    stat: stat
                };
            }
        }
        yield bluebird_1.Promise.promisify(asar_1.createPackageFromFiles)(src, path.join(resourcesPath, "app.asar"), files, metadata, options);
        yield fs_extra_p_1.remove(src);
    });
}
exports.createAsarArchive = createAsarArchive;
function checkFileInPackage(asarFile, relativeFile) {
    return __awaiter(this, void 0, void 0, function* () {
        let stat;
        try {
            stat = asar_1.statFile(asarFile, relativeFile);
        } catch (e) {
            const fileStat = yield util_1.statOrNull(asarFile);
            if (fileStat == null) {
                throw new Error(`File "${ asarFile }" does not exist. Seems like a wrong configuration.`);
            }
            try {
                asar_1.listPackage(asarFile);
            } catch (e) {
                throw new Error(`File "${ asarFile }" is corrupted: ${ e }`);
            }
            // asar throws error on access to undefined object (info.link)
            stat = null;
        }
        if (stat == null) {
            throw new Error(`Application entry file "${ relativeFile }" in the "${ asarFile }" does not exist. Seems like a wrong configuration.`);
        }
        if (stat.size === 0) {
            throw new Error(`Application entry file "${ relativeFile }" in the "${ asarFile }" is corrupted: size 0`);
        }
    });
}
exports.checkFileInPackage = checkFileInPackage;
//# sourceMappingURL=asarUtil.js.map