# OSS Review State

**Last updated:** 2026-06-08 18:40 WIB

## Current Position
- **Repo:** TelyX (fourth pass)
- **Branch:** main
- **PR:** https://github.com/sulthonzh/TelyX/pull/new/main

## Repo Rotation
1. ✅ dotenv-schema — PR #3 submitted (parser + validator fixes)
2. ✅ docker-remote-deployment-action — PR #33 submitted (security + shell fixes)
3. ✅ TelyX — PR #29 submitted (flush race, trackMethod, getTimeSeriesData)
4. ✅ logchef-zig — PR #17 submitted (JSON escaping, since filter, follow leak)
5. ✅ npm-outdated-check — PR #10 submitted (NaN parse, fetch timeout, dead config)
6. ✅ envguard — PR #3 submitted (multiline parser, validateFilePath bypass, inline comments, sort fix)
7. ✅ dotforge — empty repo, skipped
8. ✅ gitpanic — PR #6 submitted (reflog timestamps, N+1 queries, CLI shadowing)
9. ✅ git-conflicts — PR #6 submitted (editor parsing, conflict markers, relative git-dir)

## Second Pass
1. ✅ dotenv-schema — PR #4 (YAML injection, multiline safety in exporter)
2. ✅ logchef-zig — PR #18 (--since relative durations always matching, FileWatcher data loss, misleading --merge help)
3. ✅ TelyX — PR #30 (stack overflow in analytics, flush shallow-copy data loss, no graceful shutdown, non-functional tests)
4. ✅ envguard — PR #4 (output path traversal bypass, annotation false positives in quoted values, fix strips inline comments, comment formatting loss)
5. ✅ npm-outdated-check — PR #13 (--dep flag ignored for prod, scoped packages 404, dead failOnAny, no fetch timeout)

## Third Pass
1. ✅ envguard — PR #4 (output path traversal bypass, annotation false positives in quoted values, fix strips inline comments, comment formatting loss)
2. ✅ docker-remote-deployment-action — PR #35 (comprehensive security fixes: shell injection prevention, SSH error handling, Docker context safety, argument quoting, operation warnings)
3. ✅ TelyX — PR #31 (timeseries indexing fix for 7d range, ensure proper hourly buckets)
4. ✅ logchef-zig — PR #19 (remove misleading --merge flag, simplify --since to ISO 8601 only)

## Fourth Pass
1. ✅ TelyX — PR #32 (critical bugs: stack overflow in analytics, time series indexing, race condition, memory leak)
2. logchef-zig — pending

## Notes
- dotforge: repo exists but is empty, nothing to review.
- First pass PRs still pending review by maintainer (none merged yet).
