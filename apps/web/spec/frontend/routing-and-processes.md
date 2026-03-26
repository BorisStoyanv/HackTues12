# OpenFairTrip: Frontend Architecture & MVP Routes Plan

## Core User Flows & Processes

1. **Authentication & Identity Management**
   - **Approach:** Internet Identity (ICP) for core cryptographic identity + OAuth (NextAuth/Auth.js) for traditional social logins (Google, LinkedIn, GitHub).
   - **KYC/Geographic Verification:** Stripe Identity for robust KYC (Funders/NPOs) to verify legitimate capital entities, and geographic verification for Regional Users.

2. **Interactive Proposal Discovery**
   - **Approach:** Mapbox GL JS via `react-map-gl` (as per workspace conventions) to power the dynamic geographic visualizer.

3. **Proposal Submission**
   - **Approach:** Multi-step wizard using React Hook Form + Zod for structured Data Packs (problem statement, budget, timeline, success metric).

4. **AI Debate & Voting**
   - **Approach:** Real-time or polled updates for the 3-Agent AI debate (Advocate, Skeptic, Analyst). Client-side voting signing using Internet Identity with dynamic reputation-based voting power calculation.

5. **Transparency Ledger & Escrow Tracking**
   - **Approach:** Decentralized data fetched via tRPC from Drizzle + Tableland, tracking milestone releases and funds in real-time.

---

## Proposed MVP Routes (Next.js App Router)

### 🌍 Public & Discovery Routes
- **`/` (Home)**
  - Landing page, hero section, platform value proposition, and top-level stats.
- **`/explore` (or `/map`)**
  - The Interactive Proposal Map. View active proposals geographically, filterable by funding status, AI debate stage, or voting open.
- **`/proposals/[id]`**
  - Public detailed view of a proposal. Includes the Data Pack, the full AI Integrity Report, the 3-round iterative debate log, and the Transparency Ledger (funds tracking).

### 🔐 Authentication & Onboarding
- **`/login`**
  - Unified login portal (Internet Identity + Social).
- **`/onboarding/kyc`**
  - Tiered Stripe KYC flow for Funders/Investors.
- **`/onboarding/verification`**
  - Geographic verification and expertise portfolio upload for Regional Users (Proposers/Voters).

### 🛡️ Protected User Routes (Dashboard & Actions)
- **`/dashboard`**
  - High-level overview of the user's reputation ($V_p$), past successful votes, active tracked projects, and for investors, their funding portfolio.
- **`/proposals/new`**
  - Multi-step wizard for creating a new proposal (Data Pack submission).
- **`/proposals/[id]/vote`**
  - Authenticated voting interface with user's weighted voting power displayed.
- **`/proposals/[id]/fund`**
  - Funder interface to review milestones, execute digital signatures, and pledge/deploy capital.
- **`/profile/settings`**
  - Manage account details, linked identities, professional credentials, and notification preferences.

---

## Next Steps for Planning
1. Review and refine these proposed routes and process approaches.
2. Determine which specific data fetching and state management strategies we need for each (e.g., specific tRPC routes, React Query).
3. Draft the component architecture for the most complex views (like the interactive map and AI debate UI).