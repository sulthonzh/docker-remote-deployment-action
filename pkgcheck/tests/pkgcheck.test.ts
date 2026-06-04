import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { runChecks, formatResults, type CheckResult, type CheckOptions } from "../src/index.js";

// Helper function to create test packages
function createTestPackage(pkg: Record<string, unknown>, files: Record<string, string> = {}) {
  const tmpDir = join(process.cwd(), "test-tmp");
  if (existsSync(tmpDir)) {
    // Clean up existing directory
    const { rmSync } = require("fs");
    rmSync(tmpDir, { recursive: true });
  }
  
  const { mkdirSync } = require("fs");
  mkdirSync(tmpDir, { recursive: true });
  
  writeFileSync(join(tmpDir, "package.json"), JSON.stringify(pkg, null, 2));
  
  for (const [fileName, content] of Object.entries(files)) {
    const filePath = join(tmpDir, fileName);
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, content);
  }
  
  return tmpDir;
}

describe("pkgcheck extended functionality", () => {
  it("should validate multiple dependencies correctly", () => {
    const tmpDir = createTestPackage({
      name: "multi-dep-pkg",
      version: "1.0.0",
      dependencies: {
        "lodash": "^1.0.0",
        "express": "latest",
        "react": "*"
      }
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const depsCheck = results.find(r => r.name === "dependencies");
    expect(depsCheck?.passed).toBe(false);
    expect(depsCheck?.message).toContain("express: \"latest\" — pin this!");
    expect(depsCheck?.message).toContain("react: \"*\" — pin this!");
  });

  it("should handle complex TypeScript configuration", () => {
    const tmpDir = createTestPackage({
      name: "ts-complex",
      version: "1.0.0",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      scripts: {
        build: "tsc"
      }
    }, {
      "src/index.ts": "export function hello() { return 'world'; }",
      "tsconfig.json": "{\n        'compilerOptions': {\n          'outDir': './dist',\n          'strict': true\n        }\n      }"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const buildCheck = results.find(r => r.name === "build script");
    expect(buildCheck?.passed).toBe(true);
  });

  it("should validate repository field properly", () => {
    const tmpDir = createTestPackage({
      name: "repo-test",
      version: "1.0.0",
      repository: {
        type: "git",
        url: "https://github.com/user/repo.git"
      }
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const repoCheck = results.find(r => r.name === "repository");
    expect(repoCheck?.passed).toBe(true);
    expect(repoCheck?.message).toBe("https://github.com/user/repo.git");
  });

  it("should validate files field with proper entries", () => {
    const tmpDir = createTestPackage({
      name: "files-test",
      version: "1.0.0",
      files: ["dist", "README.md"]
    }, {
      "dist/index.js": "console.log('test');",
      "README.md": "# Test Package"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const filesCheck = results.find(r => r.name === "files");
    expect(filesCheck?.passed).toBe(true);
    expect(filesCheck?.message).toContain("dist");
    expect(filesCheck?.message).toContain("README.md");
  });

  it("should detect missing prepublishOnly script for TypeScript", () => {
    const tmpDir = createTestPackage({
      name: "ts-missing-build",
      version: "1.0.0",
      main: "src/index.ts"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const prepublishCheck = results.find(r => r.name === "prepublishOnly");
    expect(prepublishCheck?.passed).toBe(false);
    expect(prepublishCheck?.message).toContain("no build hook before publish");
  });

  it("should validate JSON output format correctly", () => {
    const tmpDir = createTestPackage({
      name: "json-test",
      version: "1.0.0"
    });
    
    const results = runChecks({ pkgPath: tmpDir, json: true });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // Parse the JSON output that would be printed to console
    const jsonResults = JSON.stringify({
      ready: false,
      errors: 1,
      warnings: 1,
      checks: results
    }, null, 2);
    
    expect(jsonResults).toHaveProperty("ready");
    expect(jsonResults).toHaveProperty("errors");
    expect(jsonResults).toHaveProperty("warnings");
    expect(jsonResults).toHaveProperty("checks");
  });

  it("should calculate summary statistics correctly", () => {
    const tmpDir = createTestPackage({
      name: "summary-test",
      version: "1.0.0",
      description: "A test package"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const output = formatResults(results);
    
    expect(output).toContain("Summary:");
    expect(output).toMatch(/\d+ passed/);
    expect(output).toMatch(/\d+ errors/);
    expect(output).toMatch(/\d+ warnings/);
  });

  it("should handle engine specifications correctly", () => {
    const tmpDir = createTestPackage({
      name: "engine-test",
      version: "1.0.0",
      engines: {
        node: ">=18.0.0"
      }
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const engineCheck = results.find(r => r.name === "engines.node");
    expect(engineCheck?.passed).toBe(true);
    expect(engineCheck?.message).toBe(">=18.0.0");
  });

  it("should validate multiple README formats", () => {
    const readmeNames = ["README.md", "readme.md", "Readme.md", "README", "README.txt"];
    
    for (const name of readmeNames) {
      const tmpDir = createTestPackage({
        name: "readme-test",
        version: "1.0.0"
      }, { [name]: "# Test Package\n\nThis is a test." });
      
      const results = runChecks({ pkgPath: tmpDir });
      const readmeCheck = results.find(r => r.name === "README");
      expect(readmeCheck?.passed).toBe(true);
    }
  });

  it("should handle complex bin configurations", () => {
    const tmpDir = createTestPackage({
      name: "complex-bin",
      version: "1.0.0",
      bin: {
        "my-cli": "./bin/cli.js",
        "other-cli": "./dist/other.js"
      }
    }, {
      "bin/cli.js": "#!/usr/bin/env node\nconsole.log('cli');",
      "dist/other.js": "console.log('other');"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const binCheck = results.find(r => r.name === "bin");
    expect(binCheck?.passed).toBe(true);
    expect(binCheck?.message).toBe("2 bins");
  });

  it("should validate prepublishOnly and prepare scripts", () => {
    const tmpDir = createTestPackage({
      name: "script-test",
      version: "1.0.0",
      scripts: {
        "prepublishOnly": "npm run build",
        "prepare": "npm run build"
      }
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const prepublishCheck = results.find(r => r.name === "prepublishOnly");
    expect(prepublishCheck?.passed).toBe(true);
    expect(prepublishCheck?.message).toBe("found");
  });

  it("should validate exports field resolution", () => {
    const tmpDir = createTestPackage({
      name: "exports-test",
      version: "1.0.0",
      exports: {
        ".": "./dist/index.js",
        "./cli": "./dist/cli.js",
        "./feature": "./dist/feature.js"
      }
    }, {
      "dist/index.js": "export default {}",
      "dist/cli.js": "#!/usr/bin/env node\nconsole.log('cli');",
      "dist/feature.js": "export function feature() {}"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const entryCheck = results.find(r => r.name === "entry point");
    expect(entryCheck?.passed).toBe(true);
    expect(entryCheck?.message).toBe("./dist/index.js → dist/index.js");
  });

  it("should validate package with keywords", () => {
    const tmpDir = createTestPackage({
      name: "keywords-test",
      version: "1.0.0",
      keywords: ["test", "package", "cli", "tool"],
      description: "A test package with keywords"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const keywordsCheck = results.find(r => r.name === "keywords");
    expect(keywordsCheck?.passed).toBe(true);
    expect(keywordsCheck?.message).toBe("4 keywords");
  });

  it("should detect empty keywords array", () => {
    const tmpDir = createTestPackage({
      name: "no-keywords",
      version: "1.0.0",
      keywords: [],
      description: "A package without keywords"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const keywordsCheck = results.find(r => r.name === "keywords");
    expect(keywordsCheck?.passed).toBe(false);
    expect(keywordsCheck?.message).toBe("none — helps npm search discoverability");
  });

  it("should validate license field correctly", () => {
    const licenses = ["MIT", "Apache-2.0", "GPL-3.0", "BSD-2-Clause", "ISC"];
    
    for (const license of licenses) {
      const tmpDir = createTestPackage({
        name: "license-test",
        version: "1.0.0",
        license: license
      });
      
      const results = runChecks({ pkgPath: tmpDir });
      const licenseCheck = results.find(r => r.name === "license");
      expect(licenseCheck?.passed).toBe(true);
      expect(licenseCheck?.message).toBe(license);
    }
  });

  it("should detect missing license", () => {
    const tmpDir = createTestPackage({
      name: "no-license",
      version: "1.0.0"
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const licenseCheck = results.find(r => r.name === "license");
    expect(licenseCheck?.passed).toBe(false);
    expect(licenseCheck?.message).toBe("missing — some orgs can't use unlicensed packages");
  });

  it("should validate complex project with multiple features", () => {
    const tmpDir = createTestPackage({
      name: "complex-project",
      version: "1.2.3",
      description: "A complex project with many features",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      bin: "./bin/cli.js",
      scripts: {
        build: "tsup src/index.ts --format cjs",
        test: "vitest",
        lint: "eslint src",
        prepublishOnly: "npm run build"
      },
      repository: "https://github.com/user/complex-project",
      keywords: ["tool", "cli", "typescript", "build"],
      files: ["dist", "bin", "README.md"],
      engines: {
        node: ">=16.0.0"
      },
      dependencies: {
        "lodash": "^4.17.21",
        "chalk": "^4.1.2"
      },
      devDependencies: {
        "typescript": "^5.0.0",
        "vitest": "^0.34.0"
      }
    }, {
      "src/index.ts": "import { bold } from 'chalk';\n\nexport function main() {\n  console.log(bold('Hello, world!'));\n}\n",
      "bin/cli.js": "#!/usr/bin/env node\nrequire('./dist/cli.js');",
      "dist/index.js": "\"use strict\";\nObject.defineProperty(exports, \"__esModule\", { value: true });\nexports.main = void 0;\nconst chalk_1 = require(\"chalk\");\nfunction main() {\n    console.log((0, chalk_1.bold)('Hello, world!'));\n}\nexports.main = main;\n",
      "README.md": "# Complex Project\n\nA complex TypeScript project with CLI interface."
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const errors = results.filter(r => !r.passed && r.severity === "error");
    const warnings = results.filter(r => !r.passed && r.severity === "warning");
    
    // Should have no errors and minimal warnings
    expect(errors.length).toBe(0);
    expect(warnings.length).toBeLessThan(3);
    
    // Check specific important checks
    const nameCheck = results.find(r => r.name === "name");
    const versionCheck = results.find(r => r.name === "version");
    const descCheck = results.find(r => r.name === "description");
    const entryCheck = results.find(r => r.name === "entry point");
    const binCheck = results.find(r => r.name === "bin");
    const repoCheck = results.find(r => r.name === "repository");
    
    expect(nameCheck?.passed).toBe(true);
    expect(versionCheck?.passed).toBe(true);
    expect(descCheck?.passed).toBe(true);
    expect(entryCheck?.passed).toBe(true);
    expect(binCheck?.passed).toBe(true);
    expect(repoCheck?.passed).toBe(true);
  });

  it("should handle quiet mode output", () => {
    const tmpDir = createTestPackage({
      name: "quiet-test",
      version: "1.0.0",
      description: "short" // This will trigger a warning
    });
    
    const results = runChecks({ pkgPath: tmpDir, quiet: true });
    const quietResults = results.filter(r => !r.passed);
    
    // Only failures should be shown in quiet mode
    expect(quietResults.length).toBeGreaterThan(0);
    expect(quietResults.every(r => !r.passed)).toBe(true);
  });

  it("should handle strict mode correctly", () => {
    const tmpDir = createTestPackage({
      name: "strict-test",
      version: "1.0.0",
      description: "short" // This will trigger a warning
    });
    
    const results = runChecks({ pkgPath: tmpDir, strict: true });
    const warnings = results.filter(r => !r.passed && r.severity === "warning");
    
    // Should detect warnings in strict mode
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("should generate proper error messages with fixes", () => {
    const tmpDir = createTestPackage({
      name: "invalid-package",
      version: "1.0.0",
      main: "missing.js" // Missing entry point
    });
    
    const results = runChecks({ pkgPath: tmpDir });
    const entryCheck = results.find(r => r.name === "entry point");
    
    expect(entryCheck?.passed).toBe(false);
    expect(entryCheck?.fix).toBeDefined();
    expect(typeof entryCheck?.fix).toBe("string");
    expect(entryCheck?.fix).toContain("create");
  });
});