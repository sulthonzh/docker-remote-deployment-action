"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("./index.js");
// ─── classifyLicense via proxy ───────────────────────────────────────
function classifyFromCategory(entries, license) {
    // Use the fact that scan categorizes entries; we'll test classification indirectly
    // by creating a fake result and checking checkPolicy behavior
    return null; // placeholder
}
// ─── Helper: make a fake ScanResult ──────────────────────────────────
function makeResult(entries) {
    const categories = {
        permissive: [], copyleft: [], weakCopyleft: [], proprietary: [], publicDomain: [], unknown: [],
    };
    for (const e of entries) {
        const lic = e.license;
        let cat = "unknown";
        if (lic === "MIT" || lic === "Apache-2.0" || lic === "BSD-3-Clause" || lic === "ISC")
            cat = "permissive";
        else if (lic === "GPL-3.0" || lic === "AGPL-3.0" || lic === "SSPL-1.0")
            cat = "copyleft";
        else if (lic === "LGPL-3.0" || lic === "MPL-2.0" || lic === "EPL-2.0")
            cat = "weakCopyleft";
        else if (lic === "BUSL-1.1" || lic === "CC-BY-NC-4.0")
            cat = "proprietary";
        else if (lic === "Unlicense" || lic === "CC0-1.0")
            cat = "publicDomain";
        else if (!lic)
            cat = "unknown";
        categories[cat].push(e);
    }
    const licensed = entries.filter((e) => e.license !== null).length;
    return {
        entries,
        stats: { total: entries.length, licensed, unlicensed: entries.length - licensed },
        categories,
        violations: [],
    };
}
// ─── Tests ───────────────────────────────────────────────────────────
(0, node_test_1.describe)("licensecheck", () => {
    (0, node_test_1.it)("should return empty result when no packages found", () => {
        // scan in a dir without node_modules returns empty
        const result = (0, index_js_1.scan)("/tmp/nonexistent_" + Date.now());
        strict_1.default.equal(result.entries.length, 0);
        strict_1.default.equal(result.stats.total, 0);
    });
    (0, node_test_1.it)("should format table output", () => {
        const result = makeResult([
            { name: "express", version: "4.18.0", license: "MIT", licenseFile: "LICENSE", repository: "https://github.com/expressjs/express", path: "/tmp/express" },
            { name: "secret-pkg", version: "1.0.0", license: null, licenseFile: null, repository: null, path: "/tmp/secret" },
        ]);
        const table = (0, index_js_1.formatTable)(result);
        strict_1.default.ok(table.includes("express"));
        strict_1.default.ok(table.includes("MIT"));
        strict_1.default.ok(table.includes("NONE"));
        strict_1.default.ok(table.includes("Total: 2"));
        strict_1.default.ok(table.includes("Licensed: 1"));
        strict_1.default.ok(table.includes("Unlicensed: 1"));
    });
    (0, node_test_1.it)("should format JSON output", () => {
        const result = makeResult([
            { name: "lodash", version: "4.17.21", license: "MIT", licenseFile: "LICENSE", repository: null, path: "/tmp/lodash" },
        ]);
        const json = (0, index_js_1.formatJson)(result);
        const parsed = JSON.parse(json);
        strict_1.default.equal(parsed.stats.total, 1);
        strict_1.default.equal(parsed.entries[0].name, "lodash");
        strict_1.default.equal(parsed.entries[0].license, "MIT");
    });
    (0, node_test_1.it)("should format markdown output", () => {
        const result = makeResult([
            { name: "react", version: "18.0.0", license: "MIT", licenseFile: null, repository: null, path: "/tmp/react" },
        ]);
        const md = (0, index_js_1.formatMarkdown)(result);
        strict_1.default.ok(md.includes("# License Report"));
        strict_1.default.ok(md.includes("react"));
        strict_1.default.ok(md.includes("MIT"));
        strict_1.default.ok(md.includes("## Category Summary"));
        strict_1.default.ok(md.includes("## Packages"));
    });
    (0, node_test_1.it)("should detect deny list violations", () => {
        const result = makeResult([
            { name: "gpl-pkg", version: "1.0.0", license: "GPL-3.0", licenseFile: null, repository: null, path: "/tmp/gpl" },
            { name: "mit-pkg", version: "2.0.0", license: "MIT", licenseFile: null, repository: null, path: "/tmp/mit" },
        ]);
        const violations = (0, index_js_1.checkPolicy)(result, { allow: [], deny: ["GPL-3.0"], warn: [] });
        strict_1.default.equal(violations.length, 1);
        strict_1.default.equal(violations[0].package, "gpl-pkg");
        strict_1.default.equal(violations[0].severity, "error");
    });
    (0, node_test_1.it)("should detect allow list violations", () => {
        const result = makeResult([
            { name: "mit-pkg", version: "1.0.0", license: "MIT", licenseFile: null, repository: null, path: "/tmp/mit" },
            { name: "bsd-pkg", version: "1.0.0", license: "BSD-3-Clause", licenseFile: null, repository: null, path: "/tmp/bsd" },
        ]);
        const violations = (0, index_js_1.checkPolicy)(result, { allow: ["MIT"], deny: [], warn: [] });
        strict_1.default.equal(violations.length, 1);
        strict_1.default.equal(violations[0].package, "bsd-pkg");
        strict_1.default.equal(violations[0].severity, "error");
    });
    (0, node_test_1.it)("should detect warn list violations", () => {
        const result = makeResult([
            { name: "lgpl-pkg", version: "1.0.0", license: "LGPL-3.0", licenseFile: null, repository: null, path: "/tmp/lgpl" },
        ]);
        const violations = (0, index_js_1.checkPolicy)(result, { allow: [], deny: [], warn: ["LGPL"] });
        strict_1.default.equal(violations.length, 1);
        strict_1.default.equal(violations[0].severity, "warning");
    });
    (0, node_test_1.it)("should flag unlicensed packages", () => {
        const result = makeResult([
            { name: "no-license", version: "0.1.0", license: null, licenseFile: null, repository: null, path: "/tmp/nolic" },
        ]);
        const violations = (0, index_js_1.checkPolicy)(result, { allow: [], deny: [], warn: [] });
        strict_1.default.equal(violations.length, 1);
        strict_1.default.equal(violations[0].reason, "No license found — treat as all rights reserved");
    });
    (0, node_test_1.it)("should pass with no violations", () => {
        const result = makeResult([
            { name: "safe-pkg", version: "1.0.0", license: "MIT", licenseFile: null, repository: null, path: "/tmp/safe" },
        ]);
        const violations = (0, index_js_1.checkPolicy)(result, { allow: ["MIT"], deny: ["GPL"], warn: [] });
        strict_1.default.equal(violations.length, 0);
    });
    (0, node_test_1.it)("should format violations output", () => {
        const violations = [
            { package: "bad-pkg", version: "1.0.0", license: "GPL-3.0", severity: "error", reason: "denied" },
            { package: "iffy-pkg", version: "2.0.0", license: "LGPL-3.0", severity: "warning", reason: "on warn list" },
        ];
        const out = (0, index_js_1.formatViolations)(violations);
        strict_1.default.ok(out.includes("❌ 1 violation(s)"));
        strict_1.default.ok(out.includes("bad-pkg"));
        strict_1.default.ok(out.includes("⚠️  1 warning(s)"));
        strict_1.default.ok(out.includes("iffy-pkg"));
    });
    (0, node_test_1.it)("should show no violations message when clean", () => {
        const out = (0, index_js_1.formatViolations)([]);
        strict_1.default.equal(out, "✅ No license violations found.");
    });
    (0, node_test_1.it)("should count category stats correctly", () => {
        const result = makeResult([
            { name: "a", version: "1.0.0", license: "MIT", licenseFile: null, repository: null, path: "/tmp/a" },
            { name: "b", version: "1.0.0", license: "Apache-2.0", licenseFile: null, repository: null, path: "/tmp/b" },
            { name: "c", version: "1.0.0", license: "GPL-3.0", licenseFile: null, repository: null, path: "/tmp/c" },
            { name: "d", version: "1.0.0", license: null, licenseFile: null, repository: null, path: "/tmp/d" },
        ]);
        strict_1.default.equal(result.categories.permissive.length, 2);
        strict_1.default.equal(result.categories.copyleft.length, 1);
        strict_1.default.equal(result.categories.unknown.length, 1);
        strict_1.default.equal(result.stats.total, 4);
        strict_1.default.equal(result.stats.licensed, 3);
        strict_1.default.equal(result.stats.unlicensed, 1);
    });
});
