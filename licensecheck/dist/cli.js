#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const args = process.argv.slice(2);
const cwd = process.cwd();
// Parse flags
let outputFormat = "table";
let policyFile = null;
let checkOnly = false;
let showHelp = false;
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json" || arg === "-j")
        outputFormat = "json";
    else if (arg === "--markdown" || arg === "-m")
        outputFormat = "markdown";
    else if (arg === "--policy" || arg === "-p") {
        policyFile = args[++i] ?? null;
    }
    else if (arg === "--check" || arg === "-c")
        checkOnly = true;
    else if (arg === "--help" || arg === "-h")
        showHelp = true;
}
if (showHelp) {
    console.log(`licensecheck — npm dependency license scanner

Usage:
  licensecheck [options]

Options:
  --json, -j          Output as JSON
  --markdown, -m      Output as markdown
  --policy, -p <file> Policy file (allow/deny/warn lists)
  --check, -c         Only show violations (exit 1 if errors)
  --help, -h          Show this help

Policy file format (JSON):
  {
    "allow": ["MIT", "Apache-2.0", "BSD-3-Clause"],
    "deny": ["GPL-3.0", "AGPL-3.0", "SSPL"],
    "warn": ["LGPL", "MPL-2.0"]
  }

Exit codes:
  0  Success (no violations, or only warnings)
  1  Policy violations found (errors)
  2  Scan failed
`);
    process.exit(0);
}
// Load policy
let policy = null;
if (policyFile) {
    const pPath = policyFile.startsWith("/") ? policyFile : (0, node_path_1.join)(cwd, policyFile);
    if (!(0, node_fs_1.existsSync)(pPath)) {
        console.error(`Policy file not found: ${pPath}`);
        process.exit(2);
    }
    try {
        policy = JSON.parse((0, node_fs_1.readFileSync)(pPath, "utf-8"));
    }
    catch (e) {
        console.error(`Invalid policy JSON: ${e}`);
        process.exit(2);
    }
}
// Scan
let result;
try {
    result = (0, index_js_1.scan)(cwd);
}
catch (e) {
    console.error(`Scan failed: ${e.message}`);
    process.exit(2);
}
if (result.entries.length === 0) {
    console.log("No packages found. Run from a project with node_modules.");
    process.exit(0);
}
// Check policy
let violations = undefined;
if (policy) {
    violations = (0, index_js_1.checkPolicy)(result, policy);
}
// Output
if (checkOnly) {
    if (violations && violations.length > 0) {
        console.log((0, index_js_1.formatViolations)(violations));
    }
    else if (policy) {
        console.log("✅ No license violations found.");
    }
    else {
        console.log("No policy specified. Use --policy <file> with --check.");
    }
}
else {
    switch (outputFormat) {
        case "json":
            console.log((0, index_js_1.formatJson)(result, violations));
            break;
        case "markdown":
            console.log((0, index_js_1.formatMarkdown)(result, violations));
            break;
        default:
            console.log((0, index_js_1.formatTable)(result));
            if (violations && violations.length > 0) {
                console.log("");
                console.log((0, index_js_1.formatViolations)(violations));
            }
    }
}
// Exit code
if (violations) {
    const hasErrors = violations.some((v) => v.severity === "error");
    if (hasErrors)
        process.exit(1);
}
