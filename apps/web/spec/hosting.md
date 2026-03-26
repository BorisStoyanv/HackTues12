# Hosting Strategy: Decentralized Stack

## 1. Frontend (`apps/web`)
**Target:** ICP Asset Canister
**How:**
- Build the Next.js app (`npm run build`).
- Deploy the `out/` directory using `dfx deploy`.
- **Canister Link:** The app will be accessible via `https://<canister-id>.icp0.io`.

## 2. Backend Canisters (`apps/canisters`)
**Target:** ICP Mainnet
**How:**
- Written in Rust or Azle (TypeScript).
- Logic for governance, regional escrow, and reputation.
- Deployment via `dfx deploy --network ic`.

## 3. Decentralized Database (`packages/db`)
**Target:** Tableland Network
**How:**
- Tables are created on-chain (EVM).
- **Hosting:** Tableland is a decentralized protocol; your tables exist across the Tableland validator network.
- **Costs:** Covered by the EVM wallet used to create/update tables (e.g., Arbitrum).

## 4. AI Worker / Oracle (`apps/ai-worker`)
**Target:** Traditional Cloud or Decentralized Compute
**Options:**
- **Traditional:** Vercel (Serverless), Render, or AWS Lambda.
- **Decentralized:** **Akash Network** (Decentralized cloud) or **Spheron**.
- **Role:** Listens to ICP events, runs AI debates via OpenAI/Anthropic APIs, and writes results back to Tableland.

## 5. Internet Identity
**Target:** ICP Official Identity Provider
**Usage:** Integrated via `@repo/identity`. No hosting required.
