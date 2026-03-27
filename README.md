# OpenFairTrip (HackTues12)

OpenFairTrip is a multi-service platform for transparent proposal submission, AI-assisted debate/evaluation, recommendation ranking, document verification, and on-chain governance flows.

This repository is a monorepo containing frontend, AI, OCR, Rust services, and ICP canister projects.

## Monorepo Structure

```text
apps/
  web/                   Next.js frontend
  ai-worker/             Node.js AI debate engine + Terraform VM deployment
  ocr-service/           FastAPI OCR and document extraction service
  recomendation-engine/  Rust recommendation API
  veriff-server/         Rust backend for Veriff session/webhook flow
  contracts/
    icp_proposals_mvp/   Main ICP governance canister project
    consensus_mechanism/ Consensus-related ICP canister
    scanner/             Vite scanner frontend
packages/
  identity/              Shared identity package
  db/                    Shared DB package scaffold
  ui/                    Shared UI package scaffold
research/                Product and architecture research docs
```

## Core Capabilities

- Proposal governance workflow on ICP canisters
- AI debate scoring (advocate vs skeptic vs judge)
- Live internet evidence enrichment for debate context
- Recommendation feed for proposals
- OCR-based document extraction/validation APIs
- KYC/verification integration support via Veriff server

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript, Tailwind
- AI service: Node.js, Express, OpenRouter models
- OCR service: Python, FastAPI, PyMuPDF, Tesseract
- Recommendation + Veriff services: Rust (Axum)
- Smart contracts: Rust canisters on Internet Computer (DFX)
- Infra: Terraform (GCP VM for AI worker)

## Prerequisites

- Node.js 20+ (frontend can run on 18+, AI worker requires 20+)
- pnpm
- Rust toolchain + Cargo
- Python 3.11+
- DFX (for ICP canisters)
- Terraform (for `apps/ai-worker/deploymentTf`)

## Quick Start (Repo)

```bash
# from repo root
pnpm install
```

Run JS workspace apps:

```bash
pnpm dev
```

## Run Services Individually

### 1. Frontend (`apps/web`)

```bash
cd apps/web
pnpm install
pnpm dev
```

Default: `https://localhost:3000` (Next.js experimental HTTPS in script).

### 2. AI Debate Engine (`apps/ai-worker`)

```bash
cd apps/ai-worker
cp .env.example .env
npm install
npm run start
```

Default: `http://localhost:8080`

Main endpoints:
- `GET /health`
- `POST /api/v1/debate/proposals/evaluate`
- `POST /api/v1/debate/proposals/evaluate/stream`

### 3. OCR Service (`apps/ocr-service`)

```bash
cd apps/ocr-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .[dev]
uvicorn app.main:app --reload --host 127.0.0.1 --port 8090
```

### 4. Recommendation Engine (`apps/recomendation-engine`)

```bash
cd apps/recomendation-engine
cargo run
```

Default: `http://127.0.0.1:8090`

### 5. Veriff Server (`apps/veriff-server`)

```bash
cd apps/veriff-server
cargo run
```

Default: `http://127.0.0.1:8787`

### 6. ICP Contracts (`apps/contracts`)

For the main governance canister:

```bash
cd apps/contracts/icp_proposals_mvp
dfx start --background --clean
dfx deploy icp_proposals_mvp
```

See each subproject README for detailed flow:
- `apps/contracts/icp_proposals_mvp/README.md`
- `apps/contracts/consensus_mechanism/LOCAL_TESTING.md`

## AI Worker Deployment (GCP VM + Terraform)

Terraform config lives in:
- `apps/ai-worker/deploymentTf`

Basic flow:

```bash
cd apps/ai-worker/deploymentTf
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
terraform init
terraform plan
terraform apply
```

Current Terraform setup includes VM provisioning and firewall rules for SSH/app/HTTP/HTTPS.

## Notes

- Some services share overlapping local ports; run only the subset you need or remap ports.
- Several modules are MVP-level and optimized for hackathon speed.
- Check per-app README files for environment variables and integration details.

## License

No license file is currently defined in this repository.
