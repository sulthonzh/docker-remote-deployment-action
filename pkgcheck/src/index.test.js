"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs_1 = require("fs");
const path_1 = require("path");
const index_js_1 = require("./index.js");
const tmp = (0, path_1.join)(process.cwd(), ".tmp-test-pkgcheck");
function setup(pkg, extra) {
    if ((0, fs_1.existsSync)(tmp))
        (0, fs_1.rmSync)(tmp, { recursive: true });
    (0, fs_1.mkdirSync)(tmp, { recursive: true });
    (0, fs_1.writeFileSync)((0, path_1.join)(tmp, "package.json"), JSON.stringify(pkg, null, 2));
    if (extra) {
        for (const [name, content] of Object.entries(extra)) {
            const filePath = (0, path_1.join)(tmp, name);
            const dir = filePath.substring(0, filePath.lastIndexOf("/"));
            if (!(0, fs_1.existsSync)(dir))
                (0, fs_1.mkdirSync)(dir, { recursive: true });
            (0, fs_1.writeFileSync)(filePath, content);
        }
    }
}
function cleanup() {
    if ((0, fs_1.existsSync)(tmp))
        (0, fs_1.rmSync)(tmp, { recursive: true });
}
(0, vitest_1.describe)("pkgcheck", () => {
    (0, vitest_1.afterAll)(cleanup);
    (0, vitest_1.it)("detects missing package.json", () => {
        if ((0, fs_1.existsSync)(tmp))
            (0, fs_1.rmSync)(tmp, { recursive: true });
        (0, fs_1.mkdirSync)(tmp, { recursive: true });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const existsCheck = results.find((r) => r.name === "package.json exists");
        (0, vitest_1.expect)(existsCheck.passed).toBe(false);
    });
    (0, vitest_1.it)("passes a well-configured package", () => {
        setup({
            name: "my-cool-pkg",
            version: "1.2.3",
            description: "A very cool package for doing cool things",
            main: "dist/index.js",
            license: "MIT",
            repository: { type: "git", url: "https://github.com/example/pkg" },
            keywords: ["cool", "package"],
            files: ["dist"],
            scripts: { build: "tsup src/index.ts", prepublishOnly: "npm run build" },
        }, { "README.md": "# my-cool-pkg\n\nA cool thing. Install, use, enjoy.", ".gitignore": "node_modules\n", "dist/index.js": "export {};" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const errors = results.filter((r) => !r.passed && r.severity === "error");
        (0, vitest_1.expect)(errors.length).toBe(0);
    });
    (0, vitest_1.it)("catches invalid name", () => {
        setup({ name: "INVALID NAME", version: "1.0.0" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const nameCheck = results.find((r) => r.name === "name");
        (0, vitest_1.expect)(nameCheck.passed).toBe(false);
    });
    (0, vitest_1.it)("catches bad semver", () => {
        setup({ name: "pkg", version: "abc" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const versionCheck = results.find((r) => r.name === "version");
        (0, vitest_1.expect)(versionCheck.passed).toBe(false);
    });
    (0, vitest_1.it)("warns on missing description", () => {
        setup({ name: "pkg", version: "1.0.0" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const descCheck = results.find((r) => r.name === "description");
        (0, vitest_1.expect)(descCheck.passed).toBe(false);
        (0, vitest_1.expect)(descCheck.severity).toBe("warning");
    });
    (0, vitest_1.it)("warns on missing README", () => {
        setup({ name: "pkg", version: "1.0.0" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const readme = results.find((r) => r.name === "README");
        (0, vitest_1.expect)(readme.passed).toBe(false);
    });
    (0, vitest_1.it)("catches private: true", () => {
        setup({ name: "pkg", version: "1.0.0", private: true });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const priv = results.find((r) => r.name === "private");
        (0, vitest_1.expect)(priv.passed).toBe(false);
        (0, vitest_1.expect)(priv.severity).toBe("error");
    });
    (0, vitest_1.it)("catches wildcard dependency versions", () => {
        setup({ name: "pkg", version: "1.0.0", dependencies: { lodash: "*" } });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const deps = results.find((r) => r.name === "dependencies");
        (0, vitest_1.expect)(deps.passed).toBe(false);
        (0, vitest_1.expect)(deps.message).toContain("pin this");
    });
    (0, vitest_1.it)("detects duplicate deps across deps and peerDeps", () => {
        setup({
            name: "pkg",
            version: "1.0.0",
            dependencies: { react: "^18.0.0" },
            peerDependencies: { react: "^18.0.0" },
        });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const dupes = results.find((r) => r.name === "duplicate deps");
        (0, vitest_1.expect)(dupes.passed).toBe(false);
        (0, vitest_1.expect)(dupes.message).toContain("react");
    });
    (0, vitest_1.it)("detects missing entry point", () => {
        setup({ name: "pkg", version: "1.0.0", main: "dist/index.js" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const entry = results.find((r) => r.name === "entry point");
        (0, vitest_1.expect)(entry.passed).toBe(false);
    });
    (0, vitest_1.it)("detects missing bin file", () => {
        setup({ name: "pkg", version: "1.0.0", bin: { pkg: "./cli.js" } });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const bin = results.find((r) => r.name === "bin");
        (0, vitest_1.expect)(bin.passed).toBe(false);
    });
    (0, vitest_1.it)("warns about 0.0.0 version", () => {
        setup({ name: "pkg", version: "0.0.0" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const ver = results.find((r) => r.name === "version");
        (0, vitest_1.expect)(ver.severity).toBe("warning");
    });
    (0, vitest_1.it)("formatResults produces output", () => {
        setup({ name: "pkg", version: "1.0.0" });
        const results = (0, index_js_1.runChecks)({ pkgPath: tmp });
        const output = (0, index_js_1.formatResults)(results);
        (0, vitest_1.expect)(output).toContain("Summary:");
        (0, vitest_1.expect)(output.length).toBeGreaterThan(50);
    });
});
//# sourceMappingURL=index.test.js.map