"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ConfigLoader: () => ConfigLoader,
  Formatter: () => Formatter,
  OutdatedChecker: () => OutdatedChecker
});
module.exports = __toCommonJS(index_exports);

// src/lib/checker.js
var import_promises = require("fs/promises");
var import_path = require("path");
var import_semver = require("semver");
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
    const packagePath = (0, import_path.join)(this.basePath, "package.json");
    const content = await (0, import_promises.readFile)(packagePath, "utf-8");
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
    const current = (0, import_semver.coerce)(pkg.current);
    const latest = (0, import_semver.parse)(pkg.latest);
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
var import_chalk = __toESM(require("chalk"), 1);
var import_cli_table3 = __toESM(require("cli-table3"), 1);
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
      return import_chalk.default.green("\u2713 All dependencies within threshold limits");
    }
    const table = new import_cli_table3.default({
      head: [
        import_chalk.default.bold("Package"),
        import_chalk.default.bold("Current"),
        import_chalk.default.bold("Latest"),
        import_chalk.default.bold("Type"),
        import_chalk.default.bold("Major"),
        import_chalk.default.bold("Minor"),
        import_chalk.default.bold("Patch")
      ],
      colWidths: [25, 15, 15, 8, 8, 8, 8]
    });
    for (const v of result.violations) {
      const major = v.majorDiff > this.config.maxMajor ? import_chalk.default.red(v.majorDiff) : v.majorDiff;
      const minor = v.minorDiff > this.config.maxMinor ? import_chalk.default.red(v.minorDiff) : v.minorDiff;
      const patch = v.patchDiff > this.config.maxPatch ? import_chalk.default.red(v.patchDiff) : v.patchDiff;
      table.push([v.name, v.current, v.latest, v.type, major, minor, patch]);
    }
    return `
${table.toString()}
${import_chalk.default.red(`\u2717 ${result.violations.length} violation(s) found`)}
`;
  }
  formatText(result) {
    if (result.violations.length === 0) {
      return import_chalk.default.green(`\u2713 All dependencies (${result.totalChecked}) within threshold limits`);
    }
    let output = import_chalk.default.red(`\u2717 ${result.violations.length} violation(s) found:

`);
    for (const v of result.violations) {
      output += import_chalk.default.red(`  \u2022 ${v.name}`) + ` (${v.type})
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
    output += import_chalk.default.yellow(`Thresholds: major=${this.config.maxMajor}, minor=${this.config.maxMinor}, patch=${this.config.maxPatch}`);
    return output;
  }
  formatVerbose(result) {
    let output = this.format(result);
    output += `

${import_chalk.default.dim("Configuration:")}`;
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
var import_promises2 = require("fs/promises");
var import_path2 = require("path");
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
        const content = await (0, import_promises2.readFile)(configPath, "utf-8");
        userConfig = JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error}`);
      }
    } else {
      try {
        const content = await (0, import_promises2.readFile)((0, import_path2.join)(process.cwd(), ".npm-outdated-check.json"), "utf-8");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConfigLoader,
  Formatter,
  OutdatedChecker
});
//# sourceMappingURL=index.cjs.map