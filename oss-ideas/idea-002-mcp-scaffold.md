# Idea #002: MCP Server Auto-Scaffold from OpenAPI Specs

**Date:** 2026-06-06
**Status:** Researching
**Weekend-buildable:** Yes (MVP in 1-2 days)

## The Problem

The MCP (Model Context Protocol) ecosystem is exploding — CopilotKit at 33k stars, OpenAI plugins trending, every agent framework adopting it. But building an MCP server is still manual boilerplate work. You have to write tool definitions, handle parameter validation, wire up error handling, write tests. For any existing API, this is pure drudgery.

Meanwhile, thousands of APIs already have OpenAPI/Swagger specs. The bridge between "existing API" and "MCP-ready tool" is missing.

## Evidence

- **CopilotKit** — 32,984 stars, 613/day trending. AG-UI protocol gaining traction
- **openai/plugins** — back on trending (215 stars/day), OpenAI betting on plugin ecosystem
- **mcp-testing-framework** exists (haakco) but only handles testing, not generation
- **Personal_AI_Infrastructure** — 14,810 stars, people building agent stacks
- Thousands of APIs with OpenAPI specs (Stripe, GitHub, Slack, Notion, etc.)
- MCP SDK exists for TypeScript/Python but no scaffolding tool

## The Gap

There's no tool that:
1. Takes an OpenAPI/Postman spec as input
2. Generates a fully working MCP server with proper tool definitions
3. Auto-generates tests based on the spec (using mcp-testing-framework)
4. Handles auth (API keys, OAuth) via env vars or config
5. Produces a ready-to-publish npm/PyPI package

Think of it like `create-react-app` but for MCP servers. Point it at any API spec, get a working MCP server.

## Why Now

- MCP is becoming the standard protocol for agent-tool communication
- Every SaaS wants to be "agent-friendly" but MCP server dev is friction
- OpenAPI specs are already widespread
- The agent ecosystem needs more tools FAST — generation beats manual creation

## Competition

- **MCP SDK** — low-level, you still write everything manually
- **mcp-testing-framework** — testing only, no generation
- **Various MCP template repos** — one-offs, not dynamic
- No one does "spec → working MCP server" end-to-end

## Monetization Angle

- Core generator: free, open-source, MIT
- Premium templates: pre-built MCP servers for popular APIs (Stripe, GitHub, etc.) with enhanced features
- Managed registry: host & discover generated MCP servers
- Enterprise: custom API → MCP pipeline, compliance, SLA

## Technical Feasibility

- Parse OpenAPI spec with existing parsers (swagger-parser, etc.)
- Generate MCP tool definitions from spec paths/operations
- Map OpenAPI schemas → JSON Schema (MCP uses JSON Schema for params)
- TypeScript CLI, output as npm package
- MVP: `npx mcp-scaffold --spec openapi.yaml --output ./my-mcp-server`

## Risks

- OpenAI or Anthropic might ship something similar officially
- MCP spec is still evolving
- Complex APIs (OAuth flows, webhooks) need special handling
- Quality of generated servers depends on spec quality

## Score

| Dimension | Rating (1-5) |
|-----------|-------------|
| Demand signal | ⭐⭐⭐⭐ |
| Competition gap | ⭐⭐⭐⭐⭐ |
| Weekend-buildable | ⭐⭐⭐⭐⭐ |
| Monetization potential | ⭐⭐⭐ |
| Sustainability | ⭐⭐⭐⭐ |
