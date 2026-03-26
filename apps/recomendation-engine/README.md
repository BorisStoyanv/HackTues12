# Recomendation Engine

Async Rust recommendation service for personalized proposal feeds.

## What it does

- loads recommendation source data from a local JSON file or remote URL
- retrains continuously when the source data changes
- derives hybrid user profiles from behavior
- serves recommendation endpoints the frontend can query with a user principal

## Endpoints

- `GET /health`
- `GET /api/recommendations/profile/:user_id`
- `GET /api/recommendations/feed/:user_id?limit=10&scope=local&mode=blended`
- `GET /api/recommendations/similar/:proposal_id?user_id=<principal>&limit=6`

## Run

```bash
cargo run
```

PowerShell:

```powershell
cd C:\Users\ivan2\Documents\GitHub\HackTues12\apps\recomendation-engine
cargo run
```

The server starts on:

```text
http://127.0.0.1:8090
```

## Local test result

I tested the service locally against the mock dataset in `data/bootstrap.json`.

Working checks:

- `GET /health`
- `GET /api/recommendations/profile/:user_id`
- `GET /api/recommendations/feed/:user_id`
- `GET /api/recommendations/similar/:proposal_id`

I also changed the bootstrap data while the server was running and confirmed the polling loop retrained automatically:

- `data_version` changed
- proposal count changed from `6` to `7`
- the new proposal appeared in the personalized feed without restarting the server

## How to call the endpoints

### 1. Health

PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8090/health | Select-Object -ExpandProperty Content
```

Example response:

```json
{
  "status": "ok",
  "data_version": "483ffbdbd8a2b8cbe002f77875e4d7d507758ff1ce04501c38f73a81b1ba08ea",
  "trained_at": "2026-03-26T20:29:09.056662300Z",
  "users": 4,
  "proposals": 7
}
```

### 2. User profile

PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8090/api/recommendations/profile/rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe" | Select-Object -ExpandProperty Content
```

Example response:

```json
{
  "user_id": "rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe",
  "display_name": "Boris",
  "home_region": "Sofia",
  "country": "Bulgaria",
  "reputation": 35.0,
  "risk_tolerance": "safe",
  "top_categories": ["Events", "Climate", "Technology"],
  "almost_voted_for": ["3"],
  "similar_users": [
    {
      "user_id": "yxgk3-l4vkq-mnrty-mqtef-cuuz2-s5tfi-7u465-bfqqy-rzmir-nkubf-bqe",
      "score": 0.98455226
    }
  ]
}
```

### 3. Personalized feed

PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8090/api/recommendations/feed/rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe?limit=4&scope=local&mode=blended" | Select-Object -ExpandProperty Content
```

Example response:

```json
{
  "user_id": "rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe",
  "mode": "blended",
  "scope": "local",
  "items": [
    {
      "proposal_id": "3",
      "score": 1.5575306,
      "reasons": [
        "Matches your preferred category: Climate",
        "Relevant to your region: Sofia",
        "Trending now",
        "You follow Ivan and they backed this"
      ]
    },
    {
      "proposal_id": "7",
      "score": 1.3383806,
      "reasons": [
        "Matches your preferred category: Climate",
        "Relevant to your region: Sofia",
        "Trending now",
        "You almost voted for this earlier"
      ]
    }
  ]
}
```

### 4. Similar proposals

PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:8090/api/recommendations/similar/3?user_id=rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe&limit=3" | Select-Object -ExpandProperty Content
```

Example response:

```json
{
  "proposal_id": "3",
  "items": [
    {
      "proposal_id": "6",
      "score": 0.46982855,
      "reasons": ["Same region", "Local to your region"]
    },
    {
      "proposal_id": "1",
      "score": 0.4615,
      "reasons": ["Same region", "Local to your region"]
    }
  ]
}
```

## Continuous retraining

The service polls its source data on an interval and retrains when the content changes.

Defaults:

- poll interval: `15` seconds
- source file: `data/bootstrap.json`

To see this work locally:

1. Start the server with `cargo run`.
2. Edit `data/bootstrap.json`.
3. Wait at least 15 seconds.
4. Call `/health` again and confirm `data_version` changed.
5. Call `/api/recommendations/feed/:user_id` again and confirm the results changed.

## Config

- `RECOMMENDER_BIND_ADDR`
  - default: `127.0.0.1:8090`
- `RECOMMENDER_POLL_INTERVAL_SECS`
  - default: `15`
- `RECOMMENDER_DATA_PATH`
  - default: `data/bootstrap.json`
- `RECOMMENDER_SOURCE_URL`
  - optional remote JSON source; if set it overrides the local file
