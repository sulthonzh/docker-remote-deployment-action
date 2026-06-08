# Idea 008: `siri-ext-test` — Siri Extensions Local Testing & Simulation CLI

**Logged:** 2026-06-08
**Status:** ⭐⭐ **STRONG** — Day 0 of API, zero competition, follows proven pattern

## The Gap

WWDC 2026 (June 8, 2026) introduced **Siri Extensions** — a new framework letting third-party AI apps plug directly into Siri, Writing Tools, and Image Playground. Users can choose Google Gemini, Anthropic Claude, or OpenAI ChatGPT as AI backends. A dedicated App Store section is planned for Extensions-compatible apps.

**Zero developer tooling exists for testing Siri Extensions.** Every developer building an Extension needs to:
- Test Extension responses locally without deploying to TestFlight
- Simulate Siri queries against their Extension
- Debug which provider handles which query type
- Profile latency and token usage
- A/B test different AI backend responses
- Validate App Store review requirements

Apple's Xcode testing for Siri has historically been weak (SiriKit Intents testing was painful). Siri Extensions is a brand new API surface — no CLI, no simulator, no assertion library.

## Why Now

- **Day 0**: API literally announced today. No one has built tooling yet.
- **Massive addressable market**: Every iOS developer adding AI to their app via Siri Extensions
- **App Store incentive**: Dedicated section for Extensions-compatible apps = early mover advantage = developers will rush to build
- **Pattern match**: Same gap as `voicecheck` — new AI capability → mature models → missing testing tooling

## Competition

**None.** Search for "siri extension testing" returns zero OSS tools. The API is hours old.

Apple will likely ship basic Xcode testing, but:
- Apple's migration/testing tools are historically incomplete
- Third-party CLIs can move faster than Xcode updates
- Cross-provider testing (simulate same query → Claude vs Gemini vs ChatGPT) is NOT something Apple would build

## What It Does

```bash
# Initialize Extension testing in your Xcode project
siri-ext-test init

# Simulate a Siri query against your Extension locally
siri-ext-test simulate "What's the weather in Jakarta?" --provider claude

# Compare responses across providers
siri-ext-test compare "Summarize my emails" --providers claude,gemini,chatgpt

# Run assertion tests
siri-ext-test test --spec siri-ext-tests.yaml

# Profile latency and token usage
siri-ext-test profile --provider claude --iterations 100
```

## Buildability

- **Timing caveat**: Need iOS 27 beta SDK docs (dropping today) to know exact API surface
- **Core logic**: Parse Siri Extension protocol, simulate query routing, capture responses
- **Weekend buildable**: Core simulation + assertions = 2-3 days once API docs available
- **Swift CLI** — native iOS dev audience, can use Core AI SDK directly

## Monetization

- **Free CLI** + cloud provider for response comparison/profiling
- **Team tier**: CI/CD integration, response regression testing
- **Pro**: Automated App Store review compliance checks

## Risks

1. **Apple ships good-enough tooling** — unlikely based on history but possible
2. **API is too locked down** — if Extensions can only be tested via Xcode, CLI is harder
3. **Small window** — first 3-6 months is the gold rush. After that, Apple or others fill the gap

## Related

- Follows same pattern as `voicecheck` (idea-005) — new AI modality, missing testing tooling
- Could extend to Core AI MCP tool testing (since Core AI uses MCP natively)
- Complementary to Apple's migration tooling, not competing

## Decision

**Document and monitor.** Build after iOS 27 beta SDK docs are available (this week). First-mover advantage is massive — the App Store section creates natural distribution. This is the freshest gap in 10+ cycles.
