# Decentralized Stack Todo List

## Phase 1: Shared Packages & Database
- [x] Install Tableland and Drizzle dependencies in `@repo/db`.
- [x] Create Tableland client factory in `@repo/db/src/index.ts`.
- [x] Create Tableland test script in `@repo/db/src/scripts/test-table.ts`.
- [ ] Define shared Tableland schemas in `@repo/db/src/schema.ts`.
- [ ] Link `@repo/db` into `apps/web` and `apps/ai-worker`.

## Phase 2: Internet Identity & Authentication
- [x] Install ICP dependencies in `@repo/identity`.
- [x] Create Internet Identity login/session helpers in `@repo/identity/src/index.ts`.
- [ ] Implement `IdentityContext` provider in `apps/web`.

## Phase 3: Decentralized Backend (ICP Canisters)
- [x] Initialize `@repo/canisters` with Azle (TypeScript).
- [x] Implement robust `StableBTreeMap` storage for Users, Proposals, and AI Reports.
- [x] Deploy and verify canister locally (`health` check passed).
- [x] Create migration strategy documentation in `spec/migrations.md`.
- [ ] Implement advanced Voting and Reputation logic in `apps/canisters/src/index.ts`.
- [ ] Implement authorization checks for the AI Oracle worker.

## Phase 4: Frontend & API (tRPC)
- [ ] Install tRPC and Tanstack Query in `apps/web`.
- [ ] Integrate `@repo/identity` for authenticated tRPC calls.
- [ ] Build the Map and Voter Dashboard components in `apps/web`.

## Finalization
- [ ] Deploy Next.js to ICP Asset Canister.
- [ ] Set up AI Worker oracle (e.g. on Akash).
