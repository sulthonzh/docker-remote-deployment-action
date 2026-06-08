# OSS Idea Researcher — State

## Last Updated: 2026-06-08 19:23 WIB

## Cycle Count: 31

## Researched Topics
- Developer tool gaps 2026
- GitHub trending (June 6, 2026)
- LLM context compression tools
- AI agent memory systems
- Database schema visualization
- Local-first sync engines (well-served: ElectricSQL, PowerSync, CRDTs)
- Dev environment reproducibility (well-served: DevPod, Devbox, Nix)
- MCP ecosystem explosion — servers, testing, tooling
- GitHub trending analysis (June 6 evening): CopilotKit, openai/plugins, mxc, MemPalace, superpowers
- Agent skill interoperability — NIST standards, AAIF, SKILL.md spec, 15+ registries, zero bridges
- Local AI dev tools — well-served (Ollama, vLLM, LM Studio, 152+ tools)
- Agent testing/debugging tools — AgentLens, RAMPART, EvalView, Rogue, Agent-CI (CROWDING)
- MCP trust/scoring — mcp-scorecard, mcp-trust.com, CraftedTrust, MCPSafe (SATURATING)
- Agent config/instruction portability — per-vendor formats (AGENTS.md, CLAUDE.md, .cursorrules), no unified tool
- GitHub trending (June 6 late night): Agent-Reach, Headroom (token compression), NousResearch/hermes-agent, Microsoft VibeVoice, withastro/flue
- AI test generation (June 7): WELL-SERVED — CodiumAI, Testim, Mabl, QA Wolf, TestSigma, TestMu. Not a gap.
- Edge AI tooling (June 7): WELL-SERVED — Intel edge-ai-libraries, ExecuTorch, NVIDIA Jetson, LF Edge ecosystem. Mature.
- Browser automation testing (June 7): WELL-SERVED — Playwright dominates (70K+ stars). Not a gap.
- AI agent cost optimization (June 7): WELL-SERVED — guides, OpenObserve, Braintrust, Headroom. Observability + optimization covered.
- GitHub trending (June 7 early morning): open-notebook (26K stars, 783/day), career-ops (49K stars!), last30days-skill. No new tool gaps.
- Headroom — Netflix engineer, token compression proxy, presented at OSS Summit NA 2026
- Agent-Reach — 20K+ stars, gives agents structured web access
- **skill-bridge EXISTS** — agentenatalie/skill-bridge on GitHub. CLI-first skill migration tool. Someone built it. Gap closing.
- **Universal Agent Skill spec** — spesans.github.io has vendor-neutral SSOT spec. More standardization happening.
- **Flue (withastro/flue)** — Sandbox agent framework from Astro team, ~3.8K stars, TypeScript, Apache-2.0. Agent execution environment, not a gap.
- **Voice AI stack** — Fully mature in 2026 (Parakeet STT, Chatterbox TTS, Dograh/Pipecat/LiveKit/Vapi orchestration). But testing/eval tooling is completely missing.
- **Voice agent observability** — General tools (Langfuse, Phoenix, AgentOps) are text-focused. Voice-specific observability is emerging but thin. Vapi community asking for it.
- **Dograh** — OSS voice agent platform like n8n. Orchestration, not testing.
- Agent skill package manager space (June 7 morning): SATURATED — 9+ tools on GitHub. Not a gap.
- Agent skill linter space (June 7 morning): 2 tools exist (small). Gap is narrow and closing.
- GitHub trending (June 7 morning): ECC (209K, agent harness), hermes-agent (184K), markitdown (146K), taste-skill (35K), VoxCPM (27K TTS), supermemory (25K), compound-engineering-plugin (20K), headroom (15K), liteparse (9.3K Rust parser), stop-slop (9K), oh-my-pi (10.9K terminal AI), revfactory/harness (6.2K agent team meta-skill)
- Agent skill ecosystem reached MATURITY — package managers (9+), linters (2+), registries, quality control (taste-skill, stop-slop). Infrastructure built.
- Unified document parsing API — LiteParse (9.2K, LlamaIndex, Rust/TS) + MarkItDown (139K, Microsoft, Python). Different niches. Wrapping both = too thin, not a gap.
- **AI video generation tooling** — Demand 329% YoY (Upwork 2026). VBench is academic. No developer CLI for video eval. Gap exists but market is smaller than voice.
- GitHub trending (June 7): Same projects as before. open-notebook, career-ops, last30days-skill, CopilotKit. No new gaps.
- Agent CI/CD regression testing (June 7 night): WELL-SERVED — promptfoo (huge), Confident AI, EvalView, Braintrust, Arize Phoenix, Langfuse. Not a gap.
- AI guardrails (June 7 night): WELL-SERVED — NeMo Guardrails (NVIDIA), Guardrails AI (6.6K stars), OpenAI Guardrails. Saturated.
- LLM structured output validation (June 7 night): WELL-SERVED — all providers have native structured output now, Zod/Pydantic mature. Cross-provider is fragmented but handled by SDKs.
- On-device AI model compression (June 7 night): Fragmented but research-heavy. GPTQModel, llama.cpp, OneComp (academic). Not a weekend build. Well-served by individual tools.
- AI error monitoring (June 7 night): Sentry dominates general + adding AI features. Airweave does context retrieval for agents. Not a clean gap.
- Agent state persistence/checkpointing (June 7 night): ACTIVE — Google ADK, persistent-agent-runtime, Temporal, Inngest. Workflow engines own this space. Not a standalone tool gap.
- Agent versioning/rollback (June 7 late night): Pattern well-documented (callsphere.ai, agentpatterns.tech). Tools: Libra (71 stars, AI-native VCS), PromptLane, PromptVersion. Prompt versioning exists. Full agent versioning (prompt+model+tools+eval as unit) is a pattern not a tool gap — teams use Git+config. NOT A GAP.
- Fine-tuning developer experience (June 7 late night): xlmtec (Python CLI, MIT, LoRA/QLoRA/DPO/pruning). Well-covered for CLI. NOT A GAP.

