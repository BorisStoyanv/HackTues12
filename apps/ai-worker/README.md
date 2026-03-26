# AI Engine - Agentic Debate API

This service exposes a 3-round agentic debate API for ICP proposal funding decisions.

## Agent setup (OpenRouter)

- Advocate: `google/gemini-2.5-flash-lite`
- Skeptic: `anthropic/claude-haiku-4.5`
- Judge: `openai/gpt-5-nano`

The judge scores each round in `[0, 1]` where:

- `0.5` = neutral / tie
- `> 0.5` = advocate stronger
- `< 0.5` = skeptic stronger

After 3 rounds, the API returns:

- aggregate debate score
- judge criteria ratings for:
  - popularity
  - tourism attendance
  - neglect and age
  - potential tourism benefit
- computed funding-priority score:

```text
((1 - popularity) + (1 - tourism_attendance) + neglect_and_age + potential_tourism_benefit) / 4
```

Internet evidence is fetched live (Wikipedia + Wikimedia pageviews + OSM geocoding) and included in the judge context.

## Setup

```bash
cp .env.example .env
npm install
npm run start
```

Required env var:

- `OPENROUTER_API_KEY`

Optional:

- `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`)
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_APP_NAME`
- `PORT` (default `8080`)

## Endpoints

### Health

`GET /health`

### Evaluate proposal

`POST /api/v1/debate/proposals/evaluate`

Request body:

```json
{
  "proposal": {
    "name": "Roman Amphitheatre of Serdica",
    "location": "Sofia, Bulgaria",
    "category": "monument",
    "info": "Needs restoration of visitor pathways and multilingual signage",
    "neededFunds": 250000,
    "currency": "EUR"
  }
}
```

Successful response contains full debate transcript, per-round scores, internet evidence, and final scoring fields.

### Stream live debate rounds (SSE)

`POST /api/v1/debate/proposals/evaluate/stream`

This endpoint streams server-sent events (`text/event-stream`) while the debate runs.

Example:

```bash
curl -N -X POST http://localhost:8080/api/v1/debate/proposals/evaluate/stream \
  -H "Content-Type: application/json" \
  -d '{
    "proposal": {
      "name": "Roman Amphitheatre of Serdica",
      "location": "Sofia, Bulgaria",
      "category": "monument",
      "info": "Needs restoration of visitor pathways and multilingual signage",
      "neededFunds": 250000,
      "currency": "EUR"
    }
  }'
```

Stream events:

- `connected`
- `debate_started`
- `internet_evidence`
- `round_started`
- `round_statements`
- `round_completed`
- `debate_completed`
- `stream_end`
- `error`
