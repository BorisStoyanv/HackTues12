# Veriff Server

Lightweight Rust backend for Veriff session creation, webhook validation, session status lookup, and VIES VAT validation proxying.

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
- `VIES_API_URL`: VIES SOAP endpoint. Default `https://ec.europa.eu/taxation_customs/vies/services/checkVatService`

## Routes

- `GET /healthz`
- `GET /api/vies/validate?countryCode=<ISO2>&vatNumber=<VAT>`
- `POST /api/veriff/sessions`
- `GET /api/veriff/status?sessionId=<id>`
- `POST /api/veriff/webhook`

## VIES Proxy

With your current Nginx config:

```nginx
location /kyc/ {
    proxy_pass http://127.0.0.1:8787/;
}
```

the public VIES proxy URL becomes:

```text
https://ai.open-ft.app/kyc/api/vies/validate?countryCode=BG&vatNumber=123456789
```

Example response:

```json
{
  "valid": true,
  "countryCode": "BG",
  "vatNumber": "123456789",
  "name": "ACME OOD",
  "address": "SOFIA BULGARIA"
}
```
