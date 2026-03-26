# Landing Page (`/`) Architecture & Plan

## Objective
Create a sophisticated, modern, minimal, and eye-catching landing page. It should immediately communicate the value proposition of OpenFairTrip without being overwhelming.

## Constraints & Current State
- **Data:** Use fully mocked TypeScript structures. No database or backend connections yet (pending ICP StableBTree/Tableland decisions). We will use `snake_case` for data properties to map smoothly to relational-style datastores later.
- **Auth:** No route protection or active auth guards. CTAs will route to the appropriate pages, which will also use mock states for now.

## Component Architecture

0. **`Navigation` (Header)**
   - **Style:** Minimalist, sticky glassmorphism or clean white/dark background.
   - **Content:** 
     - Logo: "OpenFairTrip" (sophisticated font).
     - Right Side: A single primary button. If "logged in" (mocked): "Go to Dashboard"; otherwise: "Sign In".

1. **`HeroSection`**
   - **Visuals:** Minimalist typography, subtle procedural background or clean geometric mesh. Monochrome palette with a single high-contrast accent.
   - **Content:** 
     - Headline: "Transparent Funding, Governed by Local Consensus."
     - Subheadline: "Empowering regional communities through AI-vetted proposals and verifiable escrow."
   - **CTAs:** 
     - Primary: "Explore the interactive map" (Routes to `/explore`)
     - Secondary: "Submit a Project" (Routes to `/proposals/new`)

2. **`StatsBar` (Mocked Data)**
   - A clean horizontal bar displaying key platform metrics.
   - Example stats: `$1.2M Total Funded`, `45 Active Projects`, `12k Verified Locals`.
   - Data fields: `total_funded`, `active_projects`, `verified_users`.

3. **`HowItWorksSection`**
   - A 3-column layout explaining the core mechanism simply:
     1. **Propose:** Submit structured Data Packs.
     2. **Debate:** 3-Agent AI rigorous vetting.
     3. **Govern:** Reputation-weighted community voting & secure escrow.

4. **`FeaturedProposalsGrid` (Mocked Data)**
   - A grid of 3 "trending" or "high-impact" proposals.
   - Each card shows: Title, Region, AI Integrity Score (Mocked), and Funding Progress.

5. **`Footer`**
   - Standard links, social icons, and legal disclaimers.

## TypeScript Interfaces (Mocked Data Structures)

```typescript
// src/lib/types/models.ts

export interface ProposalMock {
  id: string;
  title: string;
  region: string;
  short_description: string;
  funding_goal: number;
  current_funding: number;
  ai_integrity_score: number; // 0-100
  status: 'debate' | 'voting' | 'funded';
  created_at: Date;
}

export interface PlatformStatsMock {
  total_funded: number;
  active_projects: number;
  verified_users: number;
}
```

## TODOs (Infrastructure Dependent)
- [ ] Connect `StatsBar` to global platform aggregation queries.
- [ ] Connect `FeaturedProposalsGrid` to real active proposals from the ICP backend.
- [ ] Implement actual authentication checks on the "Submit a Project" CTA.
