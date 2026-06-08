# Idea #001: AI Agent Cost & Token Observatory

**Date:** 2026-06-06
**Status:** Researching
**Weekend-buildable:** Yes (MVP in 2-3 days)

## The Problem

Every developer building AI agents is bleeding money on tokens and nobody has a good way to see where the waste is. The trending "headroom" repo (15k stars in days) proves the demand — devs are desperate to compress context. But compression is reactive. What's missing is **observability**: a tool that shows you WHERE your tokens are going, which tools/agents burn the most, and what you should optimize first.

## Evidence

- **headroom** (chopratejas/headroom) — 15,195 stars, trending at 2,473/day. LLM token compression. The space is hot.
- **Context-Life MCP** — context optimization MCP server, growing fast
- **Claw Compactor** — 97% token reduction for OpenClaw, 5-layer compression
- **mem0** — 21+ framework integrations for agent memory, massive adoption
- All of these are *solutions* to token waste, but none give you *visibility* into the waste first

## The Gap

There's no good open-source tool that:
1. Plugs into your agent framework (LangChain, CrewAI, OpenClaw, CopilotKit, etc.)
2. Tracks token usage per tool call, per agent, per conversation
3. Shows you a breakdown: "your RAG retrieval is 40% of your tokens but only used 10% of the time"
4. Recommends what to compress or trim
5. Works as an MCP server so it drops into any setup

Think of it like **Datadog for LLM token costs**, but open source, local-first, and agent-aware.

## Why Now

- Agent frameworks exploding (CopilotKit 33k stars, Flue 4.6k, AG-UI protocol)
- Every agent team hits the cost wall eventually
- No dominant open-source observability tool for this yet
- MCP makes integration trivial — one server, every framework

## Competition

- **LangSmith / LangFuse** — full observability platforms but heavy, SaaS-focused, not lightweight
- **Helicone** — API proxy approach, closed-source core
- **headroom** — compression only, no visibility
- Nobody does "just the token cost breakdown" well and open-source

## Monetization Angle

- Core tool: free, open-source, MIT
- Cloud dashboard for teams: paid tier (team-wide cost tracking, alerts, budgets)
- Enterprise: SSO, compliance, on-prem support

## Technical Feasibility

- MCP server in TypeScript — wraps existing agent calls
- Token counting via tiktoken or similar
- SQLite for local storage, optional sync
- Simple web UI (React) for the dashboard
- MVP could be: intercept tool calls via MCP, count tokens, show breakdown

## Risks

- LangSmith/LangFuse could add a lightweight mode
- Token counting accuracy across models
- Framework diversity = lots of edge cases

## Score

| Dimension | Rating (1-5) |
|-----------|-------------|
| Demand signal | ⭐⭐⭐⭐⭐ |
| Competition gap | ⭐⭐⭐⭐ |
| Weekend-buildable | ⭐⭐⭐⭐ |
| Monetization potential | ⭐⭐⭐⭐ |
| Sustainability | ⭐⭐⭐⭐ |
