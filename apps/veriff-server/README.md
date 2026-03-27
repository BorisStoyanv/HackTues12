# Veriff Server

Lightweight Rust backend for Veriff session creation, webhook validation, and session status lookup.

## Run

```powershell
cd apps/veriff-server
copy .env.example .env
cargo run
```

The server listens on `http://127.0.0.1:8787` by default.

## Environment

- `PORT`: Local port for the Rust server. Default `8787`
- `VERIFF_API_KEY`: Veriff API key
- `VERIFF_SHARED_SECRET_KEY`: Veriff shared secret for webhook validation
- `VERIFF_API_BASE_URL`: Veriff API base URL. Default `https://api.veriff.me`

## Routes

- `GET /healthz`
- `POST /api/veriff/sessions`
- `GET /api/veriff/status?sessionId=<id>`
- `POST /api/veriff/webhook`
