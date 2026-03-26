# Frontend Backend Wiring and Recommendation API Summary

## Scope

This summary traces how the frontend currently gets data, mainly from the richer `origin/bobo` branch, and defines the Rust recommendation API we should add next.

## Short Answer

There is no real DB-backed frontend path right now.

The frontend is wired like this:

1. Internet Identity gives the app a principal string.
2. The web app stores that principal as `user.id`.
3. Next server actions call an ICP canister actor.
4. The actor talks directly to the backend canister on ICP mainnet.
5. The frontend serializes canister responses into friendlier JS objects.

So the current backend is canister-first, not DB-first.

## Current Frontend Call Chain

### 1. User identity source

In `origin/bobo`, the frontend user id is the ICP principal string.

- File: `apps/web/src/lib/auth-store.ts`
- Key behavior:
  - `syncIdentity()` extracts `identity.getPrincipal().toString()`
  - that principal is stored as `principal`
  - the same value becomes `user.id`

This is the identifier the recommendation API should accept.

Recommended request key:

```text
user_id = ICP principal string
```

Example:

```text
rkyz5-gnyu5-nx5bb-j3uiy-h6azc-m6oyh-5vi5v-rnvsh-lexq6-pzno4-cqe
```

### 2. Frontend actor creation

In `origin/bobo`, the frontend does not call a REST backend for proposal and profile data.
It creates an ICP actor in:

- `apps/web/src/lib/api/icp.ts`

Current behavior:

- host: `https://icp-api.io`
- canister id: `process.env.NEXT_PUBLIC_BACKEND_CANISTER_ID || "sk6yb-aqaaa-aaaad-qljxa-cai"`

### 3. Typed canister interface

The frontend type definitions and method signatures live in:

- `apps/web/src/lib/api/idl.ts`
- `apps/web/src/lib/types/api.ts`

These define the actual backend contract currently used by the web app.

### 4. Read path used by the frontend

The frontend mostly reads data through Next server actions:

- `apps/web/src/lib/actions/proposals.ts`
- `apps/web/src/lib/actions/users.ts`

Those server actions call `createBackendActor()` and then call canister methods like:

- `list_proposals`
- `get_proposal`
- `get_proposal_votes`
- `get_audit_log`
- `list_contracts`
- `get_contract_record`
- `get_config`
- `get_my_profile`
- `get_user`
- `whoami`
- `get_my_vp`
- `get_region_total_vp`

### 5. Write path used by the frontend

The frontend mutations are in:

- `apps/web/src/lib/api/client-mutations.ts`

These call canister updates directly:

- `create_my_profile`
- `update_my_profile`
- `request_verification`
- `admin_verify_investor`
- `submit_proposal`
- `cast_vote`
- `finalize_proposal`
- `back_proposal`
- `create_contract_record`
- `investor_ack_contract`
- `company_ack_contract`
- `record_external_signature_status`

## What the Frontend Actually Returns Today

The web app already converts raw canister responses into frontend-friendly objects.

### Proposal feed shape

From `apps/web/src/lib/actions/proposals.ts`, proposals are serialized roughly like:

```ts
type SerializedProposal = {
  id: string;
  submitter: string;
  creator: string;
  region_tag: string;
  title: string;
  description: string;
  short_description: string;
  problem_statement: string;
  category: string;
  budget_amount: number;
  funding_goal: number;
  budget_currency: string;
  budget_breakdown: string;
  executor_name: string;
  execution_plan: string;
  timeline: string;
  expected_impact: string;
  fairness_score: number;
  risk_flags: string[];
  status: string;
  created_at: number;
  updated_at: number;
  voting_ends_at: number;
  yes_weight: number;
  current_funding: number;
  no_weight: number;
  voter_count: number;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    formatted_address: string;
  };
};
```

Important note:

- `location` is not really stored in the backend
- it is synthesized from `region_tag`
- country is inferred from a hardcoded map
- lat/lng are generated with deterministic jitter

So geo-aware recommendations based on exact city or country are partly fake right now.

### User profile shape

From `apps/web/src/lib/actions/users.ts`, the frontend serializes user profiles into:

