# OSS Review Tracker

## Pull Requests Submitted

| Date | Repo | PR | Description | Status |
|------|------|----|-------------|--------|
| 2026-06-06 | dotenv-schema | [#3](https://github.com/sulthonzh/dotenv-schema/pull/3) | Parser robustness + validator security | Pending |
| 2026-06-06 | docker-remote-deployment-action | [#33](https://github.com/sulthonzh/docker-remote-deployment-action/pull/33) | Security hardening + shell safety | Pending |
| 2026-06-07 | TelyX | [#29](https://github.com/sulthonzh/TelyX/pull/29) | Flush race, trackMethod next(), time series indexing | Pending |
| 2026-06-07 | logchef-zig | [#17](https://github.com/sulthonzh/logchef-zig/pull/17) | JSON escaping, since filter, follow-mode leak | Pending |
| 2026-06-07 | npm-outdated-check | [#10](https://github.com/sulthonzh/npm-outdated-check/pull/10) | NaN parse, fetch timeout, registry validation, dead config | Pending |
| 2026-06-07 | envguard | [#3](https://github.com/sulthonzh/envguard/pull/3) | Multiline parser, validateFilePath bypass, inline comments, sort fix | Pending |
| 2026-06-07 | gitpanic | [#6](https://github.com/sulthonzh/gitpanic/pull/6) | Reflog timestamps, N+1 queries, CLI variable shadowing | Pending |
| 2026-06-08 | dotenv-schema | [#4](https://github.com/sulthonzh/dotenv-schema/pull/4) | YAML injection, multiline safety, format validation in exporter | Pending |
| 2026-06-08 | git-conflicts | [#6](https://github.com/sulthonzh/git-conflicts/pull/6) | Editor parsing, conflict marker detection, relative git-dir, test config | Pending |
| 2026-06-08 | envguard | [#4](https://github.com/sulthonzh/envguard/pull/4) | Output path traversal bypass, annotation false positives in quoted values, fix strips inline comments, comment formatting loss | Pending |
| 2026-06-08 | logchef-zig | [#18](https://github.com/sulthonzh/logchef-zig/pull/18) | --since relative durations always matching, FileWatcher data loss on bursty writes, misleading --merge help | Pending |
| 2026-06-08 | TelyX | [#30](https://github.com/sulthonzh/TelyX/pull/30) | Math.min/max spread stack overflow, flush shallow-copy data loss, no graceful shutdown, non-functional tests | Pending |
| 2026-06-08 | npm-outdated-check | [#13](https://github.com/sulthonzh/npm-outdated-check/pull/13) | --dep prod ignored, scoped packages 404, dead failOnAny, no fetch timeout, fake cached param | Pending |
| 2026-06-08 | docker-remote-deployment-action | [#35](https://github.com/sulthonzh/docker-remote-deployment-action/pull/new/fix/docker-entrypoint-security) | Comprehensive security fixes: shell injection prevention, SSH error handling, Docker context safety, argument quoting, operation warnings | Pending |
| 2026-06-08 | TelyX | [#31](https://github.com/sulthonzh/TelyX/pull/31) | Timeseries indexing fix for 7d range, ensure proper hourly buckets | Pending |
| 2026-06-08 | logchef-zig | [#19](https://github.com/sulthonzh/logchef-zig/pull/19) | Remove misleading --merge flag, simplify --since to ISO 8601 only | Pending |
| 2026-06-08 | TelyX | [#32](https://github.com/sulthonzh/TelyX/pull/32) | Critical bugs: stack overflow in analytics, time series indexing, race condition, memory leak | Pending |

## Findings Log

### dotenv-schema (2026-06-06)
- **Security: ReDoS via unchecked regex** — `validator.ts` passed schema patterns directly to `new RegExp()` without length limits or error handling. Fixed with 500-char cap + try/catch.
- **Bug: Boolean validation too strict** — Only accepted `'true'`/`'false'` but .env files commonly use `1`/`0`, `yes`/`no`, `on`/`off`. Fixed.
- **Bug: Number type false positives** — Version strings like `1.0.0` or semvers got classified as `number`. Added stricter regex check.
- **Missing: Multiline value parsing** — Quoted strings spanning multiple lines weren't handled. Fixed.
- **Minor: No empty key guard** — Lines starting with `=` would create entries with empty keys. Fixed.
- **Low quality: cli.test.ts** — Only has a single `assert.ok(true)` test. Not addressed in this PR.

### docker-remote-deployment-action (2026-06-06)
- **Security: SSH keys left on disk** — After action completes, `~/.ssh/id_rsa` (private key) stays on the GitHub Actions runner. Added `trap cleanup EXIT` to wipe keys and kill ssh-agent.
- **Shell safety: Unquoted variable expansions** — `$INPUT_REMOTE_DOCKER_PORT`, `$INPUT_STACK_FILE_NAME` etc. used bare in `scp`, `ssh-keyscan`, causing potential word-splitting bugs.
- **Shell safety: Word-splitting in execute_ssh** — `DEPLOYMENT_COMMAND` passed as separate unquoted args, would break on spaces.
- **Deprecated: Docker Compose v1** — Base image was `docker/compose:1.29.2` (v1 EOL). Updated to `docker/compose:2.24.0`.
- **Minor: Entrypoint not executable** — No `chmod +x` in Dockerfile. Fixed.
- **Minor: README typo** — `my_applicaion` in example. Fixed.
- **Note:** The `docker-remote-deployment-action/` subdirectory contains an older version of the same files — appears to be legacy/leftover from the fork.

### logchef-zig (2026-06-07, round 10)
- **Correctness: JSON output produces invalid JSON** — `formatJsonEntry()` wrote raw strings into JSON without escaping `"`, `\`, newlines, or control characters. Any log message containing these characters produced broken JSON output. Fixed with `writeJsonEscaped()` utility.
- **Correctness: `--since` filter does nothing** — Both `tryParseJsonLog()` and `tryParseLogfmt()` always set `parsed_ts_ms = null`. The filter only acts when `parsed_ts_ms` is non-null, so no entries were ever filtered. Added `parseTimestampToMs()` with ISO 8601 + timezone + millis support.
- **Memory leak: Follow mode leftover buffer** — `leftover` allocated with `allocator.dupe()` every poll cycle but never freed before reassignment. Fixed with `leftover_owned` tracking.
- **Cleanup: JsonParser allocator hardcoded** — `parseObject()`/`parseArray()` used `page_allocator` directly. Made configurable via `initWithAllocator()`.
- **Note:** Despite 9 prior review rounds, these were all present in `main`. The since filter being completely non-functional is notable — suggests it was never tested end-to-end.
- **Bug: Flush race condition** — `flush()` called concurrently from timer + `checkBatchSize()` (fire-and-forget). Both read the same batch, send duplicate data, second clear wipes new arrivals. Fixed with flushing mutex + snapshot-and-clear-before-POST pattern with re-queue on failure.
- **Bug: `trackMethod` next() always undefined** — `next` callback was `() => Promise.resolve(result!)` but `result` wasn't assigned yet when the function body executes. Any middleware calling `next()` got `undefined`. Fixed to resolve with `input`.
- **Bug: `getTimeSeriesData` wrong indexing** — 7d range created 168 hourly buckets but indexed with `Math.floor(hoursAgo / 24)`, mapping all events into buckets 0-6. 1h range only created 1 bucket instead of 60. Fixed with unified bucket sizing and proper offset calculation.
- **Process lifecycle: flush timer blocks exit** — `setInterval` keeps Node.js alive. Added `unref()`.
- **Test quality: Tests passed by accident** — Method tracking tests used `jest.fn()` mocks that were never called; assertions passed due to buggy `result!` behavior. Fixed tests to properly validate behavior.

### npm-outdated-check (2026-06-07)
- **Bug: NaN from parseInt silently disables all checks** — `cli.ts` uses `parseInt()` on `--max-major`/`--max-minor`/`--max-patch` CLI args. Non-numeric input produces `NaN`. Since `NaN > threshold` is always `false`, no package would ever be flagged. Existing `< 0` validation didn't catch it because `NaN < 0` is also `false`. Fixed with `Number.isFinite()` guard.
- **Bug: No fetch timeout** — Registry requests had no timeout. A hung connection in CI would stall indefinitely. Added `AbortSignal.timeout(30_000)`.
- **Misleading: Fake `?cached=true` param** — Appended to every registry URL but not a real npm parameter. Replaced with proper `application/vnd.npm.install-v1+json` Accept header for abbreviated metadata.
- **Missing: Registry URL validation** — No check that `--registry` is a valid URL. Typos caused cryptic fetch errors downstream. Added `new URL()` validation.
- **Dead config: `onlyViolations`** — Defined in types but never implemented. Now suppresses output when no violations.
- **Test gap: Core logic untested** — `calculateVersionDiff` and `isExcluded` had zero coverage. Added 7 test cases.

### envguard (2026-06-07)
- **Bug: Multiline quoted values completely broken** — Parser split on `\n` first, then tried per-line quote matching. `KEY="line1\nline2"` (real newline) produced garbled entries instead of one value. Any .env file with multiline values was silently corrupted.
- **Security: validateFilePath prefix bypass** — `normalized.startsWith(process.cwd())` matched `/home/user/app_secrets` when cwd was `/home/user/app`. Fixed with exact match or `/` delimiter.
- **Bug: Inline comment regex too strict** — `/\s+#\s/` required whitespace after `#`, so `KEY=value #comment` (no trailing space) kept `#comment` in the value. Fixed to `/\s+#/`.
- **Bug: fix --sort destroyed non-header comments** — Sort only preserved leading comment block, discarding all comments between keys. Fixed by grouping entries with their preceding comment blocks.
- **Cleanup: Duplicate key handling** — Made explicit in parser (last value wins) rather than implicit via `toEnvMap()`.

### git-conflicts (2026-06-08)
- **Bug: Editor command parsing broken for editors with flags** — `spawn(editor, [fullPath])` passed the entire `$EDITOR` string (e.g. `"code --wait"`) as the command name. If your EDITOR was `code --wait`, spawn tried to find a binary literally named `"code --wait"` which doesn't exist. Fixed with `parseEditorCommand()` that splits command from flags and handles quoted paths.
- **Bug: Incomplete conflict marker detection** — `hasConflictMarkers()` only checked for `<<<<<<<`. A user could manually delete just the `<<<<<<<` line and the tool would report the file as resolved, even though `=======` and `>>>>>>>` markers were still present. Also missed `|||||||` markers from diff3-style conflicts. Fixed to check all four marker types at line start (avoiding false positives from string literals containing `<<<<<<<`).
- **Bug: Relative git-dir in getMergeInfo** — `revparse --git-dir` can return relative paths like `.git`. The code did `resolve(workingDir, gitDir, 'MERGE_MSG')` which double-resolved and could produce incorrect paths. Fixed to resolve gitDir to absolute first.
- **Config: ts-jest broken by tsconfig exclusion** — Test files excluded from tsconfig caused TS2697 (`Promise` not found) errors. Pre-existing — tests couldn't actually run. Added `tsconfig.test.json`.
- **Docs: False claim in README** — Listed "Continue/abort functionality" but `--continue` doesn't exist. Also `--stage` and `--json` flags were implemented but undocumented. Fixed.

### dotenv-schema second pass (2026-06-08)
- **Security: YAML injection in Kubernetes ConfigMap exporter** — `toKubernetesConfigMap()` only escaped `"` characters. Values with newlines, colons, `{`, `[`, `!` could break YAML structure or inject arbitrary keys. Fixed with `yamlQuote()` using YAML block scalars for multiline and proper double-quote escaping.
- **Bug: Multiline default values break shell/docker exports** — Shell `export` used single quotes, newlines produced invalid multi-line shell. Docker env files silently corrupted multiline values (each line became a separate key). Fixed shell with `$'...'` ANSI-C quoting for multiline; Docker formats escape newlines to `\n`.
- **Bug: No format validation in export CLI** — `options.format as any` bypassed type checking. Typos gave unhelpful generic error. Added explicit validation with helpful message listing valid formats.

### logchef-zig second pass (2026-06-08)
- **Bug: `--since` relative durations match ALL entries** — `parseSinceTimestamp()` returned negative ms for relative durations like `5m`. Since log timestamps are positive epoch ms, `ts < since` was always false (positive < negative), so no entries were filtered. `--since 5m` showed everything instead of recent logs. Fixed by resolving relative durations against current system clock.
- **Bug: FileWatcher silently drops data on bursty writes** — `checkForNewLines()` set `last_size = new_size` (full file size) after reading at most `POLL_BUF_SIZE` (8KB). If >8KB was appended between polls, unread bytes between read position and file end were permanently skipped. Fixed to advance `last_size` by bytes actually read.
- **Misleading: `--merge` flag in help but unimplemented** — `-m`/`--merge` documented in help text but no merge logic exists (flag is accepted, does nothing). Removed from help to avoid confusion.

### TelyX second pass (2026-06-08)
- **Bug: Stack overflow from Math.min/max spread** — `getMethodPerformance()` used `Math.min(...durations)` and `Math.max(...durations)`. With >100K events, spreading into function args causes `RangeError: Maximum call stack size exceeded`. Same issue in `calculateUptime()` and `addEvents/addMetrics/addErrors` which used `push(...array)`. Fixed with reduce-based min/max and iterative push loops.
- **Bug: flush() shallow copy loses data under load** — `{ ...this.batch }` is a shallow copy; the `events`/`metrics`/`errors` arrays are shared references. Items added during the in-flight POST are included in the sent batch AND then lost when `this.batch` is replaced with empty arrays after success. Fixed with `slice()` for deep snapshot and `splice(0, sentCount)` to trim only what was actually sent.
- **Missing: No graceful shutdown** — Process exit without `destroy()` silently drops all buffered telemetry. Added `beforeExit` handler that auto-flushes. Handler properly removed in `destroy()` to avoid listener leaks.
- **Bug: flushTimer blocks process exit** — `setInterval` keeps Node.js alive. Added `unref()` so the timer does not prevent natural process exit.
- **Quality: Tests were non-functional** — Tests called methods but asserted nothing about results. `recordEvent` test just verified no throw. `trackMethod` test created a `jest.fn()` mock that was never called; assertions passed vacuously. Rewrote with 16 meaningful assertions.

### gitpanic (2026-06-07)
- **Bug: Reflog timestamps use commit dates** — `getReflog()` got timestamps via `git log -1 --format=%ct <sha>` which returns when the commit was authored, NOT when the reflog entry was written. A `git checkout main` done now but pointing to a 3-day-old commit would be timestamped 3 days ago. All time-based detectors (hard reset, deleted branch, force push, stash drop) were unreliable — they'd miss recent events on old commits and flag ancient events on recent checkouts. Fixed by using `git reflog --format` with `%ct` which returns the actual reflog entry timestamp.
- **Performance: N+1 query pattern** — Each reflog entry triggered a separate `git log` subprocess for timestamps. `getReflog(30)` = 31 git processes. Replaced with single `git reflog` call using custom `--format` string.
- **Bug: `maxOption` variable shadowing** — Declared twice in `cli.ts main()`, second shadows first. Renamed to `maxDisaster` and `maxRecoveryOption`.
- **Minor: Unused destructured variables** — `lastBranchSha`, `commitMessage`, `stagedCount`, `unstagedCount` destructured but not used in method bodies. Added `void` expressions.
- **Bug: Multiline quoted values completely broken** — Parser split on `\n` first, then tried per-line quote matching. `KEY="line1\nline2"` (real newline) produced garbled entries instead of one value. Any .env file with multiline values was silently corrupted.
- **Security: validateFilePath prefix bypass** — `normalized.startsWith(process.cwd())` matched `/home/user/app_secrets` when cwd was `/home/user/app`. Fixed with exact match or `/` delimiter.
- **Bug: Inline comment regex too strict** — `/\s+#\s/` required whitespace after `#`, so `KEY=value #comment` (no trailing space) kept `#comment` in the value. Fixed to `/\s+#/`.
- **Bug: fix --sort destroyed non-header comments** — Sort only preserved leading comment block, discarding all comments between keys. Fixed by grouping entries with their preceding comment blocks.
- **Cleanup: Duplicate key handling** — Made explicit in parser (last value wins) rather than implicit via `toEnvMap()`.

### envguard third pass (2026-06-08)
- **Security: `--output` flag bypasses validateFilePath** — `runFix()` passed `options.output` directly to `writeFileSync` without going through `validateFilePath()`. Path traversal protection that guards every other file operation was bypassed here. `envguard fix .env .env.example --output ../../etc/cron.d/malicious` would write to arbitrary locations outside cwd. Fixed.
- **Bug: extractAnnotations() matches annotations inside quoted values** — For `KEY="value # @required"`, `rawAfterKey` includes everything inside quotes. The `@required` regex found a match in the quoted string, falsely marking the key as required. Fixed to skip over quoted value portions before scanning for annotations.
- **Bug: runFix() strips inline comments from existing entries** — Writing back entries used `${key}=${envMap.get(key)}` which discards inline comments. `KEY=value # production` became `KEY=value`. Fixed to extract and preserve inline comments from the original .env.
- **Bug: runFix() comment reconstruction loses formatting** — Comments stored as trimmed text, reconstructed as `# text`. `## heading` became `# # heading`. Fixed to preserve original raw comment lines.

### npm-outdated-check second pass (2026-06-08)
- **Bug: `--dep dev` still checks prod deps** — `getPackageInfo()` always iterated `dependencies` unconditionally, only guarding `devDependencies` behind the include check. `--dep dev` would still check production dependencies. Fixed with `includes('prod')` guard.
- **Bug: Scoped packages break registry requests** — `@types/node` was concatenated directly into URL without encoding, producing `registry.npmjs.org/@types/node` which returns 404. Fixed with `encodeURIComponent()`.
- **Fix: Fake `?cached=true` query param** — Not a real npm API feature. Replaced with proper `application/vnd.npm.install-v1+json` Accept header for abbreviated metadata.
- **Fix: No fetch timeout** — Registry requests had no timeout; hung connection would stall CI indefinitely. Added `AbortSignal.timeout(30_000)`.
- **Bug: `failOnAny` config completely dead** — `getExitCode()` always returned 1 on violations without checking `config.failOnAny`. Flag existed in types, CLI, and config but did nothing. Now `failOnAny: false` enables report-only mode (exit 0 with violations). Default changed to `true` to preserve current behavior.
- **Docs: `--fail-on-any` missing from README** — Implemented but undocumented. Added to CLI options table.

### docker-remote-deployment-action third pass (2026-06-08)
- **Security: Shell injection in deployment arguments** — `INPUT_ARGS` variable contained raw shell metacharacters that were executed literally, allowing command injection attacks via crafted arguments. Added input validation with regex to block dangerous characters `[;&|\`$()]`.
- **Security: Silent failures in critical operations** — SSH, Docker login, and context creation failures were silently ignored, potentially leaving deployments in inconsistent states. Added comprehensive error handling with explicit error messages and exit codes.
- **Reliability: Docker context creation failures** — `docker context create` was not idempotent; second attempts in CI/CD failed without cleanup. Added context removal before creation and proper error handling.
- **Security: No input validation** — Deployment arguments, file paths, and numeric values were not validated for dangerous content or valid formats. Added proper validation with helpful error messages.
- **Reliability: Poor error handling throughout** — SSH operations, Docker operations, and file operations lacked proper error checking. Added `if ! command; then echo "Error: ..." ; exit 1; fi` pattern consistently.
- **User Experience: No warnings for destructive operations** — `docker system prune -a` runs without user confirmation or warning. Added explicit warning message before execution.
- **Security: Argument quoting vulnerabilities** — Pre-deployment commands and arguments were not properly quoted, leading to word-splitting and potential injection. Fixed with `printf '%q'` proper escaping.

### TelyX third pass (2026-06-08)
- **Bug: getTimeSeriesData wrong bucket count for 7d range** — Logic `Math.floor(hoursAgo / 24)` created only 7 buckets for 7-day range instead of 168 hourly buckets. All events were grouped into daily buckets, losing hourly granularity. Fixed to use proper hourly indexing (168 buckets for 7d).

### logchef-zig third pass (2026-06-08)
- **Misleading: --merge flag in help but unimplemented** - `-m, --merge` option documented in usage text but not actually implemented in CLI parser or logic. Confusing to users.
- **Inconsistent: --since claims relative durations but can't resolve them** - Help text mentions "relative like 5m, 1h, 2d" but `parseSinceTimestamp()` had no clock access and returned negative values that made the filter non-functional. Simplified to only support ISO 8601 timestamps.
