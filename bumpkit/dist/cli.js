#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
const args = process.argv.slice(2);
function showHelp() {
    console.log(`
bumpkit — smart semver bumper for conventional commits

Usage:
  bumpkit [command] [options]

Commands:
  analyze     Show what bump is needed (default)
  changelog   Generate changelog markdown
  bump        Actually bump version in package.json
  tag         Bump + create git tag

Options:
  --tag <tag>          Use specific tag as base (default: latest git tag)
  --version <ver>      Override current version
  --json               Output as JSON
  --dry-run            Show what would happen without doing it
  --help               Show this help

Examples:
  bumpkit                    # analyze commits since last tag
  bumpkit analyze --json     # machine-readable analysis
  bumpkit changelog          # generate changelog markdown
  bumpkit bump               # bump package.json version
  bumpkit bump --dry-run     # preview the bump
  bumpkit tag                # bump + git tag + commit
`);
}
function parseArgs(args) {
    const opts = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--json')
            opts.json = true;
        else if (args[i] === '--dry-run')
            opts.dryRun = true;
        else if (args[i] === '--help' || args[i] === '-h')
            opts.help = true;
        else if (args[i] === '--tag' && args[i + 1]) {
            opts.tag = args[++i];
        }
        else if (args[i] === '--version' && args[i + 1]) {
            opts.version = args[++i];
        }
        else if (!args[i].startsWith('-'))
            opts.command = args[i];
    }
    return opts;
}
function updatePackageVersion(newVersion) {
    const pkgPath = 'package.json';
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}
function main() {
    const opts = parseArgs(args);
    if (opts.help) {
        showHelp();
        return;
    }
    const command = opts.command || 'analyze';
    const result = (0, index_1.analyze)(opts.tag, opts.version);
    if (command === 'analyze') {
        if (opts.json) {
            console.log((0, index_1.formatJSON)(result));
        }
        else {
            console.log((0, index_1.formatText)(result));
        }
        return;
    }
    if (command === 'changelog') {
        const md = (0, index_1.generateChangelog)(result);
        console.log(md);
        return;
    }
    if (command === 'bump' || command === 'tag') {
        if (result.bumpType === 'none') {
            console.log('No version bump needed — no relevant commits found.');
            if (opts.json)
                console.log((0, index_1.formatJSON)(result));
            return;
        }
        console.log(`${result.currentVersion} → ${result.newVersion} (${result.bumpType})`);
        if (opts.dryRun) {
            console.log('(dry run — no changes made)');
            return;
        }
        // Update package.json
        updatePackageVersion(result.newVersion);
        console.log(`Updated package.json to ${result.newVersion}`);
        // Generate changelog entry
        const changelog = (0, index_1.generateChangelog)(result);
        const changelogPath = 'CHANGELOG.md';
        let existing = '';
        if (fs.existsSync(changelogPath)) {
            existing = fs.readFileSync(changelogPath, 'utf-8');
        }
        const header = '# Changelog\n\n';
        if (existing.startsWith(header)) {
            fs.writeFileSync(changelogPath, header + changelog + existing.slice(header.length));
        }
        else if (existing.startsWith('#')) {
            fs.writeFileSync(changelogPath, header + changelog + '\n' + existing);
        }
        else {
            fs.writeFileSync(changelogPath, header + changelog + existing);
        }
        console.log('Updated CHANGELOG.md');
        if (command === 'tag') {
            // Git add, commit, tag
            try {
                child_process.execSync('git add package.json CHANGELOG.md', { stdio: 'inherit' });
                child_process.execSync(`git commit -m "chore(release): ${result.newVersion}"`, { stdio: 'inherit' });
                child_process.execSync(`git tag -a v${result.newVersion} -m "v${result.newVersion}"`, { stdio: 'inherit' });
                console.log(`Created git tag v${result.newVersion}`);
            }
            catch (err) {
                console.error('Git operations failed:', err.message);
                process.exit(1);
            }
        }
        if (opts.json) {
            console.log('\n' + (0, index_1.formatJSON)(result));
        }
        return;
    }
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
main();
