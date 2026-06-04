#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("./index.js");
const fs_1 = require("fs");
const path_1 = require("path");
const args = process.argv.slice(2);
let pkgPath = ".";
let jsonOutput = false;
let strict = false;
let quiet = false;
for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case "--json":
        case "-j":
            jsonOutput = true;
            break;
        case "--strict":
        case "-s":
            strict = true;
            break;
        case "--quiet":
        case "-q":
            quiet = true;
            break;
        case "--path":
        case "-p":
            pkgPath = args[++i] || ".";
            break;
        case "--help":
        case "-h":
            console.log(`pkgcheck — pre-publish checklist for npm packages

Usage:
  pkgcheck [options]

Options:
  -p, --path <dir>    path to package (default: .)
  -j, --json          JSON output
  -s, --strict        treat warnings as errors
  -q, --quiet         only show failures
  -h, --help          this help

Checks:
  package.json, name, version, description, entry point,
  bin, README, build script, prepublishOnly, license,
  repository, keywords, files, .npmignore, dependencies,
  types, and more.
`);
            process.exit(0);
        default:
            if (!args[i].startsWith("-")) {
                pkgPath = args[i];
            }
    }
}
const results = (0, index_js_1.runChecks)({ pkgPath: (0, path_1.resolve)(pkgPath), strict, json: jsonOutput, quiet });
if (jsonOutput) {
    const errors = results.filter((r) => !r.passed && r.severity === "error");
    const warnings = results.filter((r) => !r.passed && r.severity === "warning");
    console.log(JSON.stringify({
        ready: errors.length === 0 && (!strict || warnings.length === 0),
        errors: errors.length,
        warnings: warnings.length,
        checks: results,
    }, null, 2));
}
else {
    let filtered = results;
    if (quiet) {
        filtered = results.filter((r) => !r.passed);
    }
    console.log((0, index_js_1.formatResults)(filtered, { strict }));
}
const errors = results.filter((r) => !r.passed && r.severity === "error");
const warnings = results.filter((r) => !r.passed && r.severity === "warning");
process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
//# sourceMappingURL=cli.js.map