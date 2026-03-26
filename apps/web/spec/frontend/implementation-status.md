# OpenFairTrip: Frontend Implementation Status Tracker

## Core Implementation Progress

| Feature Area | Status | Notes |
| :--- | :--- | :--- |
| **1. Auth & Identity** | **Infrastructure Ready** | Onboarding state machine, Stripe Identity, and GCP Geocoding fully integrated. Needs final bridge to actual Internet Identity provider. |
| **2. Interactive Map** | **Mostly Complete** | Dual-route discovery (Public vs Authenticated) implemented. Mapbox clustering and sidebar logic shared across views. |
| **3. Proposal Submission** | **Logic Ready** | Multi-step wizard with Zod validation and Map-based location picker in place. |
| **4. AI Debate & Voting** | **Not Started** | Critical Path. Need detail pages for proposals and the reputation-weighted voting UI. |
| **5. Transparency Ledger**| **Pending** | Dependent on ICP StableBTree/Tableland backend decisions. |

## Detailed Route Map Status

### 🌍 Public & Discovery
- [x] `/` (Landing Page): **Vercel-style refined.**
- [x] `/explore`: **Public mode active.**
- [ ] `/proposals/[id]`: **Pending implementation.**

### 🔐 Onboarding (Stripe + GCP Integrated)
- [x] `/login`: **Mocked flow with provider support.**
- [x] `/onboarding/role`: **Role selection state implemented.**
- [x] `/onboarding/kyc`: **Stripe Identity + AI status messages.**
- [x] `/onboarding/verification`: **GCP Geocoding + Regional Detection.**

### 🛡️ Authenticated Dashboard
- [x] `/dashboard`: **Professional layout with sidebar & stats.**
- [x] `/dashboard/explore`: **Authenticated Map Explorer integrated.**
- [x] `/proposals/new`: **Multi-step Map wizard.**
- [ ] `/proposals/[id]/vote`: **Next Priority.**
- [ ] `/profile/settings`: **Pending.**

---
*Last Updated: March 26, 2026*
