"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runChecks = runChecks;
exports.formatResults = formatResults;
const fs_1 = require("fs");
const path_1 = require("path");
const module_1 = require("module");
function readPkg(dir) {
    const p = (0, path_1.join)(dir, "package.json");
    if (!(0, fs_1.existsSync)(p))
        return null;
    try {
        return JSON.parse((0, fs_1.readFileSync)(p, "utf8"));
    }
    catch {
        return null;
    }
}
function resolveEntry(dir, entry) {
    const full = (0, path_1.join)(dir, entry);
    if ((0, fs_1.existsSync)(full))
        return full;
    const candidates = [full, full + ".js", full + ".ts", full + "/index.js", full + "/index.ts"];
    for (const c of candidates) {
        if ((0, fs_1.existsSync)(c))
            return c;
    }
    return null;
}
// --- Checks ---
function checkPackageJsonExists(dir) {
    if ((0, fs_1.existsSync)((0, path_1.join)(dir, "package.json"))) {
        return { name: "package.json exists", passed: true, message: "found", severity: "error" };
    }
    return {
        name: "package.json exists",
        passed: false,
        message: "no package.json found",
        severity: "error",
        fix: "run `npm init -y`",
    };
}
function checkName(pkg) {
    if (!pkg || !pkg.name) {
        return { name: "name", passed: false, message: "missing name field", severity: "error", fix: "add \"name\" to package.json" };
    }
    if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(pkg.name)) {
        return { name: "name", passed: false, message: `invalid name: "${pkg.name}"`, severity: "error", fix: "use lowercase, no spaces, hyphens ok" };
    }
    return { name: "name", passed: true, message: pkg.name, severity: "error" };
}
function checkVersion(pkg) {
    if (!pkg || !pkg.version) {
        return { name: "version", passed: false, message: "missing version", severity: "error", fix: "add \"version\": \"1.0.0\"" };
    }
    const semver = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
    if (!semver.test(pkg.version)) {
        return { name: "version", passed: false, message: `invalid semver: "${pkg.version}"`, severity: "error" };
    }
    if (pkg.version === "0.0.0") {
        return { name: "version", passed: true, message: "0.0.0 — are you sure?", severity: "warning" };
    }
    return { name: "version", passed: true, message: pkg.version, severity: "error" };
}
function checkDescription(pkg) {
    if (!pkg || !pkg.description) {
        return { name: "description", passed: false, message: "missing — npm search won't help people find this", severity: "warning", fix: "add a short description" };
    }
    if (pkg.description.length < 10) {
        return { name: "description", passed: false, message: `too short (${pkg.description.length} chars)`, severity: "warning" };
    }
    return { name: "description", passed: true, message: `${pkg.description.length} chars`, severity: "warning" };
}
function checkLicense(pkg) {
    if (!pkg || !pkg.license) {
        return { name: "license", passed: false, message: "missing — some orgs can't use unlicensed packages", severity: "warning", fix: "add \"license\": \"MIT\"" };
    }
    return { name: "license", passed: true, message: pkg.license, severity: "warning" };
}
function checkRepository(pkg) {
    if (!pkg || !pkg.repository) {
        return { name: "repository", passed: false, message: "missing — people won't know where to report issues", severity: "warning", fix: "add repository URL" };
    }
    return { name: "repository", passed: true, message: typeof pkg.repository === "string" ? pkg.repository : pkg.repository.url || "ok", severity: "info" };
}
function checkKeywords(pkg) {
    if (!pkg || !pkg.keywords || pkg.keywords.length === 0) {
        return { name: "keywords", passed: false, message: "none — helps npm search discoverability", severity: "info", fix: "add relevant keywords" };
    }
    return { name: "keywords", passed: true, message: `${pkg.keywords.length} keywords`, severity: "info" };
}
function checkMainEntry(dir, pkg) {
    if (!pkg)
        return { name: "entry point", passed: false, message: "no package.json", severity: "error" };
    if (pkg.bin && !pkg.main) {
        return { name: "entry point", passed: true, message: "CLI-only (bin, no main)", severity: "info" };
    }
    const entry = pkg.main || pkg.exports?.["."] || "index.js";
    const entryStr = typeof entry === "string" ? entry : "index.js";
    const resolved = resolveEntry(dir, entryStr);
    if (resolved) {
        return { name: "entry point", passed: true, message: `${entryStr} → ${resolved}`, severity: "error" };
    }
    return {
        name: "entry point",
        passed: false,
        message: `${entryStr} not found`,
        severity: "error",
        fix: `create ${entryStr} or update "main" in package.json`,
    };
}
function checkBin(dir, pkg) {
    if (!pkg || !pkg.bin)
        return { name: "bin", passed: true, message: "no bin — not a CLI", severity: "info" };
    const bins = typeof pkg.bin === "string" ? { [pkg.name || "bin"]: pkg.bin } : pkg.bin;
    const missing = [];
    for (const [, target] of Object.entries(bins)) {
        if (!(0, fs_1.existsSync)((0, path_1.join)(dir, target)))
            missing.push(target);
    }
    if (missing.length > 0) {
        return { name: "bin", passed: false, message: `missing: ${missing.join(", ")}`, severity: "error", fix: "create the bin files or update package.json" };
    }
    return { name: "bin", passed: true, message: `${Object.keys(bins).length} bin${Object.keys(bins).length > 1 ? "s" : ""}`, severity: "info" };
}
function checkReadme(dir) {
    const names = ["README.md", "readme.md", "Readme.md", "README", "README.txt"];
    for (const n of names) {
        if ((0, fs_1.existsSync)((0, path_1.join)(dir, n))) {
            const stat = (0, fs_1.statSync)((0, path_1.join)(dir, n));
            if (stat.size < 50) {
                return { name: "README", passed: false, message: "exists but barely has content", severity: "warning", fix: "add usage examples, API docs" };
            }
            return { name: "README", passed: true, message: `${n} (${(stat.size / 1024).toFixed(1)}KB)`, severity: "warning" };
        }
    }
    return { name: "README", passed: false, message: "missing — the #1 thing people look at", severity: "warning", fix: "create README.md with usage, install, examples" };
}
function checkBuildScript(pkg) {
    if (!pkg || !pkg.scripts) {
        return { name: "build script", passed: false, message: "no scripts at all", severity: "warning", fix: "add a \"build\" script" };
    }
    if (pkg.scripts.build) {
        return { name: "build script", passed: true, message: pkg.scripts.build, severity: "info" };
    }
    if (pkg.main && (0, path_1.extname)(pkg.main) === ".ts") {
        return { name: "build script", passed: false, message: "main is .ts but no build script", severity: "warning", fix: "add a \"build\" script (tsup, tsc, etc)" };
    }
    return { name: "build script", passed: true, message: "not needed (no compilation)", severity: "info" };
}
function checkPrepublishOnly(pkg) {
    if (!pkg || !pkg.scripts)
        return { name: "prepublishOnly", passed: true, message: "no scripts", severity: "info" };
    if (pkg.scripts.prepublishOnly || pkg.scripts.prepublish || pkg.scripts.prepare) {
        return { name: "prepublishOnly", passed: true, message: "found", severity: "info" };
    }
    return { name: "prepublishOnly", passed: false, message: "missing — build might not run before publish", severity: "warning", fix: "add \"prepublishOnly\": \"npm run build\"" };
}
function checkFilesField(pkg) {
    if (!pkg || !pkg.files) {
        return { name: "files", passed: false, message: "missing — everything gets published (src, tests, configs)", severity: "warning", fix: "add \"files\": [\"dist\"] to limit what gets published" };
    }
    return { name: "files", passed: true, message: `${pkg.files.length} entries: ${pkg.files.join(", ")}`, severity: "info" };
}
function checkPrivate(pkg) {
    if (!pkg)
        return { name: "private", passed: false, message: "no package.json", severity: "error" };
    if (pkg.private === true) {
        return { name: "private", passed: false, message: "set to true — npm publish will be blocked", severity: "error", fix: "remove \"private\": true or set to false" };
    }
    return { name: "private", passed: true, message: "not private", severity: "error" };
}
function checkDeps(pkg) {
    if (!pkg)
        return { name: "dependencies", passed: false, message: "no package.json", severity: "error" };
    const all = { ...pkg.dependencies, ...pkg.peerDependencies };
    const deps = Object.entries(all);
    if (deps.length === 0)
        return { name: "dependencies", passed: true, message: "zero deps 👌", severity: "info" };
    const issues = [];
    for (const [name, version] of deps) {
        if (!version) {
            issues.push(`${name}: no version`);
            continue;
        }
        if (version === "*" || version === "latest") {
            issues.push(`${name}: "${version}" — pin this!`);
        }
    }
    if (issues.length > 0) {
        return { name: "dependencies", passed: false, message: issues.join("; "), severity: "warning", fix: "pin versions or use caret ranges" };
    }
    return { name: "dependencies", passed: true, message: `${deps.length} deps, all pinned`, severity: "info" };
}
function checkNodeModules(dir) {
    if ((0, fs_1.existsSync)((0, path_1.join)(dir, "node_modules"))) {
        return { name: "node_modules", passed: false, message: "exists — make sure .npmignore excludes it", severity: "warning", fix: "add node_modules to .npmignore or use \"files\" field" };
    }
    return { name: "node_modules", passed: true, message: "clean", severity: "info" };
}
function checkNpmignore(dir, pkg) {
    if ((0, fs_1.existsSync)((0, path_1.join)(dir, ".npmignore"))) {
        return { name: ".npmignore", passed: true, message: "exists", severity: "info" };
    }
    if (pkg?.files) {
        return { name: ".npmignore", passed: true, message: "using \"files\" field instead", severity: "info" };
    }
    return { name: ".npmignore", passed: false, message: "no .npmignore or \"files\" — npm defaults apply (may include too much)", severity: "info", fix: "add .npmignore or \"files\" field" };
}
function checkGitignore(dir) {
    if ((0, fs_1.existsSync)((0, path_1.join)(dir, ".gitignore"))) {
        return { name: ".gitignore", passed: true, message: "exists", severity: "info" };
    }
    return { name: ".gitignore", passed: false, message: "missing", severity: "info", fix: "create .gitignore with node_modules, dist, etc" };
}
function checkDuplicateDeps(pkg) {
    if (!pkg)
        return { name: "duplicate deps", passed: true, message: "n/a", severity: "info" };
    const prod = Object.keys(pkg.dependencies || {});
    const dev = Object.keys(pkg.devDependencies || {});
    const peer = Object.keys(pkg.peerDependencies || {});
    const dupes = prod.filter((d) => peer.includes(d));
    if (dupes.length > 0) {
        return { name: "duplicate deps", passed: false, message: `${dupes.join(", ")} in both deps and peerDeps`, severity: "warning", fix: "pick one: dependencies or peerDependencies" };
    }
    return { name: "duplicate deps", passed: true, message: "clean", severity: "info" };
}
function checkTypes(dir, pkg) {
    if (!pkg)
        return { name: "types", passed: true, message: "n/a", severity: "info" };
    const hasDist = (0, fs_1.existsSync)((0, path_1.join)(dir, "dist"));
    if (!hasDist && !pkg.main?.includes(".ts"))
        return { name: "types", passed: true, message: "not a TS project", severity: "info" };
    if (pkg.types || pkg.typings) {
        return { name: "types", passed: true, message: pkg.types || pkg.typings || "", severity: "info" };
    }
    if (hasDist && (0, fs_1.existsSync)((0, path_1.join)(dir, "dist", "index.d.ts"))) {
        return { name: "types", passed: true, message: "dist/index.d.ts exists but not declared in package.json", severity: "warning", fix: "add \"types\": \"dist/index.d.ts\"" };
    }
    return { name: "types", passed: false, message: "TypeScript project but no types/typings field", severity: "warning", fix: "add \"types\": \"dist/index.d.ts\" to package.json" };
}
function checkEngineNode(pkg) {
    if (!pkg || !pkg.engines?.node) {
        return { name: "engines.node", passed: true, message: "not specified (works on any node)", severity: "info" };
    }
    return { name: "engines.node", passed: true, message: pkg.engines.node, severity: "info" };
}
function checkAuthor(pkg) {
    if (!pkg || !pkg.author) {
        return { name: "author", passed: false, message: "missing — people want to know who made this", severity: "warning", fix: "add an author field" };
    }
    const authorName = typeof pkg.author === "string" ? pkg.author : pkg.author.name || "unknown";
    return { name: "author", passed: true, message: authorName, severity: "info" };
}
function checkHomepage(pkg) {
    if (!pkg || !pkg.homepage) {
        return { name: "homepage", passed: false, message: "missing — project website helps with discoverability", severity: "info", fix: "add a homepage URL" };
    }
    return { name: "homepage", passed: true, message: pkg.homepage, severity: "info" };
}
function checkBugsUrl(pkg) {
    if (!pkg || !pkg.bugs) {
        return { name: "bugs", passed: false, message: "missing — people can't report issues", severity: "warning", fix: "add a bugs URL" };
    }
    const bugsUrl = typeof pkg.bugs === "string" ? pkg.bugs : pkg.bugs.url || "missing";
    return { name: "bugs", passed: true, message: bugsUrl, severity: "info" };
}
function checkDistFiles(dir, pkg) {
    if (!pkg || !pkg.main || !pkg.main.includes(".js")) {
        return { name: "dist files", passed: true, message: "not applicable (no JS compilation)", severity: "info" };
    }
    const distDir = "dist";
    if (!(0, fs_1.existsSync)((0, path_1.join)(dir, distDir))) {
        return { name: "dist files", passed: false, message: "no dist/ directory found", severity: "warning", fix: "run build script before publishing" };
    }
    const files = ["index.js", "index.d.ts"];
    const missing = [];
    for (const file of files) {
        if (!(0, fs_1.existsSync)((0, path_1.join)(dir, distDir, file))) {
            missing.push(file);
        }
    }
    if (missing.length > 0) {
        return { name: "dist files", passed: false, message: `missing: ${missing.join(", ")}`, severity: "warning", fix: "ensure build script generates all files" };
    }
    return { name: "dist files", passed: true, message: "all compiled files present", severity: "info" };
}
function checkVulnerabilities(pkg) {
    if (!pkg)
        return { name: "vulnerabilities", passed: true, message: "n/a", severity: "info" };
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    const depCount = Object.keys(allDeps).length;
    if (depCount === 0) {
        return { name: "vulnerabilities", passed: true, message: "no dependencies — zero risk", severity: "info" };
    }
    // In a real implementation, this would check npm audit
    // For now, just a basic check for very old or deprecated packages
    const suspectPackages = ["left-pad", "isarray", "object-assign"];
    const foundSuspects = Object.keys(allDeps).filter(name => suspectPackages.includes(name));
    if (foundSuspects.length > 0) {
        return { name: "vulnerabilities", passed: false, message: `suspect packages: ${foundSuspects.join(", ")}`, severity: "warning", fix: "replace with maintained alternatives" };
    }
    return { name: "vulnerabilities", passed: true, message: `${depCount} dependencies — consider running npm audit`, severity: "info" };
}
// --- Main runner ---
function runChecks(options = {}) {
    const dir = options.pkgPath || process.cwd();
    const pkg = readPkg(dir);
    const checks = [
        checkPackageJsonExists(dir),
        checkPrivate(pkg),
        checkName(pkg),
        checkVersion(pkg),
        checkDescription(pkg),
        checkMainEntry(dir, pkg),
        checkBin(dir, pkg),
        checkBuildScript(pkg),
        checkPrepublishOnly(pkg),
        checkLicense(pkg),
        checkRepository(pkg),
        checkKeywords(pkg),
        checkFilesField(pkg),
        checkReadme(dir),
        checkNpmignore(dir, pkg),
        checkGitignore(dir),
        checkDeps(pkg),
        checkDuplicateDeps(pkg),
        checkTypes(dir, pkg),
        checkNodeModules(dir),
        checkEngineNode(pkg),
        checkAuthor(pkg),
        checkHomepage(pkg),
        checkBugsUrl(pkg),
        checkDistFiles(dir, pkg),
        checkVulnerabilities(pkg),
    ];
    return checks;
}
function formatResults(results, options = {}) {
    const lines = [];
    const errors = results.filter((r) => !r.passed && r.severity === "error");
    const warnings = results.filter((r) => !r.passed && r.severity === "warning");
    const passed = results.filter((r) => r.passed);
    const infoFails = results.filter((r) => !r.passed && r.severity === "info");
    for (const r of results) {
        const icon = r.passed ? "✓" : r.severity === "error" ? "✗" : r.severity === "warning" ? "⚠" : "ℹ";
        const line = `${icon} ${r.name}: ${r.message}`;
        lines.push(line);
        if (!r.passed && r.fix) {
            lines.push(`  → ${r.fix}`);
        }
    }
    lines.push("");
    lines.push(`Summary: ${passed.length} passed, ${errors.length} errors, ${warnings.length} warnings`);
    if (errors.length > 0) {
        lines.push(`\n🚫 Not ready to publish — fix ${errors.length} error${errors.length > 1 ? "s" : ""} first`);
    }
    else if (warnings.length > 0) {
        lines.push(`\n⚡ Publishable, but ${warnings.length} warning${warnings.length > 1 ? "s" : ""} to consider`);
    }
    else {
        lines.push("\n🚢 Ready to publish!");
    }
    return lines.join("\n");
}
//# sourceMappingURL=index.js.map