```ts
type SerializedUserProfile = {
  id: string;
  display_name: string;
  user_type: string;
  role: string;
  reputation: number;
  home_region: string | null;
  region: string | null;
  created_at: number;
  updated_at: number;
  last_activity_ts: number;
  activity_count: number;
  vote_count: number;
  is_local_verified: boolean;
  has_expert_standing: boolean;
  concluded_votes: number;
  accurate_votes: number;
  is_verified: boolean;
  kyc_status: "verified" | "unverified";
};
```

## Confirmed Frontend Pages Using This Flow

Examples from `origin/bobo`:

- `apps/web/src/app/dashboard/page.tsx`
  - calls `fetchMyVP()`
  - calls `fetchMyProfile()`
  - calls `fetchAllProposals()`
- proposal flows call the write actions in `client-mutations.ts`
- contract flows call the contract update methods

## What Is Not Present

I did not find a real database access layer being used by the web app for proposal/user feed data.

Specifically:

- `packages/db` is only a placeholder export right now
- there is no Rust HTTP API serving recommendation data
- there is no persistent off-chain recommendation store
- there is no current endpoint for:
  - dynamic user profiles
  - follow graph
  - activity feed
  - recommendation feed
  - trending windows
  - "almost voted for"
  - trusted curator graph

## Current Backend Data We Can Query Right Now

From the bobo canister interface we can already query:

### User-side signals

- principal
- display name
- user type
- home region
- reputation
- activity count
- vote count
- concluded votes
- accurate votes
- verification flags
- expert/local flags

### Proposal-side signals

- title
- description
- category
- region tag
- budget amount and currency
- budget breakdown
- executor name
- execution plan
- timeline
- expected impact
- fairness score
- risk flags
- status
- timestamps

### Interaction-side signals

- user votes per proposal
- vote direction
- vote weight
- vote timestamp

### Governance-side signals

- audit log
- contracts
- regional total VP
- proposal phase
- config

## Data Model Needed for the Recommendation Engine

We want hybrid user profiles, partly on-chain and partly off-chain.

### On-chain source fields

Use these as authoritative inputs:

- `user_id` from principal
- `home_region`
- `reputation`
- `vote_count`
- `accurate_votes`
- `concluded_votes`
- `is_local_verified`
- `has_expert_standing`
- proposal metadata
- raw vote history
- audit history

### Off-chain derived profile fields

Add these in the new Rust recommendation service:

- `top_categories`
- `category_affinity`
- `risk_tolerance`
- `funding_behavior`
- `vote_velocity`
- `recent_interest_regions`
- `recent_interest_countries`
- `followed_users`
- `trusted_curators`
- `activity_embeddings`
- `proposal_embeddings`
- `almost_voted_for`
- `trending_window_scores`
- `similar_users`

### Suggested derived profile schema

```json
{
  "user_id": "principal-text",
  "home_region": "Sofia",
  "top_categories": ["Technology", "Climate"],
  "category_affinity": {
    "Technology": 0.92,
    "Education": 0.61,
    "Events": 0.24
  },
  "risk_tolerance": "balanced",
  "funding_behavior": {
    "backs_early": true,
    "average_budget_supported": 1800.0,
    "local_bias": 0.81
  },
  "social_graph": {
    "following": ["principal-a", "principal-b"],
    "trusted_curators": ["principal-c"]
  },
  "recent_activity": {
    "votes_last_7d": 4,
    "funds_last_30d": 1
  }
}
```

## Proposed Rust API

We should add a separate Rust API service that the frontend queries by user id.

Recommended stack:

- Rust HTTP API
- background sync job from ICP canister
- off-chain store for recommendation features and feed cache

Recommended service name:

```text
apps/recommendation-api
```

### Core endpoints

#### 1. Get dynamic user profile

```http
GET /api/recommendations/profile/{user_id}
```

Response:

```json
{
  "user_id": "principal-text",
  "display_name": "Boris",
  "home_region": "Sofia",
  "reputation": 35.0,
  "risk_tolerance": "balanced",
  "top_categories": ["Events", "Technology"],
  "funding_behavior": {
    "backs_early": true,
    "average_supported_budget": 2200.0,
    "local_bias": 1.0
  },
  "similar_users": [
    {
      "user_id": "principal-2",
      "score": 0.88
    }
  ]
}
```