## Ideas Logged
- [x] [2026-06-06] AI Agent Cost Observatory — see idea-001-agent-cost-observatory.md
- [x] [2026-06-06] MCP Server Auto-Scaffold from OpenAPI — see idea-002-mcp-scaffold.md
- [x] [2026-06-06] `mcp-audit` — Security Scanner CLI for MCP Servers — see idea-003-mcp-audit-cli.md
  - ⚠️ NOTE: Space is now saturating. Less differentiated.
- [x] [2026-06-06] `skill-bridge` — Universal Agent Skill Adapter — see idea-004-skill-bridge.md ⭐ **STRONG**
  - ⚠️ UPDATE: Someone else is building it (agentenatalie/skill-bridge). Gap is closing. Still differentiated by approach but first-mover is gone.
- [x] [2026-06-07] `voicecheck` — Voice Agent Evaluation & Testing CLI — see idea-005-voice-agent-eval.md ⭐ **STRONG**
  - Clean gap: no OSS tool tests full voice pipeline. Voice AI stack mature but testing missing entirely.
- [x] [2026-06-07] `amp-migrate` — Agent Memory Migration CLI — see idea-006-amp-migrate.md ⭐ **STRONG**
  - AMP spec exists (v0.1) but no migration CLI. Spec team building ref impl but not released. Wide open.
- [x] [2026-06-07] `videocheck` — AI Video Generation Evaluation CLI — see idea-007-video-eval-cli.md ⭐⭐ **MODERATE**
  - Gap exists (VBench is academic, no dev CLI) but thinner than voicecheck. Video eval is more niche.
- [x] [2026-06-08] `siri-ext-test` — Siri Extensions Local Testing CLI — see idea-008-siri-ext-test.md ⭐⭐ **STRONG**
  - Day 0 of API (WWDC 2026). Zero competition. Follows voicecheck pattern. Massive iOS dev market. Build after beta SDK docs available.

## Observations
- Local-first sync is mature — no easy gap there
- Dev env reproducibility also well-served
- MCP ecosystem is the clear hotspot right now — everyone building on it but tooling is thin
- Agent skills/frameworks trending hard but fragmented
- Local AI dev is saturated — 152+ tools, Ollama dominates
- **Agent skill interoperability gap is closing** — agentenatalie built skill-bridge, spesans has Universal Agent Skill spec. First-mover gone but room for differentiation.
- Agent testing/debugging space is crowding fast — not a clean gap anymore
- MCP trust/scoring is saturating — at least 4 tools launched recently
- **Voice agent testing/eval gap is NARROWING.** EVA (ServiceNow) is research-grade but serious. Gap still exists for developer-friendly CLI but it's closing.
- **Headroom derivative gap is CLOSING.** Headroom now has proxy server, TS SDK, POST /v1/compress endpoint. Well-established.
- **AI test generation is saturated** — 10+ tools in 2026. CodiumAI/Qodo leading.
- **Edge AI tooling is mature** — Intel, NVIDIA, Apple, Qualcomm all have frameworks.
- **Agent cost optimization** is covered by guides + observability tools. Not a fresh gap.
- **Agent memory portability** is heating up: AMP spec v0.1, ImportMemory.com. But tooling is missing.
- **MCP composition patterns** are being documented — ecosystem maturation, not a gap.
- Agent Memory Protocol has 7+ defined import sources but zero parsers implemented. Clean implementation gap.
- **Agent skill package manager space is SATURATED** — 9+ tools. Stop exploring.
- **Agent skill ecosystem has reached maturity** — distribution, quality control, linting all covered. New gaps will be in validation/CI, not distribution.
- **Meta-pattern emerging**: Every AI modality (voice, video, agents, code) gets models first, then evaluation tooling lags 1-2 years. voicecheck and videocheck both follow this pattern. voicecheck is the better bet (bigger market, more mature stack).
- **Unified document parsing** — LiteParse + MarkItDown cover different niches well. A routing wrapper would be too thin to differentiate. Not a gap worth pursuing.

