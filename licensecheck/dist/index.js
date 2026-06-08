"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = scan;
exports.checkPolicy = checkPolicy;
exports.formatTable = formatTable;
exports.formatViolations = formatViolations;
exports.formatJson = formatJson;
exports.formatMarkdown = formatMarkdown;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
// ─── License classification ──────────────────────────────────────────
const LICENSE_MAP = {
    MIT: "permissive",
    "MIT License": "permissive",
    X11: "permissive",
    ISC: "permissive",
    "ISC License": "permissive",
    "Apache-2.0": "permissive",
    "Apache License 2.0": "permissive",
    "Apache License, Version 2.0": "permissive",
    BSD3: "permissive",
    "BSD-3-Clause": "permissive",
    "BSD 3-Clause": "permissive",
    "New BSD License": "permissive",
    "BSD-2-Clause": "permissive",
    "BSD 2-Clause": "permissive",
    "Simplified BSD": "permissive",
    "0BSD": "permissive",
    Artistic: "permissive",
    "Artistic-2.0": "permissive",
    PSF: "permissive",
    "Python-2.0": "permissive",
    Unlicense: "publicDomain",
    CC0: "publicDomain",
    "CC0-1.0": "publicDomain",
    WTFPL: "publicDomain",
    GPL: "copyleft",
    "GPL-2.0": "copyleft",
    "GPL-3.0": "copyleft",
    "GPL-2.0-only": "copyleft",
    "GPL-3.0-only": "copyleft",
    "GPL-2.0-or-later": "copyleft",
    "GPL-3.0-or-later": "copyleft",
    AGPL: "copyleft",
    "AGPL-3.0": "copyleft",
    "AGPL-3.0-only": "copyleft",
    "AGPL-3.0-or-later": "copyleft",
    LGPL: "weakCopyleft",
    "LGPL-2.0": "weakCopyleft",
    "LGPL-2.1": "weakCopyleft",
    "LGPL-3.0": "weakCopyleft",
    MPL: "weakCopyleft",
    "MPL-2.0": "weakCopyleft",
    EPL: "weakCopyleft",
    "EPL-1.0": "weakCopyleft",
    "EPL-2.0": "weakCopyleft",
    CDDL: "weakCopyleft",
    "CDDL-1.0": "weakCopyleft",
    "CDDL-1.1": "weakCopyleft",
    MSPL: "weakCopyleft",
    "MS-PL": "weakCopyleft",
    "SSPL-1.0": "copyleft",
    "BSL-1.0": "weakCopyleft",
    "BUSL-1.1": "proprietary",
    "CC-BY-4.0": "permissive",
    "CC-BY-SA-4.0": "weakCopyleft",
    "CC-BY-NC-4.0": "proprietary",
    "CC-BY-NC-SA-4.0": "proprietary",
    "CC-BY-NC-ND-4.0": "proprietary",
    PostgreSQL: "permissive",
    SQLite: "publicDomain",
    "Zlib": "permissive",
    "zlib-acknowledgement": "permissive",
};
function classifyLicense(license) {
    if (!license)
        return "unknown";
    const normalized = license.trim();
    if (LICENSE_MAP[normalized])
        return LICENSE_MAP[normalized];
    const lower = normalized.toLowerCase();
    if (/^mit\b/i.test(lower))
        return "permissive";
    if (/^apache\b.*2/i.test(lower))
        return "permissive";
    if (/^bsd\b/i.test(lower))
        return "permissive";
    if (/^isc\b/i.test(lower))
        return "permissive";
    if (/\bgpl\b/i.test(lower))
        return "copyleft";
    if (/\bagpl\b/i.test(lower))
        return "copyleft";
    if (/\bsspl\b/i.test(lower))
        return "copyleft";
    if (/\blgpl\b/i.test(lower))
        return "weakCopyleft";
    if (/\bmpl\b/i.test(lower))
        return "weakCopyleft";
    if (/\bepl\b/i.test(lower))
        return "weakCopyleft";
    if (/\bcddl\b/i.test(lower))
        return "weakCopyleft";
    if (/\bnc\b/i.test(lower) || /\bnd\b/i.test(lower) || /proprietary/i.test(lower) || /commercial/i.test(lower))
        return "proprietary";
    if (/public\s*domain/i.test(lower) || /\bpd\b/i.test(lower) || /\bunlicense\b/i.test(lower))
        return "publicDomain";
    return "unknown";
}
// ─── Core scanning ───────────────────────────────────────────────────
function resolveLicenseFile(pkgPath) {
    const candidates = [
        "LICENSE", "LICENSE.md", "LICENSE.txt", "LICENSE.MIT",
        "LICENCE", "LICENCE.md", "LICENCE.txt",
        "COPYING", "COPYING.md",
        "license", "licence",
    ];
    for (const f of candidates) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(pkgPath, f)))
            return f;
    }
    return null;
}
function detectLicenseFromFile(pkgPath, file) {
    try {
        const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(pkgPath, file), "utf-8").slice(0, 2000).toLowerCase();
        if (content.includes("permission is hereby granted, free of charge"))
            return "MIT";
        if (content.includes("apache license") && content.includes("version 2.0"))
            return "Apache-2.0";
        if (content.includes("redistribution and use in source and binary")) {
            if (content.includes("may be used to endorse"))
                return "BSD-3-Clause";
            return "BSD-2-Clause";
        }
        if (content.includes("isc license") || content.includes("isc license"))
            return "ISC";
        if (content.includes("gnu general public license"))
            return "GPL";
        if (content.includes("gnu lesser general public license"))
            return "LGPL";
        if (content.includes("gnu affero general public license"))
            return "AGPL";
        if (content.includes("mozilla public license"))
            return "MPL-2.0";
        if (content.includes("this is free and unencumbered software released into the public domain"))
            return "Unlicense";
    }
    catch { /* ignore */ }
    return null;
}
function scan(cwd) {
    const dir = cwd ?? process.cwd();
    let npmOutput;
    try {
        npmOutput = (0, node_child_process_1.execSync)("npm ls --json --all --long 2>/dev/null", {
            cwd: dir,
            encoding: "utf-8",
            maxBuffer: 50 * 1024 * 1024,
            timeout: 30000,
        });
    }
    catch (err) {
        npmOutput = err.stdout ?? "";
    }
    if (!npmOutput.trim()) {
        return { entries: [], stats: { total: 0, licensed: 0, unlicensed: 0 }, categories: {}, violations: [] };
    }
    let tree;
    try {
        tree = JSON.parse(npmOutput);
    }
    catch {
        return { entries: [], stats: { total: 0, licensed: 0, unlicensed: 0 }, categories: {}, violations: [] };
    }
    const entries = [];
    const seen = new Set();
    function walkDeps(deps, parentPath) {
        for (const [name, info] of Object.entries(deps)) {
            const key = `${name}@${info.version}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const pkgPath = info.path || (info.resolved ? (0, node_path_1.join)(dir, "node_modules", name) : "");
            let license = info.license ?? null;
            const licenseFile = pkgPath ? resolveLicenseFile(pkgPath) : null;
            // Try package.json license field
            if (!license && pkgPath) {
                try {
                    const pkgJson = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(pkgPath, "package.json"), "utf-8"));
                    license = pkgJson.license ?? pkgJson.licenses?.[0]?.type ?? null;
                }
                catch { /* ignore */ }
            }
            // Fall back to license file detection
            if (!license && pkgPath && licenseFile) {
                license = detectLicenseFromFile(pkgPath, licenseFile);
            }
            let repository = null;
            if (info.repository) {
                repository = typeof info.repository === "string" ? info.repository : info.repository.url ?? null;
            }
            entries.push({
                name,
                version: info.version ?? "unknown",
                license,
                licenseFile,
                repository,
                path: pkgPath,
            });
            if (info.dependencies)
                walkDeps(info.dependencies, pkgPath);
        }
    }
    // Root package
    if (tree.name && tree.version) {
        let rootLicense = tree.license ?? null;
        if (!rootLicense) {
            try {
                const pkgJson = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(dir, "package.json"), "utf-8"));
                rootLicense = pkgJson.license ?? null;
            }
            catch { /* ignore */ }
        }
        entries.push({
            name: tree.name,
            version: tree.version,
            license: rootLicense,
            licenseFile: resolveLicenseFile(dir),
            repository: typeof tree.repository === "string" ? tree.repository : tree.repository?.url ?? null,
            path: dir,
        });
    }
    if (tree.dependencies)
        walkDeps(tree.dependencies);
    // Categorize
    const categories = {
        permissive: [],
        copyleft: [],
        weakCopyleft: [],
        proprietary: [],
        publicDomain: [],
        unknown: [],
    };
    for (const entry of entries) {
        const cat = classifyLicense(entry.license);
        categories[cat].push(entry);
    }
    const licensed = entries.filter((e) => e.license !== null).length;
    return {
        entries,
        stats: { total: entries.length, licensed, unlicensed: entries.length - licensed },
        categories,
        violations: [],
    };
}
// ─── Policy check ────────────────────────────────────────────────────
function checkPolicy(result, policy) {
    const violations = [];
    const { allow = [], deny = [], warn = [] } = policy;
    const denySet = new Set(deny.map((s) => s.toLowerCase()));
    const allowSet = new Set(allow.map((s) => s.toLowerCase()));
    const warnSet = new Set(warn.map((s) => s.toLowerCase()));
    for (const entry of result.entries) {
        const lic = (entry.license ?? "UNLICENSED").toLowerCase();
        if (lic === "unlicensed" || !entry.license) {
            violations.push({
                package: entry.name,
                version: entry.version,
                license: entry.license,
                severity: "warning",
                reason: "No license found — treat as all rights reserved",
            });
            continue;
        }
        // Check deny list
        if (denySet.size > 0) {
            for (const denied of denySet) {
                if (lic.includes(denied) || denied.includes(lic)) {
                    violations.push({
                        package: entry.name,
                        version: entry.version,
                        license: entry.license,
                        severity: "error",
                        reason: `License '${entry.license}' is on the deny list`,
                    });
                    break;
                }
            }
            if (violations.find((v) => v.package === entry.name && v.severity === "error"))
                continue;
        }
        // Check allow list (if specified, license must be on it)
        if (allowSet.size > 0) {
            let allowed = false;
            for (const a of allowSet) {
                if (lic.includes(a) || a.includes(lic)) {
                    allowed = true;
                    break;
                }
            }
            if (!allowed) {
                violations.push({
                    package: entry.name,
                    version: entry.version,
                    license: entry.license,
                    severity: "error",
                    reason: `License '${entry.license}' is not on the allow list`,
                });
                continue;
            }
        }
        // Check warn list
        if (warnSet.size > 0) {
            for (const w of warnSet) {
                if (lic.includes(w) || w.includes(lic)) {
                    violations.push({
                        package: entry.name,
                        version: entry.version,
                        license: entry.license,
                        severity: "warning",
                        reason: `License '${entry.license}' is on the warning list`,
                    });
                    break;
                }
            }
        }
    }
    return violations;
}
// ─── Formatters ──────────────────────────────────────────────────────
function formatTable(result) {
    const lines = [];
    const maxName = Math.max(8, ...result.entries.map((e) => e.name.length));
    const maxVer = Math.max(7, ...result.entries.map((e) => e.version.length));
    const maxLic = Math.max(7, ...result.entries.map((e) => (e.license ?? "NONE").length));
    lines.push(`${"Package".padEnd(maxName)}  ${"Version".padEnd(maxVer)}  ${"License".padEnd(maxLic)}  Category`);
    lines.push(`${"─".repeat(maxName)}  ${"─".repeat(maxVer)}  ${"─".repeat(maxLic)}  ${"─".repeat(15)}`);
    for (const e of result.entries) {
        const cat = classifyLicense(e.license);
        lines.push(`${e.name.padEnd(maxName)}  ${e.version.padEnd(maxVer)}  ${(e.license ?? "NONE").padEnd(maxLic)}  ${cat}`);
    }
    lines.push("");
    lines.push(`Total: ${result.stats.total} packages | Licensed: ${result.stats.licensed} | Unlicensed: ${result.stats.unlicensed}`);
    // Category summary
    for (const [cat, items] of Object.entries(result.categories)) {
        if (items.length > 0)
            lines.push(`  ${cat}: ${items.length}`);
    }
    return lines.join("\n");
}
function formatViolations(violations) {
    if (violations.length === 0)
        return "✅ No license violations found.";
    const lines = [];
    const errors = violations.filter((v) => v.severity === "error");
    const warnings = violations.filter((v) => v.severity === "warning");
    if (errors.length > 0) {
        lines.push(`❌ ${errors.length} violation(s):`);
        for (const v of errors) {
            lines.push(`   ${v.package}@${v.version} (${v.license ?? "NONE"}): ${v.reason}`);
        }
    }
    if (warnings.length > 0) {
        lines.push(`⚠️  ${warnings.length} warning(s):`);
        for (const v of warnings) {
            lines.push(`   ${v.package}@${v.version} (${v.license ?? "NONE"}): ${v.reason}`);
        }
    }
    return lines.join("\n");
}
function formatJson(result, violations) {
    return JSON.stringify({
        stats: result.stats,
        categories: Object.fromEntries(Object.entries(result.categories).map(([k, v]) => [k, v.length])),
        entries: result.entries,
        violations: violations ?? [],
    }, null, 2);
}
function formatMarkdown(result, violations) {
    const lines = [];
    lines.push("# License Report\n");
    lines.push(`**Total packages:** ${result.stats.total} | **Licensed:** ${result.stats.licensed} | **Unlicensed:** ${result.stats.unlicensed}\n`);
    lines.push("## Category Summary\n");
    lines.push("| Category | Count |");
    lines.push("|----------|-------|");
    for (const [cat, items] of Object.entries(result.categories)) {
        if (items.length > 0)
            lines.push(`| ${cat} | ${items.length} |`);
    }
    lines.push("\n## Packages\n");
    lines.push("| Package | Version | License | Category |");
    lines.push("|---------|---------|---------|----------|");
    for (const e of result.entries) {
        const cat = classifyLicense(e.license);
        lines.push(`| ${e.name} | ${e.version} | ${e.license ?? "NONE"} | ${cat} |`);
    }
    if (violations && violations.length > 0) {
        lines.push("\n## Violations\n");
        for (const v of violations) {
            const icon = v.severity === "error" ? "❌" : "⚠️";
            lines.push(`- ${icon} **${v.package}@${v.version}** (${v.license ?? "NONE"}): ${v.reason}`);
        }
    }
    return lines.join("\n");
}
