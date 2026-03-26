# OpenFairTrip Governance MVP

ICP Rust canister implementing the full proposal governance lifecycle:
community registration, proposal submission, reputation-weighted voting,
5/51 rule finalization, investor backing, and on-chain contract anchoring.

## Full Lifecycle

```
Community submits proposal
        ↓
    [Active]  ← community votes (10 min window)
        ↓
  finalize_proposal()
        ↓
  ┌─────┼──────────┐
  │     │          │
QuorumNotMet  Rejected  AwaitingFunding
              (-10 rep)   (+15 rep)
                              ↓
                     Investor calls back_proposal()
                              ↓
                           [Backed]
                              ↓
        Contract uses the company already attached to the proposal
                              ↓
                 Investor creates contract draft record
                              ↓
                     [Draft / PendingSignatures]
                              ↓
         Investor assigns company representative principal
                              ↓
            Company representative attaches signed package
                              ↓
         Investor confirms the signed package on-chain
             (or external QES provider signs off-chain)
                              ↓
                          [Signed]
                              ↓
              Future: milestone-based payout tracking
```

## Why backing is not payment

The canister records *decisions*, not *transfers*. When an investor backs
a proposal, they are signaling commitment — not sending money. How funds
actually reach the project is an off-chain concern between the parties.
The chain provides the auditable trail of who committed to what, and when.

The important governance rule is: if the proposal includes a company,
that company is part of what the community voted on. The investor can
fund the proposal, but cannot swap in a different executor later through
the contract flow.

## Contract anchoring — what and why

After a proposal is backed, the investor creates a **contract record** on-chain
for the company already approved in the proposal.
This record stores:

- The legal entity details (company name, registration ID, representative)
- A hash of the draft off-chain legal document
- A URI pointing to where the document can be retrieved
- Optionally, a second hash/URI pair for the fully signed package submitted by the company
- The signature status and timestamps

The blockchain does **not** store the actual legal contract. It anchors:
1. *That* a contract was created
2. *Which* document was agreed upon (by hash)
3. *Who* attached the signed package and *when*
4. *Who* confirmed the executed package and *when*

This provides a tamper-proof, publicly auditable record of the contract lifecycle
without putting sensitive legal documents on-chain.

If a proposal was submitted without a company, this MVP intentionally stops there:
the investor cannot choose a company unilaterally after the vote. A future version
can support a second governance step for company selection, but the current version
only contracts with companies that were part of the voted proposal.

## Internet Identity vs. legal signatures

| Concept | What it does | Legal weight |
|---|---|---|
| Internet Identity auth | Proves you are the ICP principal making the call | Platform authentication only |
| On-chain acknowledgement | Records that a principal consented via the app | Application-level consent, not legally binding |
| Qualified Electronic Signature (QES) | eIDAS-compliant, legally equivalent to handwritten | Full legal binding force |

The current MVP implements on-chain acknowledgement. The architecture includes
extension points (`ExternalQualifiedSignature` mode, `external_provider`,
`external_envelope_id`, `record_external_signature_status` endpoint) for
integrating a real eIDAS/QES provider (e.g. DocuSign, Skribble, qualified
trust service) in a future version.

## Prerequisites

```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
rustup target add wasm32-unknown-unknown
node --version   # 18+
```

## Quick start — local

```bash
cd icp_proposals_mvp
dfx start --background --clean
dfx deploy icp_proposals_mvp
cd frontend && npm install && npx vite
```

## Test the contract lifecycle from CLI

