#!/usr/bin/env node

// src/bin/cli.ts
import { Command } from "commander";

// src/lib/checker.js
import { readFile } from "fs/promises";
import { join } from "path";
import { coerce, parse } from "semver";
var OutdatedChecker = class {
  config;
  basePath;
  constructor(config, basePath = process.cwd()) {
    this.config = config;
    this.basePath = basePath;
  }
  async check() {
    const packageJson = await this.readPackageJson();
    const packageInfo = await this.getPackageInfo(packageJson);
    const violations = [];
    for (const pkg of packageInfo) {
      if (this.isExcluded(pkg.name))
        continue;
      const diff = this.calculateVersionDiff(pkg);
      if (diff.isViolation) {
        violations.push(diff);
      }
    }
    return { violations, totalChecked: packageInfo.length };
  }
  async readPackageJson() {
    const packagePath = join(this.basePath, "package.json");
    const content = await readFile(packagePath, "utf-8");
    return JSON.parse(content);
  }
  async getPackageInfo(packageJson) {
    const packages = [];
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    for (const [name, version] of Object.entries(deps)) {
      const latest = await this.getLatestVersion(name);
      if (latest) {
        packages.push({
          name,
          current: version,
          latest,
          wanted: version,
          type: "prod",
          direct: true
        });
      }
    }
    if (this.config.include.includes("dev")) {
      for (const [name, version] of Object.entries(devDeps)) {
        const latest = await this.getLatestVersion(name);
        if (latest) {
          packages.push({
            name,
            current: version,
            latest,
            wanted: version,
            type: "dev",
            direct: true
          });
        }
      }
    }
    return packages;
  }
  async getLatestVersion(packageName) {
    try {
      const url = `${this.config.registry}/${packageName}?cached=true`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data["dist-tags"]?.latest || null;
    } catch {
      return null;
    }
  }
  calculateVersionDiff(pkg) {
    const current = coerce(pkg.current);
    const latest = parse(pkg.latest);
    if (!current || !latest) {
      return {
        name: pkg.name,
        current: pkg.current,
        latest: pkg.latest,
        type: pkg.type,
        majorDiff: 0,
        minorDiff: 0,
        patchDiff: 0,
        isViolation: false
      };
    }
    const majorDiff = latest.major - current.major;
    const minorDiff = latest.minor - current.minor;
    const patchDiff = latest.patch - current.patch;
    const isViolation = majorDiff > this.config.maxMajor || minorDiff > this.config.maxMinor || patchDiff > this.config.maxPatch;
    return {
      name: pkg.name,
      current: pkg.current,
      latest: pkg.latest,
      type: pkg.type,
      majorDiff: Math.max(0, majorDiff),
      minorDiff: Math.max(0, minorDiff),
      patchDiff: Math.max(0, patchDiff),
      isViolation
    };
  }
  isExcluded(packageName) {
    return this.config.exclude.includes(packageName);
  }
  getExitCode(violations) {
    if (violations.length > 0) {
      return 1;
    }
    return 0;
  }
};

// src/lib/formatter.js
import chalk from "chalk";
import Table from "cli-table3";
var Formatter = class {
  config;
  constructor(config) {
    this.config = config;
  }
  format(result) {
    switch (this.config.format) {
      case "json":
        return this.formatJson(result);
      case "table":
        return this.formatTable(result);
      default:
        return this.formatText(result);
    }
  }
  formatJson(result) {
    return JSON.stringify({
      passed: result.passed,
      totalChecked: result.totalChecked,
      violationsCount: result.violations.length,
      violations: result.violations.map((v) => ({
        name: v.name,
        current: v.current,
        latest: v.latest,
        type: v.type,
        majorDiff: v.majorDiff,
        minorDiff: v.minorDiff,
        patchDiff: v.patchDiff
      }))
    }, null, 2);
  }
  formatTable(result) {
    if (result.violations.length === 0) {
      return chalk.green("\u2713 All dependencies within threshold limits");
    }
    const table = new Table({
      head: [
        chalk.bold("Package"),
        chalk.bold("Current"),
        chalk.bold("Latest"),
        chalk.bold("Type"),
        chalk.bold("Major"),
        chalk.bold("Minor"),
        chalk.bold("Patch")
      ],
      colWidths: [25, 15, 15, 8, 8, 8, 8]
    });
    for (const v of result.violations) {
      const major = v.majorDiff > this.config.maxMajor ? chalk.red(v.majorDiff) : v.majorDiff;
      const minor = v.minorDiff > this.config.maxMinor ? chalk.red(v.minorDiff) : v.minorDiff;
      const patch = v.patchDiff > this.config.maxPatch ? chalk.red(v.patchDiff) : v.patchDiff;
      table.push([v.name, v.current, v.latest, v.type, major, minor, patch]);
    }
    return `
${table.toString()}
${chalk.red(`\u2717 ${result.violations.length} violation(s) found`)}
`;
  }
  formatText(result) {
    if (result.violations.length === 0) {
      return chalk.green(`\u2713 All dependencies (${result.totalChecked}) within threshold limits`);
    }
    let output = chalk.red(`\u2717 ${result.violations.length} violation(s) found:

`);
    for (const v of result.violations) {
      output += chalk.red(`  \u2022 ${v.name}`) + ` (${v.type})
`;
      output += `    Current: ${v.current}
`;
      output += `    Latest:  ${v.latest}
`;
      output += `    Drift:   M${v.majorDiff} m${v.minorDiff} p${v.patchDiff}
`;
      output += `    Limit:   M${this.config.maxMajor} m${this.config.maxMinor} p${this.config.maxPatch}

`;
    }
    output += chalk.yellow(`Thresholds: major=${this.config.maxMajor}, minor=${this.config.maxMinor}, patch=${this.config.maxPatch}`);
    return output;
  }
  formatVerbose(result) {
    let output = this.format(result);
    output += `

${chalk.dim("Configuration:")}`;
    output += `
  Registry: ${this.config.registry}`;
    output += `
  Include: ${this.config.include.join(", ")}`;
    output += `
  Exclude: ${this.config.exclude.join(", ") || "none"}`;
    output += `
  Fail on any: ${this.config.failOnAny}`;
    return output;
  }
};

