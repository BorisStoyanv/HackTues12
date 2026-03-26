# OpenFairTrip: Frontend Implementation Status Tracker

## Core Implementation Progress

| Feature Area | Status | Notes |
| :--- | :--- | :--- |
| **1. Auth & Identity** | **Infrastructure Ready** | Onboarding state machine, Stripe Identity, and GCP Geocoding fully integrated. Needs final bridge to actual Internet Identity provider. |
| **2. Interactive Map** | **Mostly Complete** | Dual-route discovery (Public vs Authenticated) implemented. Mapbox clustering and sidebar logic shared across views. |
| **3. Proposal Submission** | **Logic Ready** | Multi-step wizard with Zod validation and Map-based location picker in place. |
| **4. AI Debate & Voting** | **In Progress** | Need to implement the reputation-weighted voting UI and funding flow. |
| **5. Backend Integration**| **Active** | Bridged frontend types with ICP canister schema. Serialization layer handles BigInt/Principal. Hybrid data model (Canister + Mock) implemented. |

## Detailed Route Map Status

### 🌍 Public & Discovery
- [x] `/` (Landing Page): **Vercel-style refined.**
- [x] `/explore`: **Connected to canister `list_proposals`.**
- [x] `/proposals/[id]`: **Connected to canister `get_proposal`.**

### 🔐 Onboarding (Stripe + GCP Integrated)
- [x] `/login`: **Mocked flow with provider support.**
- [x] `/onboarding/role`: **Role selection state implemented.**
- [x] `/onboarding/kyc`: **Wired to `request_verification` (canister).**
- [x] `/onboarding/verification`: **Wired to `request_verification` (canister).**

### 🛡️ Authenticated Dashboard
- [x] `/dashboard`: **Wired to `get_my_profile` & `get_my_vp`.**
- [x] `/dashboard/explore`: **Connected to canister `list_proposals`.**
- [x] `/proposals/new`: **Wired to `submit_proposal` (canister).**
- [x] `/proposals/[id]/vote`: **Wired to `cast_vote` (canister).**
- [ ] `/profile/settings`: **Pending.**

---
*Last Updated: March 26, 2026*
