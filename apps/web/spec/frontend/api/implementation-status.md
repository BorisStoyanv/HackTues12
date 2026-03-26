# Backend API Implementation Status

## Overview
This document tracks the implementation of the ICP canister API endpoints as defined in `bacckend-api.md`. The implementation is split between **Server Actions** (for read queries) and **Client Mutations** (for state-changing updates requiring cryptographic signatures).

**Canister ID:** `sk6yb-aqaaa-aaaad-qljxa-cai`

---

## 🔐 Authentication & Transport Layer
- **Transport:** `@dfinity/agent` is used for all communication.
- **Provider:** Boundary nodes at `https://icp0.io`.
- **Identity:** `Internet Identity` (II) is required for all update calls.

---

## 🛠 Update Methods (State Changing)
Located in `apps/web/src/lib/api/client-mutations.ts`. These must be executed on the client side.

| Method | Implementation Function | Status | Description |
| :--- | :--- | :--- | :--- |
| `create_my_profile` | `createMyProfileClient` | ✅ | Initializes a new user profile. |
| `update_my_profile` | `updateMyProfileClient` | ✅ | Updates username and region. |
| `request_verification` | `requestVerificationClient` | ✅ | Submits KYC/residency data. |
| `admin_verify_investor` | `adminVerifyInvestorClient` | ✅ | (Admin Only) Verifies an investor principal. |
| `submit_proposal` | `submitProposalClient` | ✅ | Submits a new proposal with location data. |
| `cast_vote` | `castVoteClient` | ✅ | Records a yes/no/abstain vote. |
| `finalize_proposal` | `finalizeProposalClient` | ✅ | Moves proposal from voting to funding/completed. |
| `back_proposal` | `backProposalClient` | ✅ | Pledges capital to a proposal. |
| `create_contract_record` | `createContractRecordClient` | ✅ | Generates a contract between investor/company. |
| `investor_ack_contract` | `investorAckContractClient` | ✅ | Investor signature/acknowledgment. |
| `company_ack_contract` | `companyAckContractClient` | ✅ | Company signature/acknowledgment. |
| `record_external_signature_status` | `recordExternalSignatureStatusClient` | ✅ | Links external legal signatures to the record. |

---

## 🔍 Query Methods (Read Only)
Located in `apps/web/src/lib/actions/`. These can be used in Server Components.

### User Data (`users.ts`)
| Method | Implementation Function | Status | Description |
| :--- | :--- | :--- | :--- |
| `get_user` | `fetchUserByPrincipal` | ✅ | Fetches profile for any principal. |
| `get_my_profile` | `fetchMyProfile` | ✅ | Fetches the caller's profile. |
| `whoami` | `fetchWhoAmI` | ✅ | Returns the caller's principal. |
| `get_my_vp` | `fetchMyVP` | ✅ | Returns the caller's voting power ($V_p$). |
| `get_region_total_vp` | `fetchRegionVP` | ✅ | Returns total $V_p$ for a specific region. |

### Proposal & Platform Data (`proposals.ts`)
| Method | Implementation Function | Status | Description |
| :--- | :--- | :--- | :--- |
| `get_proposal` | `fetchProposalById` | ✅ | Fetches detailed proposal data. |
| `list_proposals` | `fetchAllProposals` | ✅ | Fetches all active/historic proposals. |
| `get_proposal_votes` | `fetchProposalVotes` | ✅ | Lists all votes cast for a proposal. |
| `get_contract_record` | `fetchContractRecord` | ✅ | Fetches a specific legal contract state. |
| `list_contracts` | `fetchAllContracts` | ✅ | Lists all platform contracts. |
| `get_proposal_phase` | `fetchProposalPhase` | ✅ | Returns current stage (ai_debate, voting, etc). |
| `get_audit_log` | `fetchAuditLogs` | ✅ | Platform-wide event log for transparency. |
| `get_config` | `fetchConfig` | ✅ | Platform settings (quorum, governance token). |

---

## 📦 Data Models
Defined in `apps/web/src/lib/types/api.ts`.
- **Serialization:** Server actions automatically convert `BigInt` to `Number` and `Principal` objects to `string` for safe JSON transmission to the frontend.
- **Location Context:** Integrated Mapbox-friendly coordinates (lat/lng) directly in the `Proposal` model.