// src/lib/config.js
import { readFile as readFile2 } from "fs/promises";
import { join as join2 } from "path";
var DEFAULT_CONFIG = {
  maxMajor: 0,
  maxMinor: 2,
  maxPatch: 5,
  include: ["prod", "dev"],
  exclude: [],
  registry: "https://registry.npmjs.org",
  format: "text",
  failOnAny: false,
  verbose: false
};
var ConfigLoader = class {
  static async load(configPath) {
    let userConfig = {};
    if (configPath) {
      try {
        const content = await readFile2(configPath, "utf-8");
        userConfig = JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error}`);
      }
    } else {
      try {
        const content = await readFile2(join2(process.cwd(), ".npm-outdated-check.json"), "utf-8");
        userConfig = JSON.parse(content);
      } catch {
      }
    }
    return { ...DEFAULT_CONFIG, ...userConfig };
  }
  static mergeWithCli(config, cliOptions) {
    return { ...config, ...cliOptions };
  }
  static validate(config) {
    const errors = [];
    if (config.maxMajor < 0)
      errors.push("maxMajor must be >= 0");
    if (config.maxMinor < 0)
      errors.push("maxMinor must be >= 0");
    if (config.maxPatch < 0)
      errors.push("maxPatch must be >= 0");
    if (config.include.length === 0)
      errors.push("include must have at least one type");
    if (!["text", "json", "table"].includes(config.format)) {
      errors.push("format must be text, json, or table");
    }
    return { valid: errors.length === 0, errors };
  }
};

// src/bin/cli.ts
var program = new Command();
program.name("npm-outdated-check").description("CI-friendly dependency version threshold checker").version("1.0.0").option("--max-major <n>", "Maximum major version drift", "0").option("--max-minor <n>", "Maximum minor version drift", "2").option("--max-patch <n>", "Maximum patch version drift", "5").option("--dep <types>", "Include dependencies (prod,dev,both)", "both").option("--exclude <packages>", "Exclude packages (comma-separated)", "").option("--registry <url>", "npm registry URL", "https://registry.npmjs.org").option("--format <fmt>", "Output format (text,json,table)", "text").option("--config <path>", "Path to config file").option("--verbose", "Verbose output").option("--fail-on-any", "Fail if any violations found", false).option("--security-scan", "Include security vulnerability scanning", false).option("--path <dir>", "Project directory (default: cwd)").parse();
var options = program.opts();
async function main() {
  try {
    let config = await ConfigLoader.load(options.config);
    const includeTypes = options.dep === "both" ? ["prod", "dev"] : options.dep === "prod" ? ["prod"] : ["dev"];
    const exclude = options.exclude ? options.exclude.split(",").map((s) => s.trim()) : [];
    const cliOptions = {
      maxMajor: parseInt(options.maxMajor, 10),
      maxMinor: parseInt(options.maxMinor, 10),
      maxPatch: parseInt(options.maxPatch, 10),
      include: includeTypes,
      exclude,
      registry: options.registry,
      format: options.format,
      verbose: options.verbose,
      failOnAny: options.failOnAny || options.securityScan
    };
    config = ConfigLoader.mergeWithCli(config, cliOptions);
    const validation = ConfigLoader.validate(config);
    if (!validation.valid) {
      console.error("Configuration errors:");
      validation.errors.forEach((err) => console.error(`  - ${err}`));
      process.exit(2);
    }
    const basePath = options.path || process.cwd();
    const checker = new OutdatedChecker(config, basePath);
    const { violations, totalChecked } = await checker.check();
    const result = {
      violations,
      totalChecked,
      passed: violations.length === 0,
      config
    };
    const formatter = new Formatter(config);
    const output = config.verbose ? formatter.formatVerbose(result) : formatter.format(result);
    console.log(output);
    const exitCode = checker.getExitCode(violations);
    process.exit(exitCode);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(3);
  }
}
main();
//# sourceMappingURL=cli.js.map