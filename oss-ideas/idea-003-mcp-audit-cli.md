# Idea #003: `mcp-audit` — Security Scanner for MCP Servers

**Date:** 2026-06-06
**Status:** Validated — genuine gap

## The Problem

Everyone's installing MCP servers like crazy (plugins, tools, integrations). But there's no `npm audit` equivalent for MCP. You install a random MCP server from GitHub and it gets:
- Full access to your filesystem
- Ability to exfiltrate context/data
- Prompt injection vectors
- Credential access

There are 5+ blog posts about "MCP security best practices" (ChatForest, aiforanything, clawdcontext, practical-devsecops) and a directory (mcpverified.com) — but **no open-source CLI that actually scans your servers**. The ecosystem has guides but no tooling.

## The Idea

A CLI tool (`mcp-audit`) that:

1. **Scans MCP server configs** — checks `claude_desktop_config.json`, `.cursor/mcp.json`, or any MCP config for risky permissions
2. **Static analysis of server code** — detects common vulnerabilities:
   - Unrestricted filesystem access
   - Missing input sanitization (prompt injection vectors)
   - Hardcoded credentials/secrets
   - Overly permissive tool definitions
   - Unencrypted network calls
3. **Trust scoring** — checks if the server's GitHub repo has: tests, CI, known authors, CVE history, stars
4. **Vulnerability database** — community-maintained list of known-vulnerable MCP servers (like Snyk's vuln DB)
5. **CI integration** — `mcp-audit check` in your CI pipeline

## Why Now

- MCP adoption is exploding (every AI tool adding MCP support)
- CVE-2026-27825 and CVE-2026-5058 are real MCP vulnerabilities already
- People are installing random MCP servers without thinking about security
- Zero competition in the open-source CLI space for this

## Competition

- **mcpverified.com** — manual directory/reviews, not a tool
- **Semgrep MCP** — exists but is a Semgrep integration, not purpose-built
- Blog posts — guidance only, no automation
- **Nobody** has built a dedicated `npm audit`-style CLI for MCP

## Buildability

- **Weekend project?** Yes for v1 (config scanning + basic static analysis)
- **Tech:** TypeScript/Node.js, fits naturally in the MCP ecosystem
- **Monetization:** SaaS vuln DB (like Snyk), GitHub Action, enterprise policies
- **Distribution:** npm package, GitHub Action marketplace

## Demand Signals

- Multiple security guides published in 2026 → people know the problem
- Real CVEs already assigned → not theoretical
- "Top MCP Security Tools" listicles exist but list gateways/scanners for OTHER things
- Every MCP server is a potential attack surface

## Risks

- MCP spec could change (but it's stabilizing)
- Security space gets crowded fast
- Needs community to maintain vuln DB

## Verdict

**Strong idea.** Real problem, no competition in this specific niche, buildable in a weekend, clear monetization path. The `npm audit` for MCP servers.
