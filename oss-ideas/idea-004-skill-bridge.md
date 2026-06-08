# Idea #004: `skill-bridge` — Universal Agent Skill Adapter

**Date:** 2026-06-06
**Status:** Validated, unoccupied gap

## The Problem

There are now 15+ agent skill registries and frameworks (Claude Code skills, Cursor rules, Codex CLI plugins, Gemini CLI skills, AG-UI skills via CopilotKit). Each has its own format, directory structure, and runtime expectations.

If you write a great skill for Claude Code, it doesn't work on Cursor. A CopilotKit integration won't run on Codex. Zero interop.

GitHub trending is full of skill repos (last30days-skill, superpowers, career-ops) — but each is locked to one agent.

## Evidence of Demand

- **NIST announced AI Agent Standards Initiative** (Feb 2026) — explicit push for interoperability standards
- **AAIF (Agentic AI Foundation)** formed — hosting agentgateway for MCP/A2A traffic
- **SKILL.md spec** being promoted by agensi.io — "Write once, run across Claude Code, Codex CLI, Cursor, Gemini CLI"
- But SKILL.md is just a spec document. No actual runtime/adapter tool exists.
- **Agent-Reach** (trending today) — gives agents "eyes to see the internet" but only works as a standalone skill
- **last30days-skill** trending — research skill, single agent
- **superpowers** by obra — skills framework, but agent-specific

## The Gap

Nobody has built the actual bridge tool. There's a spec (SKILL.md), a standards body (NIST/AAIF), massive demand (every agent developer), but no CLI that says:

```bash
skill-bridge adapt --from claude-code --to cursor ./my-skill/
skill-bridge run --agent auto ./my-skill/
```

## The Idea

`skill-bridge` — a CLI that:
1. **Detects** skill format (Claude Code AGENTS.md, Cursor .cursorrules, Codex plugin, etc.)
2. **Converts** between formats — translating prompt structure, tool definitions, context conventions
3. **Validates** skills against multiple agent runtimes
4. **Publishes** to a universal registry (or adapts for existing ones)

Think of it like **Babel for AI agent skills**.

## Why Now

- Agent ecosystem is exploding but fragmented
- NIST standards push creates legitimacy and timing
- SKILL.md exists as a target spec but needs tooling
- Developer pain is immediate — everyone writing skills for one agent wishes they worked everywhere

## Competition

- `agensi.io` — promoting SKILL.md spec but no adapter tool
- `agentgateway` (AAIF) — gateway for traffic, not skill format translation
- Individual skill repos — each solves their own agent only

## Buildability

Weekend project? Maybe 2 weekends.
- Core is text transformation (prompt templates, tool definitions)
- Format specs are publicly documented for each agent
- Could start with just Claude Code ↔ Cursor ↔ Codex

## Monetization

- OSS core (the adapter CLI)
- Paid: hosted skill registry, CI validation, team skill management
- Enterprise: custom agent skill pipelines

## Score

| Criteria | Rating |
|---|---|
| Developer Pain | 🔥🔥🔥🔥🔥 |
| Market Size | 🔥🔥🔥🔥 (every agent dev) |
| Competition | 🔥 (none in this exact niche) |
| Build Speed | 🔥🔥🔥 (2 weekends) |
| Monetization | 🔥🔥🔥 (clear path) |
| Timing | 🔥🔥🔥🔥🔥 (NIST + AAIF + ecosystem explosion) |

**Overall: Strong build candidate. This is the right idea at the right time.**
