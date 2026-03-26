# HackTues12 AI Engine - Implementation Summary

Date: 2026-03-26
Location in repo: `apps/ai-engine`

## 1) Original Product Context You Provided

You described an ICP dApp for transparent voting and fund-raising for proposals.

Each proposal represents a geographic place/sightseeing object and includes general fields such as:
- location
- name
- category (museum, monument, park, etc.)
- info/description
- needed funds

You requested an AI agentic debating system that decides whether a proposal is worthy of funding and computes priority using these criteria:
- popularity (lower popularity => higher priority)
- tourism attendance (lower attendance => higher priority)
- neglected/old state (higher neglect/age => higher priority)
- potential tourism benefit (higher potential => higher priority)

Required debate design:
- 3 agents: advocate, skeptic, judge
- advocate and skeptic each provide one statement per round
- judge scores each round in range [0, 1], with 0.5 as neutral baseline
- 3 rounds total
- final output includes aggregate score across the 3 rounds + criteria ratings
- judge should use internet information + debate statements

Required models through OpenRouter:
- Advocate: `google/gemini-2.5-flash-lite`
- Skeptic: `anthropic/claude-haiku-4.5`
- Judge: `openai/gpt-5-nano`

## 2) What Was Implemented

### Service and project setup
- Initialized Node.js API service structure in `apps/ai-engine`.
- Added runtime dependencies (`express`, `zod`, `dotenv`).
- Added scripts for start/dev/check.
- Added environment template.

Files:
- `package.json`
- `package-lock.json`
- `.env.example`

### Core modules
- `src/config.js`
  - Loads environment variables.
  - Validates required `OPENROUTER_API_KEY`.

- `src/openrouter.js`
  - Central OpenRouter client for chat completions.
  - Handles model response normalization.
  - Supports optional advanced params (`include_reasoning`, `reasoning`) used for GPT-5 nano stability.

- `src/internetResearch.js`
  - Collects internet evidence for judge context:
    - Wikipedia search + extracts
    - Wikimedia pageview metrics
    - OpenStreetMap/Nominatim geolocation hint

- `src/jsonUtils.js`
  - Utility for robust JSON extraction from model responses.
  - Includes numeric clamp helper.

- `src/debateService.js`
  - Implements full 3-round debate orchestration:
    - advocate statement generation
    - skeptic statement generation
    - round judging and scoring
  - Final judge synthesis:
    - aggregate handling
    - criteria ratings (popularity, tourism attendance, neglect/age, potential benefit)
    - computed funding priority score
  - Adds progress hooks for real-time streaming.

### HTTP API endpoints
- `GET /health`
  - Basic health check.

- `POST /api/v1/debate/proposals/evaluate`
  - Non-stream evaluation endpoint.
  - Returns full transcript + evidence + final scores.

- `POST /api/v1/debate/proposals/evaluate/stream`
  - SSE endpoint for live updates per phase/round.
  - Emits events during execution.

Implemented in:
- `src/server.js`

### Documentation
- Added usage, setup, and endpoint docs in `README.md`.

## 3) API Behavior Summary

### Request schema

```json
{
  "proposal": {
    "name": "string",
    "location": "string",
    "category": "string",
    "info": "string",
    "neededFunds": 250000,
    "currency": "EUR"
  }
}
```

Notes:
- `neededFunds` is coerced to number server-side for frontend compatibility.

### Stream events
The stream endpoint emits:
- `connected`
- `debate_started`
- `internet_evidence`
- `round_started` (x3)
- `round_statements` (x3)
- `round_completed` (x3)
- `debate_completed`
- `stream_end`
- `error` (only on failure)

## 4) Scoring and Priority Logic

### Round score
- Judge returns score in [0,1].
- Interpretation:
  - `> 0.5`: advocate stronger
  - `< 0.5`: skeptic stronger
  - `0.5`: tie/neutral

### Aggregate score
- Final aggregate is computed as the mean of the 3 round scores.

### Funding priority score
Calculated from normalized criteria ratings:

```text
((1 - popularity) + (1 - tourism_attendance) + neglect_and_age + potential_tourism_benefit) / 4
```

Meaning:
- Lower popularity and lower attendance increase priority.
- Higher neglect/age and higher potential tourism benefit increase priority.

## 5) Problems Found During Testing and Fixes Applied

### Problem A: Judge model returned empty content
Observed symptom:
- Non-stream endpoint failed with errors like:
  - `OpenRouter returned empty content for model openai/gpt-5-nano`

Root cause:
- With longer judge prompts, GPT-5 nano sometimes consumed output budget in reasoning and returned no visible `content`.

Fixes:
- Extended OpenRouter call support for judge-specific params (`include_reasoning`, `reasoning`).
- Increased judge token budgets for round and final decisions.
- Set judge reasoning effort to low and disabled reasoning output visibility.
- Kept JSON extraction retries to recover from malformed/partial outputs.

Files changed:
- `src/openrouter.js`
- `src/debateService.js`

### Problem B: Stream endpoint stopped after `debate_started`
Observed symptom:
- SSE produced only initial events and then stalled/terminated.

Root cause:
- Stream closure tracking used request `close` semantics that can fire after request body consumption.

Fix:
- Switched disconnection tracking to:
  - `req.on('aborted', ...)`
  - `res.on('close', ...)`

File changed:
- `src/server.js`

### Problem C: Final judge sometimes returned literal placeholder value
Observed symptom:
- SSE ended with enum parse error when judge outputted `fund|defer|reject` literally.

Fix:
- Relaxed schema for `funding_recommendation` to string.
- Added normalization function that accepts valid values (`fund`, `defer`, `reject`) and safely defaults to `defer` otherwise.

File changed:
- `src/debateService.js`

## 6) Validation Performed

Executed checks:
- Static syntax checks for server and modules.
- Health endpoint verification.
- End-to-end non-stream test with real payload.
- End-to-end SSE stream test with full event sequence.

Final observed status:
- `GET /health`: working
- `POST /api/v1/debate/proposals/evaluate`: working
- `POST /api/v1/debate/proposals/evaluate/stream`: working

## 7) Final State

The AI engine now provides both:
- standard synchronous proposal evaluation
- live per-round streaming evaluation

It follows your required 3-agent/3-round architecture, uses your specified OpenRouter models, incorporates internet evidence into judging context, and returns both debate outcome and funding-priority criteria.
