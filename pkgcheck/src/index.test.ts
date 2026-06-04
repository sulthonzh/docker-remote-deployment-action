import { describe, it, expect, afterAll } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { runChecks, formatResults } from "./index.js";

const tmp = join(process.cwd(), ".tmp-test-pkgcheck");

function setup(pkg: Record<string, unknown>, extra?: Record<string, string>) {
  if (existsSync(tmp)) rmSync(tmp, { recursive: true });
  mkdirSync(tmp, { recursive: true });
  writeFileSync(join(tmp, "package.json"), JSON.stringify(pkg, null, 2));
  if (extra) {
    for (const [name, content] of Object.entries(extra)) {
      const filePath = join(tmp, name);
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(filePath, content);
    }
  }
}

function cleanup() {
  if (existsSync(tmp)) rmSync(tmp, { recursive: true });
}

describe("pkgcheck", () => {
  afterAll(cleanup);

  it("detects missing package.json", () => {
    if (existsSync(tmp)) rmSync(tmp, { recursive: true });
    mkdirSync(tmp, { recursive: true });
    const results = runChecks({ pkgPath: tmp });
    const existsCheck = results.find((r) => r.name === "package.json exists")!;
    expect(existsCheck.passed).toBe(false);
  });

  it("passes a well-configured package", () => {
    setup(
      {
        name: "my-cool-pkg",
        version: "1.2.3",
        description: "A very cool package for doing cool things",
        main: "dist/index.js",
        license: "MIT",
        repository: { type: "git", url: "https://github.com/example/pkg" },
        keywords: ["cool", "package"],
        files: ["dist"],
        scripts: { build: "tsup src/index.ts", prepublishOnly: "npm run build" },
      },
      { "README.md": "# my-cool-pkg\n\nA cool thing. Install, use, enjoy.", ".gitignore": "node_modules\n", "dist/index.js": "export {};" }
    );
    const results = runChecks({ pkgPath: tmp });
    const errors = results.filter((r) => !r.passed && r.severity === "error");
    expect(errors.length).toBe(0);
  });

  it("catches invalid name", () => {
    setup({ name: "INVALID NAME", version: "1.0.0" });
    const results = runChecks({ pkgPath: tmp });
    const nameCheck = results.find((r) => r.name === "name")!;
    expect(nameCheck.passed).toBe(false);
  });

  it("catches bad semver", () => {
    setup({ name: "pkg", version: "abc" });
    const results = runChecks({ pkgPath: tmp });
    const versionCheck = results.find((r) => r.name === "version")!;
    expect(versionCheck.passed).toBe(false);
  });

  it("warns on missing description", () => {
    setup({ name: "pkg", version: "1.0.0" });
    const results = runChecks({ pkgPath: tmp });
    const descCheck = results.find((r) => r.name === "description")!;
    expect(descCheck.passed).toBe(false);
    expect(descCheck.severity).toBe("warning");
  });

  it("warns on missing README", () => {
    setup({ name: "pkg", version: "1.0.0" });
    const results = runChecks({ pkgPath: tmp });
    const readme = results.find((r) => r.name === "README")!;
    expect(readme.passed).toBe(false);
  });

  it("catches private: true", () => {
    setup({ name: "pkg", version: "1.0.0", private: true });
    const results = runChecks({ pkgPath: tmp });
    const priv = results.find((r) => r.name === "private")!;
    expect(priv.passed).toBe(false);
    expect(priv.severity).toBe("error");
  });

  it("catches wildcard dependency versions", () => {
    setup({ name: "pkg", version: "1.0.0", dependencies: { lodash: "*" } });
    const results = runChecks({ pkgPath: tmp });
    const deps = results.find((r) => r.name === "dependencies")!;
    expect(deps.passed).toBe(false);
    expect(deps.message).toContain("pin this");
  });

  it("detects duplicate deps across deps and peerDeps", () => {
    setup({
      name: "pkg",
      version: "1.0.0",
      dependencies: { react: "^18.0.0" },
      peerDependencies: { react: "^18.0.0" },
    });
    const results = runChecks({ pkgPath: tmp });
    const dupes = results.find((r) => r.name === "duplicate deps")!;
    expect(dupes.passed).toBe(false);
    expect(dupes.message).toContain("react");
  });

  it("detects missing entry point", () => {
    setup({ name: "pkg", version: "1.0.0", main: "dist/index.js" });
    const results = runChecks({ pkgPath: tmp });
    const entry = results.find((r) => r.name === "entry point")!;
    expect(entry.passed).toBe(false);
  });

  it("detects missing bin file", () => {
    setup({ name: "pkg", version: "1.0.0", bin: { pkg: "./cli.js" } });
    const results = runChecks({ pkgPath: tmp });
    const bin = results.find((r) => r.name === "bin")!;
    expect(bin.passed).toBe(false);
  });

  it("warns about 0.0.0 version", () => {
    setup({ name: "pkg", version: "0.0.0" });
    const results = runChecks({ pkgPath: tmp });
    const ver = results.find((r) => r.name === "version")!;
    expect(ver.severity).toBe("warning");
  });

  it("formatResults produces output", () => {
    setup({ name: "pkg", version: "1.0.0" });
    const results = runChecks({ pkgPath: tmp });
    const output = formatResults(results);
    expect(output).toContain("Summary:");
    expect(output.length).toBeGreaterThan(50);
  });
});
