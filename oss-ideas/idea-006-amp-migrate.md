# Idea 006: `amp-migrate` — Agent Memory Migration CLI

**Date:** 2026-06-07
**Status:** ⭐ STRONG — Clean gap, spec exists, no implementation

## The Problem

Every AI agent tool (ChatGPT, Claude, Gemini, Cursor, OpenClaw, Codex) stores user memory/context differently. When you switch tools, you start from zero. Your agent doesn't know your preferences, past decisions, or project context.

The Agent Memory Protocol (AMP) spec exists (v0.1) and defines a portable, markdown-first, git-friendly format. But **nobody built the migration tool**. The AMP team says "we're building the reference implementation" but it doesn't exist yet.

## The Gap

- **AMP spec**: Defines import paths from 7+ sources (ChatGPT JSON, Claude conversations, Gemini Takeout, Mem0, MemPalace, OpenClaw MEMORY.md, plain markdown)
- **amp-memory (PyPI)**: A memory *server*, not a migration tool
- **ImportMemory.com**: A guide site, not a tool
- **No CLI exists** that actually does the conversion

## What `amp-migrate` Would Do

```bash
# Export from a specific tool
amp-migrate export --from claude --input ~/claude-export.json --out .amp/

# Import from any source into AMP format
amp-migrate import --source chatgpt --file ~/chatgpt-export.zip

# Validate an AMP store
amp-migrate validate .amp/

# Migrate between agents
amp-migrate transfer --from openclaw --to claude --memory .amp/
```

Core features:
1. **Parsers** for each agent's export format (ChatGPT JSON, Claude conversations, OpenClaw MEMORY.md, etc.)
2. **Conversion** to AMP node format (markdown + frontmatter)
3. **Deduplication** — detect overlapping memories across sources
4. **Validation** — ensure AMP stores conform to spec
5. **MCP integration** — expose as MCP server so agents can read/write portable memory

## Why Now

- AMP spec just hit v0.1 — first-mover on tooling wins
- Agent memory portability is a hot topic (ImportMemory.com, recipient.cloud articles)
- Every major agent framework now has some form of memory — fragmentation is peak
- The spec team is "building reference implementation" — you could beat them or contribute

## Competition

| Tool | What it does | Gap |
|------|-------------|-----|
| amp-memory (PyPI) | Memory server | Not a migration CLI |
| ImportMemory.com | Guide/site | Not a tool |
| AMP reference impl | Coming soon | Not released yet |

## Buildability

**Weekend project: ✅**

The hard part is parsing different export formats. Each is a separate module:
- ChatGPT: JSON export (well-documented)
- Claude: Conversation JSON (straightforward)
- OpenClaw: MEMORY.md (just markdown)
- Gemini: Google Takeout ZIP (needs unzip + JSON parse)
- Plain markdown: Add frontmatter, detect wiki-links

AMP output is just `.md` files with YAML frontmatter in a directory structure. Trivial to generate.

## Monetization

- **CLI**: Open source (Apache-2.0 to match AMP)
- **Cloud service**: Continuous memory sync between agents (paid)
- **Hosted memory layer**: Your agent memory, available everywhere via API
- **Enterprise**: Memory audit/compliance for orgs using multiple AI tools

## Risk

- AMP spec is v0.1 — could change. But markdown-first format is stable enough.
- AMP team might ship their own reference implementation soon
- Agent vendors might build their own export tools (but none have yet)

## Verdict

This is the `skill-bridge` play but for memory instead of skills. Unlike skill-bridge where someone else built it first, **this gap is wide open**. The spec defines the target, the parsers are tractable, and the demand is proven by the conversation around ImportMemory.com and AMP itself.

Build it fast, get it into the AMP org as a community tool, own the memory portability layer.