```bash
# (After creating a user, proposal with an approved company,
#  voting, finalizing to AwaitingFunding)

# Switch to investor, back the proposal
dfx identity use investor
dfx canister call icp_proposals_mvp back_proposal '(1 : nat64)'

# Create a draft contract record
dfx canister call icp_proposals_mvp create_contract_record '(1 : nat64, record {
  document_hash = "sha256:draft-a1b2c3d4e5f6";
  document_uri = "https://example.com/draft-contract.pdf";
  milestone_hash = null;
  signature_mode = variant { ExternalQualifiedSignature };
  external_provider = opt "DocuSign"
})'

# Investor assigns the company representative principal
dfx canister call icp_proposals_mvp assign_company_representative \
  '(1 : nat64, principal "aaaaa-bbbbb-ccccc-ddddd-eeeee-fffff-ggggg-hhhhh-ii")'

# Company representative attaches the executed package
dfx identity use company_rep
dfx canister call icp_proposals_mvp submit_company_signed_document '(1 : nat64, record {
  signed_document_hash = "sha256:final-f6e5d4c3b2a1";
  signed_document_uri = "https://example.com/final-signed-contract.pdf"
})'

# Investor confirms the signed package
dfx identity use investor
dfx canister call icp_proposals_mvp confirm_company_signed_document '(1 : nat64)'

# Check the contract
dfx canister call icp_proposals_mvp get_contract_record '(1 : nat64)'

# Check the combined phase
dfx canister call icp_proposals_mvp get_proposal_phase '(1 : nat64)'
```

## API reference

### User management
| Method | Type | Description |
|---|---|---|
| `create_my_profile` | update | Register as User or InvestorUser |
| `update_my_profile` | update | Update display name / region |
| `get_my_profile` | query | Current caller's profile |
| `get_user` | query | Any user by principal |
| `whoami` | query | Caller's principal |
| `request_verification` | update | Investor self-service verification (stub) |
| `admin_verify_investor` | update | Controller verifies investor |

### Proposals
| Method | Type | Description |
|---|---|---|
| `submit_proposal` | update | Community users only; may optionally include the company to be approved |
| `get_proposal` | query | By proposal ID |
| `list_proposals` | query | Optional status filter |

### Voting & finalization
| Method | Type | Description |
|---|---|---|
| `cast_vote` | update | Community users, Active proposals only |
| `get_proposal_votes` | query | All votes for a proposal |
| `finalize_proposal` | update | Early majority or deadline 5/51 rule |
| `back_proposal` | update | Verified investor, AwaitingFunding only |

### Contracts
| Method | Type | Description |
|---|---|---|
| `create_contract_record` | update | Backing investor creates record for Backed proposal, using the company already approved in the proposal |
| `assign_company_representative` | update | Backing investor assigns the company principal |
| `investor_ack_contract` | update | Investor acknowledges (on-chain ack mode) |
| `company_ack_contract` | update | Company rep acknowledges (on-chain ack mode) |
| `submit_company_signed_document` | update | Company rep anchors the executed package |
| `confirm_company_signed_document` | update | Backing investor confirms the executed package |
| `record_external_signature_status` | update | Controller-only, records e-sign result |
| `get_contract_record` | query | By proposal ID |
| `list_contracts` | query | Optional status filter |
| `get_proposal_phase` | query | Combined proposal + contract status |

### Transparency
| Method | Type | Description |
|---|---|---|
| `get_audit_log` | query | Paginated (limit, offset) |
| `get_my_vp` | query | Compute Vp for a region |
| `get_region_total_vp` | query | Total possible VP for a region |
| `get_config` | query | Governance parameters |

## Stable memory layout

| MemoryId | Content |
|---|---|
| 0 | Users (Principal → UserProfile) |
| 1 | Proposals (u64 → Proposal) |
| 2 | Votes (composite key → Vote) |
| 3 | Audit log (u64 → AuditEvent) |
| 4 | Contracts (u64 proposal_id → ContractRecord) |

## Intentionally deferred

- **Token transfers / escrow / treasury** — the canister records decisions, not money
- **Full eIDAS/QES integration** — extension points exist, provider integration is future work
- **Milestone-based payout tracking** — placeholder `milestone_hash` field exists
- **Full document storage** — only hashes and URIs are stored on-chain
- **Contract expiry automation** — `Expired` status exists but no timer-based transitions yet
- **Multi-signature / threshold signing** — single investor + single company rep for now

## Who does what

For the current MVP, the company side is handled by a designated company representative principal:

1. A proposal may optionally include a nominated company.
2. The community votes on that full proposal, including the nominated company.
3. The investor backs the approved proposal.
4. The investor creates the draft contract record for that already approved company.
5. The investor assigns the company representative principal if it was not known at proposal time.
6. The company representative signs the legal document off-chain.
7. The company representative attaches the signed package hash + URI on-chain.
8. The investor reviews and confirms that signed package.
9. The contract is now `Signed` and ready for a future payout workflow.
