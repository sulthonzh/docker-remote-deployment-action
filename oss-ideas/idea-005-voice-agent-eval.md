# Idea 005: `voicecheck` — Voice Agent Evaluation & Testing CLI

**Date:** 2026-06-07
**Status:** 🔍 Validated

## The Problem

Voice agents are exploding in 2026. The full OSS stack is now mature:
- **STT:** Parakeet, Canary Qwen, Whisper
- **TTS:** Chatterbox, Kokoro, XTTS-v2
- **Orchestration:** Dograh, Pipecat, LiveKit Agents, Vapi

But here's the thing — there's no dedicated tool for **testing and evaluating voice agents end-to-end**. The observability tools (Langfuse, Phoenix, AgentOps) are all text/LLM-focused. They trace JSON calls and token counts. Voice agents have completely different failure modes:

1. **Latency** — TTFB matters differently when it's spoken (300ms vs 3s is the difference between natural and awkward)
2. **Interruption handling** — Did the agent stop talking when the user interrupted? Did it recover?
3. **STT accuracy in context** — Not just WER, but "did the misunderstanding cascade into a wrong response?"
4. **TTS quality perception** — Is the voice natural? Wrong emphasis? Robotic?
5. **Conversation flow** — Turn-taking, dead air, talking over each other
6. **Multilingual switching** — Code-switching is common (especially in Indonesia, India, etc.)

## Why Now

- Voice AI just had its "ChatGPT moment" per multiple sources
- 5+ orchestration platforms (Dograh, Pipecat, LiveKit, Vapi) but zero dedicated testing tools
- Companies are deploying voice agents to production without systematic testing
- Vapi's own community is asking for observability tooling (futureagi article)

## Competition

- **General agent observability:** Langfuse, Phoenix, AgentOps — all text-focused, don't understand audio pipeline
- **Vapi's built-in monitoring:** Proprietary, vendor-locked
- **Speech testing tools:** Exist for IVR/telecom (like Cyara) but enterprise-only, $$$$, not built for LLM voice agents

**Gap is clean.** No OSS tool tests the full voice pipeline from audio-in to audio-out with voice-specific metrics.

## What It Would Do

```bash
# Record a test scenario
voicecheck record --scenario "customer support refund" --duration 60s

# Replay against your agent
voicecheck test --scenario refund.yaml --endpoint ws://localhost:8080/voice

# Get voice-specific metrics
voicecheck report
# → TTFB: 420ms (target: <500ms) ✅
# → Interruption recovery: 3/3 handled ✅
# → Dead air episodes: 2 (total 4.2s) ⚠️
# → STT→LLM cascade accuracy: 94%
# → Turn-taking score: 8.2/10
```

Core features:
- **Scenario definitions** — YAML files describing conversation flows with expected outcomes
- **Synthetic caller** — Generate speech from text, send to agent endpoint
- **Audio-level metrics** — Latency, silence detection, interruption handling, overlap detection
- **Semantic evaluation** — Did the agent say what it was supposed to?
- **Regression testing** — Compare agent versions on same scenarios
- **CLI-first** — Fits in CI/CD

## Monetization

- **OSS core** (CLI + basic scenarios)
- **Cloud:** Shared scenario library, team dashboards, regression tracking over time
- **Enterprise:** Compliance recordings, SOC2 for voice, custom integrations

## Buildability

- **Weekend MVP:** 3-4 days. WebSocket client + STT/TTS for synthetic caller + basic metrics extraction
- **Full v1:** 2-3 weeks. Scenario DSL, semantic eval, CI integration
- **Tech:** TypeScript or Python, WebRTC/WebSocket client, Silero VAD for audio analysis

## Risks

- Vapi or LiveKit might build this natively — but that locks you to their platform
- Audio quality metrics are subjective — need good baselines
- Small market? Maybe, but voice agent deployments are growing fast

## Verdict

**Strong idea.** The voice AI stack is mature but testing is completely missing. Developers are deploying voice agents blind. First-mover advantage in OSS voice agent testing is wide open.

**Score:** 8/10 viability, 7/10 market size (growing fast), 9/10 buildability