#### 2. Get personalized feed

```http
GET /api/recommendations/feed/{user_id}
```

Query params:

- `limit`
- `region`
- `scope=local|eu|global`
- `mode=trending|personal|blended`

Response:

```json
{
  "user_id": "principal-text",
  "generated_at": "2026-03-26T20:00:00Z",
  "items": [
    {
      "proposal_id": "2",
      "score": 0.94,
      "reasons": [
        "3 similar users funded this in the last 2 hours",
        "Matches your preferred category: Events",
        "Local to Sofia"
      ],
      "proposal": {
        "title": "Test",
        "region_tag": "Sofia",
        "category": "Events",
        "budget_amount": 2200.0,
        "status": "Backed"
      }
    }
  ]
}
```

#### 3. Similar proposals

```http
GET /api/recommendations/similar/{proposal_id}
```

Query params:

- `user_id`
- `limit`

Response:

```json
{
  "proposal_id": "2",
  "items": [
    {
      "proposal_id": "9",
      "score": 0.81,
      "reasons": ["Same region", "Same category", "Similar text embedding"]
    }
  ]
}
```

#### 4. Activity feed

```http
GET /api/recommendations/activity/{user_id}
```

Response:

```json
{
  "items": [
    {
      "type": "vote",
      "actor_id": "principal-x",
      "proposal_id": "44",
      "message": "Ivan voted yes on Solar School Roof",
      "timestamp": "2026-03-26T19:42:00Z"
    }
  ]
}
```

#### 5. Follow graph

```http
POST /api/recommendations/follow
```

Request:

```json
{
  "follower_id": "principal-a",
  "target_id": "principal-b"
}
```

#### 6. Leaderboards

```http
GET /api/recommendations/leaderboards?type=investors
GET /api/recommendations/leaderboards?type=accurate_voters
GET /api/recommendations/leaderboards?type=curators
```

## How the Rust API Should Build Recommendations

Use a hybrid score, not a single opaque model.

### Feed score

```text
score =
  personalized_behavior_score
  + similar_user_score
  + proposal_content_score
  + geographic_score
  + recency_score
  + social_proof_score
  + curator_follow_score
  + trust_score
```

### Inputs to compute

- vote history
- funded/backed history
- category affinity
- location preference
- recency and trend windows
- user-user similarity
- proposal-proposal similarity
- social graph
- "almost voted for" events

## What We Need to Add for "Almost Voted For"

This is not available now.

To support behavior-aware feeds, we need off-chain events like:

- proposal impression
- proposal detail open
- dwell time
- scroll depth
- vote dialog opened
- vote dialog closed without voting
- backed dialog opened
- backed dialog abandoned

Without those events, we can only model:

- voted
- did not vote

not:

- almost voted

## Biggest Blockers

1. No real DB-backed API exists yet.
2. `packages/db` is a placeholder, not an actual storage layer.
3. Frontend location is partly synthetic, derived from `region_tag`.
4. There is no follow graph.
5. There is no activity feed service.
6. There is no off-chain feature store.
7. There is no event capture for "almost voted for".
8. Current live canister data is still sparse for true personalization.

## Verified Notes

I verified the bobo frontend API test file runs:

```text
pnpm exec vitest run src/lib/api/api.test.ts
```

Result:

- `1` test file passed
- `3` tests passed

## Recommended Next Implementation Order

1. Add Rust recommendation API.
2. Add sync worker that mirrors canister users, proposals, votes, audit logs into off-chain storage.
3. Add derived user profile builder.
4. Add proposal embedding and similarity index.
5. Add recommendation feed endpoint.
6. Add activity/follow endpoints.
7. Add frontend event capture for "almost voted for".
8. Replace direct feed sorting in the frontend with recommendation API calls.

## Final Conclusion

If we want the frontend to "just query with the user id and get recommendation data back", we need a new Rust service.

The right frontend contract is:

```http
GET /api/recommendations/feed/{principal}
```

with the ICP principal string as the stable user id.

Today the web app is not querying a DB-backed recommendation backend.
It is querying the ICP canister directly through a typed actor layer.
