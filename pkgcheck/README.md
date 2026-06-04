# pkgcheck

Pre-publish checklist for npm packages. Run it before `npm publish` and catch the stupid mistakes we all make.

## Why?

Because I've published packages without a README. With `private: true` still set. With `version: "0.0.0"`. With wildcard dependencies. Every time I tell myself "I'll remember next time." I don't.

pkgcheck runs 20+ checks in under a second and tells you exactly what to fix.

## Install

```bash
npm install -g pkgcheck
# or run without installing
npx pkgcheck
```

## Use

```bash
# check current directory
pkgcheck

# check a specific path
pkgcheck --path ./my-package

# JSON output (for CI)
pkgcheck --json

# treat warnings as errors (strict CI mode)
pkgcheck --strict

# only show failures
pkgcheck --quiet
```

## What it checks

| Check | Severity | What |
|-------|----------|------|
| package.json exists | error | duh |
| private | error | is `private: true` blocking publish? |
| name | error | valid npm package name |
| version | error | valid semver, warns on 0.0.0 |
| entry point | error | main/exports file actually exists |
| bin | error | bin files exist |
| description | warning | missing or too short |
| README | warning | missing or empty |
| license | warning | missing (some orgs can't use unlicensed packages) |
| build script | warning | .ts main but no build script |
| prepublishOnly | warning | no build hook before publish |
| files | warning | no files field = everything gets published |
| .npmignore | info | missing (files field counts too) |
| dependencies | warning | wildcard or unversioned deps |
| duplicate deps | warning | same dep in deps + peerDeps |
| types | warning | TS project but no types field |
| keywords | info | helps npm discoverability |
| repository | info | missing repo URL |
| node_modules | warning | still sitting there |
| .gitignore | info | missing |
| author | warning | missing — people want to know who made this |
| homepage | info | missing — project website helps discoverability |
| bugs | warning | missing — people can't report issues |
| dist files | warning | compiled files missing for JS projects |
| vulnerabilities | warning | suspect packages or npm audit issues |

## CI Integration

```yaml
# GitHub Actions
- name: Pre-publish check
  run: npx pkgcheck --json --strict
```

Exit code is 1 if there are errors (or warnings in strict mode), 0 otherwise.

## JSON Output

```bash
pkgcheck --json
```

```json
{
  "ready": false,
  "errors": 2,
  "warnings": 3,
  "checks": [
    { "name": "name", "passed": true, "message": "my-pkg", "severity": "error" },
    { "name": "version", "passed": false, "message": "invalid semver", "severity": "error", "fix": "use semver format" }
  ]
}
```

## License

MIT
