# Idea 007: `videocheck` — AI Video Generation Evaluation CLI

**Date:** 2026-06-07
**Status:** 🔍 Researching
**Signal Strength:** ⭐⭐ MODERATE

## The Problem

AI video generation demand is exploding — Upwork 2026 report shows **329% YoY growth**, fastest of any AI skill category. MoneyPrinterTurbo hit 80K+ stars. But:

- **No developer-friendly tool exists** for evaluating generated video quality in CI/CD
- VBench/VBench++ exist but are **academic research frameworks**, not production CLIs
- MovieLenz (Google Cloud) is **cloud-locked** and not OSS
- Teams building video AI pipelines have **no way to regression-test** their outputs
- Prompt-to-video alignment scoring is **manual and subjective**

## The Gap

| What exists | What's missing |
|---|---|
| VBench (academic benchmark) | Developer-friendly CLI |
| MovieLenz (Google Cloud) | Local-first, OSS |
| MoneyPrinterTurbo (pipeline) | Quality evaluation stage |
| Manual review | Automated regression testing |

## The Idea

A CLI tool (`videocheck`) that:

1. **Takes a prompt + generated video** → scores alignment (does the video match what was asked?)
2. **Quality metrics**: temporal consistency, visual fidelity, motion coherence, artifact detection
3. **Regression testing**: compare outputs across model versions (did the new model break anything?)
4. **CI/CD integration**: GitHub Action that fails if video quality drops below threshold
5. **Batch evaluation**: score entire test suites of prompt→video pairs

Built on top of VBench's evaluation dimensions but packaged for developers.

## Validation

- **Demand signal**: 329% YoY growth in video AI skills (Upwork 2026)
- **Competition**: VBench is academic-only, MovieLenz is cloud-locked. Zero OSS dev tools.
- **GitHub search**: no CLI tools for video generation quality testing
- **Buildable in a weekend**: VBench's scoring logic + CLI wrapper + GitHub Action

## Concerns

- **Thinner than voicecheck** — VBench already does the heavy lifting, this is "just" packaging
- **Video processing is compute-heavy** — may need GPU, limiting adoption
- **Market size**: smaller than voice agent testing (fewer teams building video AI)
- VBench could release a CLI themselves (though they haven't in 2 years)

## Differentiation from Idea 005 (voicecheck)

- Voicecheck targets voice AI agents (call center, assistants) — massive enterprise market
- Videocheck targets video generation pipelines — content creation market
- Same pattern (modality-specific eval), different buyers
- Voicecheck is stronger because voice AI is more mature and enterprise-adopted

## Verdict

**Second-tier idea.** Worth documenting but voicecheck (005) and amp-migrate (006) are stronger. The gap is real but the market is smaller and VBench provides 70% of the technical foundation already. If someone built this, they'd essentially be wrapping VBench with better DX.

**Monetization:** Freemium CLI + cloud API for batch evaluation. But ceiling is lower than other ideas.

## Tags

`video-ai`, `evaluation`, `cli`, `testing`, `vbench`