## Next Cycle Focus
- **siri-ext-test (idea-008) is the freshest lead** — monitor iOS 27 beta SDK docs this week to validate API surface
- **Watch for**: Core AI MCP tooling gaps, foldable layout testing tools, Core ML→Core AI migration tooling (Apple will ship but may be incomplete)
- **Standing strong**: voicecheck, amp-migrate, siri-ext-test
- **Resume exploring**: iOS 27 / Core AI developer tooling ecosystem — biggest platform shift since SwiftUI
- **Still stop exploring**: skill package managers, skill linters, MCP trust/scoring, AI test gen, edge AI, browser testing, local AI, agent cost optimization, agent CI/CD, AI guardrails, structured output validation, agent state persistence, agent versioning, fine-tuning DX, AI code review
- **GitHub trending (June 8 early morning)**: turbovec (6.9K, 1.5K/day, Rust vector index), pg_durable (Microsoft, durable execution in Postgres), tolaria (12.8K, markdown KB desktop app), project-nomad (29.6K, offline survival computer), AiToEarn (18.7K). No new tool gaps.
- **New model releases**: MiniMax M3 (1M context, computer use, SWE-Bench 59%), NVIDIA Cosmos 3 (physical AI/robotics), ZAYA1-8B (AMD-trained sparse). Incremental, not new capability waves.
- **pg_durable observation**: Durable execution inside Postgres by Microsoft. Interesting primitive but workflow/agent orchestration space already well-served (Temporal, Inngest, Google ADK). NOT A GAP for third-party tooling.
- **turbovec observation**: Vector index on TurboQuant, Rust/Python. Infrastructure play by RyanCodrai, not a gap — vector DB space is saturated (Qdrant, Milvus, Chroma, Weaviate).
- **AI-native database developer tooling** (June 8): WELL-SERVED — SchemaForge, Bytebase, AI SQL tools (BuilderAI, BeeKeeper Studio), aidevstackradar review. Migration, optimization, design all covered. NOT A GAP.
- **Multimodal agent observability** (June 8): WELL-SERVED — 17+ observability tools in 2026 (AgentOps, Langfuse, Phoenix, etc.). Most adding multimodal support. NOT A GAP.
- **Computer-use agent testing** (June 8): WELL-SERVED — trycua/cua (major OSS framework), OpenCUA (research), OSWorld benchmark, GUI-360° dataset. Serious infrastructure exists. NOT A GAP.
- **Remaining new areas to explore**: iOS 27 / Core AI ecosystem tooling gaps (Siri Extensions testing, Core AI MCP tool generation, foldable layout testing). WWDC 2026 opened a new wave.
- **Stop exploring**: AI code review, local model benchmarking, AI-native DB tooling, multimodal observability, CUA testing
- **Meta observation**: After 17 cycles, the most promising ideas follow the pattern: new AI capability → mature models → missing developer tooling. Watch for what's NEW in AI capabilities (not what's mature). Many "gaps" are actually patterns teams solve with Git+config.
- **Cycle 18 observation**: All exploration areas exhausted. AI code migration CLI (Codex CLI, Sweet CLI, Cloving — saturated) and agent dry-run/simulation (OpenSandbox Alibaba/CNCF, AIO Sandbox, Google ADK — saturated) both well-served. The three strongest ideas (voicecheck, amp-migrate, videocheck) remain from early cycles. Recommending pause until new AI capability waves create fresh gaps.
- **Cycle 20 observation**: Searched new AI tooling articles for June 2026 — same model releases (MiniMax M3, Cosmos 3, ZAYA1-8B), no new capability waves. GitHub trending same projects. No fresh gaps. Standing recommendation: pause until new AI modality or capability emerges.
- **Cycle 21 observation**: Checked launchaijam.com (new AI tools this week — all consumer/SaaS, no dev tooling gaps), devflokers roundup (same MiniMax M3, Cosmos 3, ZAYA1-8B coverage). Nothing new. Confirming pause recommendation.
- **Cycle 22 observation**: GitHub trending identical to cycle 20/21. Same projects: last30days-skill, taste-skill, hermes-agent, open-notebook, turbovec, pg_durable, tolaria, project-nomad, AiToEarn. Zero new entries representing dev tooling gaps. Pause recommendation maintained.
- **Cycle 23 observation**: GitHub trending + search results identical to cycles 20-22. Same model releases (MiniMax M3, Cosmos 3), same trending repos. Noticed EU AI Act compliance toolkit exists (abdelstark/eu-ai-act-toolkit, GLACIS) — not a gap, already covered. Confirming pause recommendation. No fresh gaps.
- **Cycle 24 observation**: Monday morning. GitHub trending unchanged (last30days-skill still #1). Search results same (MiniMax M3, Cosmos 3, devflokers roundup). EU AI Act compliance space checked again — GLACIS, compliquest, legalnodes all covering. No new open-source dev tool gaps. 4 consecutive cycles with zero new findings. **Pause recommendation strongly maintained.**
- **Cycle 25 observation**: Monday noon. GitHub trending IDENTICAL to cycles 21-24 (last30days-skill, taste-skill, hermes-agent, turbovec, tolaria, pg_durable — zero new entries). Search results same devflokers roundup, same model releases. Agent DX gap articles are generic/analysis, not pointing to specific unmet tooling needs. 5 consecutive cycles with zero new findings. **Pause recommendation confirmed.** No new AI capability waves detected.
- **Cycle 26 observation**: Monday afternoon. Checked Microsoft Build 2026 fallout — OpenShell (NVIDIA agent sandbox runtime) is first-party infra, not an indie gap. Same GitHub trending, same devflokers roundup, same model releases. 6 consecutive cycles with zero new findings. **Pause recommendation strongly maintained.**
- **Cycle 27 observation**: Monday afternoon. GitHub trending IDENTICAL to cycles 21-26. Same repos: last30days-skill, opencv, taste-skill, hermes-agent, turbovec, tolaria, pg_durable. New entry: aaif-goose/goose (AI agent framework) and HunxByts/GhostTrack (security tool) — neither represents a dev tooling gap. 7 consecutive cycles with zero new findings. **Pause recommendation maintained.** No new AI capability waves detected. Standing strong ideas: voicecheck, amp-migrate.
- **Cycle 28 observation**: Monday 3:23 PM. GitHub trending fetch failed (macOS grep -P incompatibility). Web search returned identical results to cycles 20-27: devflokers roundup (MiniMax M3, Cosmos 3), generic AI agent listicles, no fresh dev tooling gaps. 8 consecutive cycles with zero new findings. **Pause recommendation strongly maintained.** No action needed until new AI capability wave emerges.
- **Cycle 29 observation**: Monday 5:14 PM. GitHub trending fetched via orangebot.ai — IDENTICAL to cycles 21-28 (last30days-skill, opencv, taste-skill, hermes-agent, open-notebook, turbovec, tolaria, pg_durable, goose, project-nomad). New entry: ChinaTextbook (TapXWorld, textbook collection) — not a dev tooling gap. Web search same devflokers roundup, same model releases. 9 consecutive cycles with zero new findings. **Pause recommendation confirmed.** Standing strong ideas: voicecheck, amp-migrate. No action until new AI capability wave.
- **Cycle 30 observation**: Monday 6:27 PM. GitHub trending + web search IDENTICAL to cycles 21-29. Same devflokers roundup (MiniMax M3, Cosmos 3), same awesome-ai-agents listicle, same coding agent reviews. No new repos, no new model releases, no new dev tooling gaps. 10 consecutive cycles with zero new findings. **Pause recommendation strongly maintained.** Standing strong ideas: voicecheck, amp-migrate. No action until new AI capability wave emerges.
- **Cycle 31 observation**: Monday 7:23 PM. **NEW CAPABILITY WAVE — WWDC 2026 dropped today.** Core AI replaces Core ML (9-year-old framework), Siri Extensions API opens third-party AI to Siri (Claude/Gemini/ChatGPT), MCP natively in iOS, foldable APIs. First genuinely new AI capability in 10+ cycles. Found gap: Siri Extensions testing tooling (idea-008). Zero OSS tools exist. API is hours old. Also noted Core AI MCP integration could create iOS-specific MCP testing gaps. Documented idea-008-siri-ext-test.md. **Active research resumed — new wave creates new gaps.** Watch for iOS 27 beta SDK docs this week.
