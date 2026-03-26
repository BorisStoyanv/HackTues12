use std::borrow::Cow;
use std::cell::RefCell;

use candid::{CandidType, Decode, Encode, Nat, Principal};
use crc32fast::Hasher as Crc32Hasher;
use ic_cdk::api::{canister_self, msg_caller, time};
use ic_cdk::call::Call;
use ic_cdk_macros::{init, post_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
    DefaultMemoryImpl, StableBTreeMap, StableCell, Storable,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha224};

type Memory = VirtualMemory<DefaultMemoryImpl>;
type ApiResult<T> = Result<T, String>;
type Tokens = Nat;
type Subaccount = Vec<u8>;

const USERS_MEMORY_ID: MemoryId = MemoryId::new(0);
const PROPOSALS_MEMORY_ID: MemoryId = MemoryId::new(1);
const VOTES_MEMORY_ID: MemoryId = MemoryId::new(2);
const AUDIT_LOG_MEMORY_ID: MemoryId = MemoryId::new(3);
const COUNTERS_MEMORY_ID: MemoryId = MemoryId::new(4);
const SETTINGS_MEMORY_ID: MemoryId = MemoryId::new(5);

const DAY_NS: u64 = 86_400_000_000_000;
const DEFAULT_VOTING_WINDOW_NS: u64 = 7 * DAY_NS;
const DEFAULT_ACTIVE_WINDOW_NS: u64 = 90 * DAY_NS;
const DEFAULT_QUORUM_BPS: u16 = 500;
const DEFAULT_APPROVAL_BPS: u16 = 5_100;
const DEFAULT_SMALL_REGION_CUTOFF: u32 = 20;
const DEFAULT_SMALL_REGION_MIN_VOTES: u32 = 1;
const DEFAULT_LEDGER_CANISTER_ID_TEXT: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const DEFAULT_LEDGER_TRANSFER_FEE_E8S: u64 = 10_000;
const ESCROW_SUBACCOUNT_PREFIX: &[u8] = b"hacktues-consensus-v1";

macro_rules! impl_storable {
    ($ty:ty, $max_size:expr, $fixed:expr) => {
        impl Storable for $ty {
            fn to_bytes(&self) -> Cow<'_, [u8]> {
                Cow::Owned(Encode!(self).expect("failed to encode storable value"))
            }

            fn into_bytes(self) -> Vec<u8> {
                Encode!(&self).expect("failed to encode owned storable value")
            }

            fn from_bytes(bytes: Cow<[u8]>) -> Self {
                Decode!(bytes.as_ref(), Self).expect("failed to decode storable value")
            }

            const BOUND: Bound = Bound::Bounded {
                max_size: $max_size,
                is_fixed_size: $fixed,
            };
        }
    };
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
enum UserType {
    Community,
    Investor,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct UserProfile {
    user_type: UserType,
    reputation: f64,
    home_region: Option<String>,
    last_activity_ts: u64,
    activity_count: u32,
    vote_count: u32,
    is_local_verified: bool,
    has_expert_standing: bool,
    concluded_votes: u32,
    accurate_votes: u32,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
enum ProposalKind {
    OpenFunding,
    ProgramAllocation,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
enum ProposalStatus {
    Active,
    QuorumNotMet,
    Rejected,
    AwaitingFunding,
    Backed,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
enum EscrowState {
    Held,
    Released,
    Refunded,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct EscrowAgreement {
    funder: Principal,
    beneficiary: Principal,
    amount_e8s: u64,
    transfer_fee_e8s: u64,
    escrow_subaccount_hex: String,
    deposit_block_index: u64,
    state: EscrowState,
    deposit_reference: Option<String>,
    release_reference: Option<String>,
    refund_reference: Option<String>,
    deposited_at: u64,
    released_at: Option<u64>,
    refunded_at: Option<u64>,
    release_block_index: Option<u64>,
    refund_block_index: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct EscrowAccountView {
    proposal_id: u64,
    ledger_canister_id: Principal,
    account_owner: Principal,
    subaccount_hex: String,
    account_id_hex: String,
    requested_amount_e8s: u64,
    suggested_transfer_fee_e8s: u64,
    suggested_deposit_e8s: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct Proposal {
    id: u64,
    kind: ProposalKind,
    submitter: Principal,
    beneficiary: Principal,
    region_tag: String,
    title: String,
    description: String,
    budget_description: String,
    requested_funding_e8s: u64,
    fairness_score: Option<f64>,
    risk_flags: Vec<String>,
    funding_program_id: Option<u64>,
    backed_by: Option<Principal>,
    backed_at: Option<u64>,
    status: ProposalStatus,
    created_at: u64,
    voting_ends_at: u64,
    yes_weight: f64,
    no_weight: f64,
    voter_count: u32,
    escrow: Option<EscrowAgreement>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct Vote {
    proposal_id: u64,
    voter: Principal,
    in_favor: bool,
    weight: f64,
    timestamp: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
enum AuditEventType {
    UserRegistered,
    AttributeVerified,
    ProposalSubmitted,
    AiScoreIngested,
    VoteCast,
    ProposalFinalized,
    ProposalBacked,
    EscrowReleased,
    EscrowRefunded,
    ReputationAwarded,
    ReputationPenalized,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct AuditEvent {
    id: u64,
    timestamp: u64,
    actor: Principal,
    event_type: AuditEventType,
    proposal_id: Option<u64>,
    payload: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
struct Counters {
    next_proposal_id: u64,
    next_event_id: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct CanisterSettings {
    controller: Principal,
    ledger_canister_id: Principal,
    quorum_basis_points: u16,
    approval_basis_points: u16,
    active_window_ns: u64,
    voting_window_ns: u64,
    small_region_cutoff: u32,
    small_region_min_votes: u32,
}

impl Default for CanisterSettings {
    fn default() -> Self {
        Self {
            controller: Principal::anonymous(),
            ledger_canister_id: default_ledger_canister_id(),
            quorum_basis_points: DEFAULT_QUORUM_BPS,
            approval_basis_points: DEFAULT_APPROVAL_BPS,
            active_window_ns: DEFAULT_ACTIVE_WINDOW_NS,
            voting_window_ns: DEFAULT_VOTING_WINDOW_NS,
            small_region_cutoff: DEFAULT_SMALL_REGION_CUTOFF,
            small_region_min_votes: DEFAULT_SMALL_REGION_MIN_VOTES,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct RegisterUserInput {
    user_type: UserType,
    home_region: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct SubmitProposalInput {
    title: String,
    description: String,
    budget_description: String,
    region_tag: String,
    beneficiary: Principal,
    requested_funding_e8s: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct VoteInput {
    proposal_id: u64,
    in_favor: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct FundProposalInput {
    proposal_id: u64,
    amount_e8s: u64,
    deposit_block_index: Option<u64>,
    deposit_reference: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct EscrowResolutionInput {
    proposal_id: u64,
    reference: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct AiReviewInput {
    proposal_id: u64,
    fairness_score: Option<f64>,
    risk_flags: Vec<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct VerificationInput {
    user_principal: Principal,
    is_local_verified: bool,
    has_expert_standing: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct UpdateSettingsInput {
    ledger_canister_id: Option<Principal>,
    quorum_basis_points: Option<u16>,
    approval_basis_points: Option<u16>,
    active_window_ns: Option<u64>,
    voting_window_ns: Option<u64>,
    small_region_cutoff: Option<u32>,
    small_region_min_votes: Option<u32>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
struct LedgerAccount {
    owner: Principal,
    subaccount: Option<Subaccount>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct LedgerTransferArg {
    from_subaccount: Option<Subaccount>,
    to: LedgerAccount,
    amount: Tokens,
    fee: Option<Tokens>,
    memo: Option<Vec<u8>>,
    created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum LedgerTransferError {
    BadFee { expected_fee: Tokens },
    BadBurn { min_burn_amount: Tokens },
    InsufficientFunds { balance: Tokens },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    TemporarilyUnavailable,
    Duplicate { duplicate_of: Tokens },
    GenericError { error_code: Tokens, message: String },
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum LedgerTransferResult {
    Ok(Tokens),
    Err(LedgerTransferError),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct LedgerTransferFromArg {
    spender_subaccount: Option<Subaccount>,
    from: LedgerAccount,
    to: LedgerAccount,
    amount: Tokens,
    fee: Option<Tokens>,
    memo: Option<Vec<u8>>,
    created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum LedgerTransferFromError {
    BadFee { expected_fee: Tokens },
    BadBurn { min_burn_amount: Tokens },
    InsufficientFunds { balance: Tokens },
    InsufficientAllowance { allowance: Tokens },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Tokens },
    TemporarilyUnavailable,
    GenericError { error_code: Tokens, message: String },
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum LedgerTransferFromResult {
    Ok(Tokens),
    Err(LedgerTransferFromError),
}

impl_storable!(UserProfile, 4_096, false);
impl_storable!(Proposal, 32_768, false);
impl_storable!(Vote, 512, false);
impl_storable!(AuditEvent, 8_192, false);
impl_storable!(Counters, 64, true);
impl_storable!(CanisterSettings, 256, false);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USERS: RefCell<StableBTreeMap<String, UserProfile, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|manager| manager.borrow().get(USERS_MEMORY_ID))
        )
    );

    static PROPOSALS: RefCell<StableBTreeMap<u64, Proposal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|manager| manager.borrow().get(PROPOSALS_MEMORY_ID))
        )
    );

    static VOTES: RefCell<StableBTreeMap<String, Vote, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|manager| manager.borrow().get(VOTES_MEMORY_ID))
        )
    );

    static AUDIT_LOG: RefCell<StableBTreeMap<u64, AuditEvent, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|manager| manager.borrow().get(AUDIT_LOG_MEMORY_ID))
        )
    );

    static COUNTERS: RefCell<StableCell<Counters, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|manager| manager.borrow().get(COUNTERS_MEMORY_ID)),
            Counters::default(),
        )
    );

    static SETTINGS: RefCell<StableCell<CanisterSettings, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|manager| manager.borrow().get(SETTINGS_MEMORY_ID)),
            CanisterSettings::default(),
        )
    );
}

#[init]
fn init() {
    ensure_controller_initialized();
}

#[post_upgrade]
fn post_upgrade() {
    ensure_controller_initialized();
}

#[update]
fn register_user(input: RegisterUserInput) -> ApiResult<UserProfile> {
    let principal = msg_caller();
    let key = principal.to_text();

    if USERS.with(|users| users.borrow().contains_key(&key)) {
        return Err("Caller is already registered".to_string());
    }

    let home_region = normalize_optional_text(input.home_region);
    if input.user_type == UserType::Community && home_region.is_none() {
        return Err("Community users must provide a home_region".to_string());
    }

    let profile = UserProfile {
        user_type: input.user_type,
        reputation: 1.0,
        home_region,
        last_activity_ts: now(),
        activity_count: 1,
        vote_count: 0,
        is_local_verified: false,
        has_expert_standing: false,
        concluded_votes: 0,
        accurate_votes: 0,
    };

    USERS.with(|users| {
        users.borrow_mut().insert(key, profile.clone());
    });

    record_event(
        principal,
        AuditEventType::UserRegistered,
        None,
        json!({ "user_type": profile.user_type, "home_region": profile.home_region }),
    );

    Ok(profile)
}

#[update]
fn set_user_verification(input: VerificationInput) -> ApiResult<UserProfile> {
    require_controller()?;

    let key = input.user_principal.to_text();
    let updated = USERS.with(|users| {
        let mut users = users.borrow_mut();
        let mut profile = users
            .get(&key)
            .ok_or_else(|| "User not found".to_string())?;

        profile.is_local_verified = input.is_local_verified;
        profile.has_expert_standing = input.has_expert_standing;
        users.insert(key, profile.clone());
        Ok::<UserProfile, String>(profile)
    })?;

    record_event(
        msg_caller(),
        AuditEventType::AttributeVerified,
        None,
        json!({
            "user_principal": input.user_principal,
            "is_local_verified": input.is_local_verified,
            "has_expert_standing": input.has_expert_standing
        }),
    );

    Ok(updated)
}

#[update]
fn submit_proposal(input: SubmitProposalInput) -> ApiResult<Proposal> {
    let submitter = msg_caller();
    let mut profile = require_registered_user(&submitter)?;

    if profile.user_type != UserType::Community {
        return Err("Only community users can submit proposals".to_string());
    }

    let title = normalize_text(input.title, "title")?;
    let description = normalize_text(input.description, "description")?;
    let budget_description = normalize_text(input.budget_description, "budget_description")?;
    let region_tag = normalize_text(input.region_tag, "region_tag")?;

    let proposal_id = next_proposal_id();
    let created_at = now();
    let settings = get_settings();
    let proposal = Proposal {
        id: proposal_id,
        kind: ProposalKind::OpenFunding,
        submitter,
        beneficiary: input.beneficiary,
        region_tag: region_tag.clone(),
        title,
        description,
        budget_description,
        requested_funding_e8s: input.requested_funding_e8s,
        fairness_score: None,
        risk_flags: Vec::new(),
        funding_program_id: None,
        backed_by: None,
        backed_at: None,
        status: ProposalStatus::Active,
        created_at,
        voting_ends_at: created_at + settings.voting_window_ns,
        yes_weight: 0.0,
        no_weight: 0.0,
        voter_count: 0,
        escrow: None,
    };

    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal_id, proposal.clone());
    });

    profile.last_activity_ts = created_at;
    profile.activity_count = profile.activity_count.saturating_add(1);
    save_user(&submitter, &profile);

    record_event(
        submitter,
        AuditEventType::ProposalSubmitted,
        Some(proposal_id),
        json!({
            "region_tag": region_tag,
            "beneficiary": input.beneficiary,
            "requested_funding_e8s": input.requested_funding_e8s
        }),
    );

    Ok(proposal)
}

#[update]
fn submit_vote(input: VoteInput) -> ApiResult<Proposal> {
    let voter = msg_caller();
    let mut profile = require_registered_user(&voter)?;
    if profile.user_type != UserType::Community {
        return Err("Only community users can vote".to_string());
    }

    let mut proposal = get_proposal(input.proposal_id)?;
    if proposal.status != ProposalStatus::Active {
        return Err("Proposal is not open for voting".to_string());
    }

    if now() > proposal.voting_ends_at {
        return Err("Voting period has ended. Finalize the proposal first.".to_string());
    }

    let vote_key = build_vote_key(input.proposal_id, &voter);
    if VOTES.with(|votes| votes.borrow().contains_key(&vote_key)) {
        return Err("Caller has already voted on this proposal".to_string());
    }

    let weight = compute_vote_power(&profile, &proposal.region_tag);
    let vote = Vote {
        proposal_id: input.proposal_id,
        voter,
        in_favor: input.in_favor,
        weight,
        timestamp: now(),
    };

    if input.in_favor {
        proposal.yes_weight += weight;
    } else {
        proposal.no_weight += weight;
    }
    proposal.voter_count = proposal.voter_count.saturating_add(1);

    VOTES.with(|votes| {
        votes.borrow_mut().insert(vote_key, vote.clone());
    });
    save_proposal(&proposal);

    profile.last_activity_ts = now();
    profile.activity_count = profile.activity_count.saturating_add(1);
    profile.vote_count = profile.vote_count.saturating_add(1);
    save_user(&voter, &profile);

    record_event(
        voter,
        AuditEventType::VoteCast,
        Some(input.proposal_id),
        json!({
            "in_favor": input.in_favor,
            "weight": weight
        }),
    );

    Ok(proposal)
}

#[update]
fn finalize_proposal(proposal_id: u64) -> ApiResult<Proposal> {
    let mut proposal = get_proposal(proposal_id)?;
    if proposal.status != ProposalStatus::Active {
        return Err("Proposal has already been finalized".to_string());
    }

    if now() < proposal.voting_ends_at {
        return Err("Voting deadline has not passed yet".to_string());
    }

    let quorum_threshold = calculate_quorum_threshold(&proposal.region_tag);
    let quorum_met = proposal.voter_count >= quorum_threshold;
    let total_weight = proposal.yes_weight + proposal.no_weight;
    let majority_passed = is_majority_passed(proposal.yes_weight, total_weight);

    if !quorum_met {
        proposal.status = ProposalStatus::QuorumNotMet;
    } else if !majority_passed {
        proposal.status = ProposalStatus::Rejected;
    } else if has_held_escrow(&proposal) {
        proposal.status = ProposalStatus::Backed;
    } else {
        proposal.status = ProposalStatus::AwaitingFunding;
    }

    save_proposal(&proposal);

    match proposal.status {
        ProposalStatus::Rejected => {
            adjust_reputation(&proposal.submitter, -10.0)?;
            settle_voter_outcomes(proposal_id, false)?;
            record_event(
                proposal.submitter,
                AuditEventType::ReputationPenalized,
                Some(proposal_id),
                json!({ "delta": -10.0 }),
            );
        }
        ProposalStatus::AwaitingFunding | ProposalStatus::Backed => {
            adjust_reputation(&proposal.submitter, 15.0)?;
            settle_voter_outcomes(proposal_id, true)?;
            record_event(
                proposal.submitter,
                AuditEventType::ReputationAwarded,
                Some(proposal_id),
                json!({ "delta": 15.0 }),
            );
        }
        ProposalStatus::QuorumNotMet | ProposalStatus::Active => {}
    }

    record_event(
        msg_caller(),
        AuditEventType::ProposalFinalized,
        Some(proposal_id),
        json!({
            "status": proposal.status,
            "quorum_threshold": quorum_threshold,
            "voter_count": proposal.voter_count,
            "yes_weight": proposal.yes_weight,
            "no_weight": proposal.no_weight,
            "majority_passed": majority_passed
        }),
    );

    Ok(proposal)
}

#[update]
async fn fund_proposal(input: FundProposalInput) -> ApiResult<Proposal> {
    let funder = msg_caller();
    let mut profile = require_registered_user(&funder)?;
    if profile.user_type != UserType::Investor {
        return Err("Only investor accounts can fund proposals".to_string());
    }

    if input.amount_e8s == 0 {
        return Err("Funding amount must be greater than zero".to_string());
    }

    let mut proposal = get_proposal(input.proposal_id)?;
    match proposal.status {
        ProposalStatus::Active | ProposalStatus::AwaitingFunding => {}
        ProposalStatus::Backed => return Err("Proposal already has escrow funding".to_string()),
        ProposalStatus::QuorumNotMet | ProposalStatus::Rejected => {
            return Err("Cannot fund a proposal that has already failed voting".to_string())
        }
    }

    if proposal.escrow.is_some() {
        return Err("Escrow has already been created for this proposal".to_string());
    }

    if input.amount_e8s != proposal.requested_funding_e8s {
        return Err("Funding amount must exactly match requested_funding_e8s".to_string());
    }

    let transfer_fee_e8s = fetch_ledger_fee_e8s().await?;
    let escrow_deposit_e8s = input
        .amount_e8s
        .checked_add(transfer_fee_e8s)
        .ok_or_else(|| "Escrow deposit amount overflowed".to_string())?;
    let deposit_block_index = transfer_from_investor_to_escrow(
        funder,
        input.proposal_id,
        escrow_deposit_e8s,
        transfer_fee_e8s,
    )
    .await?;

    let escrow = EscrowAgreement {
        funder,
        beneficiary: proposal.beneficiary,
        amount_e8s: input.amount_e8s,
        transfer_fee_e8s,
        escrow_subaccount_hex: hex::encode(escrow_subaccount_for_proposal(input.proposal_id)),
        deposit_block_index,
        state: EscrowState::Held,
        deposit_reference: normalize_optional_text(input.deposit_reference),
        release_reference: None,
        refund_reference: None,
        deposited_at: now(),
        released_at: None,
        refunded_at: None,
        release_block_index: None,
        refund_block_index: None,
    };

    proposal.backed_by = Some(funder);
    proposal.backed_at = Some(escrow.deposited_at);
    proposal.escrow = Some(escrow.clone());
    if proposal.status == ProposalStatus::AwaitingFunding {
        proposal.status = ProposalStatus::Backed;
    }
    save_proposal(&proposal);

    profile.last_activity_ts = now();
    profile.activity_count = profile.activity_count.saturating_add(1);
    save_user(&funder, &profile);

    record_event(
        funder,
        AuditEventType::ProposalBacked,
        Some(input.proposal_id),
        json!({
            "amount_e8s": input.amount_e8s,
            "deposit_block_index": deposit_block_index,
            "deposit_reference": escrow.deposit_reference,
            "escrow_subaccount_hex": escrow.escrow_subaccount_hex,
            "escrow_deposit_e8s": escrow_deposit_e8s,
            "transfer_fee_e8s": transfer_fee_e8s
        }),
    );

    Ok(proposal)
}

#[update]
async fn release_escrow(input: EscrowResolutionInput) -> ApiResult<Proposal> {
    let beneficiary = msg_caller();
    let mut beneficiary_profile = require_registered_user(&beneficiary)?;
    let mut proposal = get_proposal(input.proposal_id)?;

    if proposal.status != ProposalStatus::Backed {
        return Err("Proposal is not ready for beneficiary payout".to_string());
    }

    if proposal.beneficiary != beneficiary {
        return Err("Only the designated beneficiary can claim escrow".to_string());
    }

    let escrow = proposal
        .escrow
        .as_mut()
        .ok_or_else(|| "Proposal has no escrow agreement".to_string())?;
    if escrow.state != EscrowState::Held {
        return Err("Escrow is no longer in the held state".to_string());
    }

    let current_fee_e8s = fetch_ledger_fee_e8s().await?;
    let release_block_index = transfer_from_escrow_subaccount(
        proposal.id,
        LedgerAccount {
            owner: beneficiary,
            subaccount: None,
        },
        escrow.amount_e8s,
        current_fee_e8s,
    )
    .await?;

    let release_reference = normalize_optional_text(input.reference);
    escrow.state = EscrowState::Released;
    escrow.released_at = Some(now());
    escrow.release_reference = release_reference.clone();
    escrow.release_block_index = Some(release_block_index);
    let released_amount = escrow.amount_e8s;
    save_proposal(&proposal);

    beneficiary_profile.last_activity_ts = now();
    beneficiary_profile.activity_count = beneficiary_profile.activity_count.saturating_add(1);
    save_user(&beneficiary, &beneficiary_profile);

    record_event(
        beneficiary,
        AuditEventType::EscrowReleased,
        Some(input.proposal_id),
        json!({
            "amount_e8s": released_amount,
            "release_block_index": release_block_index,
            "release_reference": release_reference
        }),
    );

    Ok(proposal)
}

#[update]
async fn refund_escrow(input: EscrowResolutionInput) -> ApiResult<Proposal> {
    let funder = msg_caller();
    let mut funder_profile = require_registered_user(&funder)?;
    let mut proposal = get_proposal(input.proposal_id)?;

    match proposal.status {
        ProposalStatus::QuorumNotMet | ProposalStatus::Rejected => {}
        _ => return Err("Escrow can only be refunded after a failed proposal".to_string()),
    }

    let escrow = proposal
        .escrow
        .as_mut()
        .ok_or_else(|| "Proposal has no escrow agreement".to_string())?;
    if escrow.funder != funder {
        return Err("Only the original funder can request the refund".to_string());
    }
    if escrow.state != EscrowState::Held {
        return Err("Escrow is no longer in the held state".to_string());
    }

    let current_fee_e8s = fetch_ledger_fee_e8s().await?;
    let refund_block_index = transfer_from_escrow_subaccount(
        proposal.id,
        LedgerAccount {
            owner: funder,
            subaccount: None,
        },
        escrow.amount_e8s,
        current_fee_e8s,
    )
    .await?;

    let refund_reference = normalize_optional_text(input.reference);
    escrow.state = EscrowState::Refunded;
    escrow.refunded_at = Some(now());
    escrow.refund_reference = refund_reference.clone();
    escrow.refund_block_index = Some(refund_block_index);
    let refunded_amount = escrow.amount_e8s;
    save_proposal(&proposal);

    funder_profile.last_activity_ts = now();
    funder_profile.activity_count = funder_profile.activity_count.saturating_add(1);
    save_user(&funder, &funder_profile);

    record_event(
        funder,
        AuditEventType::EscrowRefunded,
        Some(input.proposal_id),
        json!({
            "amount_e8s": refunded_amount,
            "refund_block_index": refund_block_index,
            "refund_reference": refund_reference
        }),
    );

    Ok(proposal)
}

#[update]
fn ingest_ai_review(input: AiReviewInput) -> ApiResult<Proposal> {
    require_controller()?;

    let mut proposal = get_proposal(input.proposal_id)?;
    proposal.fairness_score = input.fairness_score;
    proposal.risk_flags = input
        .risk_flags
        .into_iter()
        .filter_map(|flag| {
            let trimmed = flag.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        })
        .collect();

    save_proposal(&proposal);

    record_event(
        msg_caller(),
        AuditEventType::AiScoreIngested,
        Some(input.proposal_id),
        json!({
            "fairness_score": proposal.fairness_score,
            "risk_flags": proposal.risk_flags
        }),
    );

    Ok(proposal)
}

#[update]
fn update_settings(input: UpdateSettingsInput) -> ApiResult<CanisterSettings> {
    require_controller()?;

    let mut settings = get_settings();

    if let Some(ledger_canister_id) = input.ledger_canister_id {
        settings.ledger_canister_id = ledger_canister_id;
    }

    if let Some(quorum_basis_points) = input.quorum_basis_points {
        if quorum_basis_points == 0 || quorum_basis_points > 10_000 {
            return Err("quorum_basis_points must be between 1 and 10000".to_string());
        }
        settings.quorum_basis_points = quorum_basis_points;
    }

    if let Some(approval_basis_points) = input.approval_basis_points {
        if approval_basis_points == 0 || approval_basis_points > 10_000 {
            return Err("approval_basis_points must be between 1 and 10000".to_string());
        }
        settings.approval_basis_points = approval_basis_points;
    }

    if let Some(active_window_ns) = input.active_window_ns {
        if active_window_ns == 0 {
            return Err("active_window_ns must be greater than zero".to_string());
        }
        settings.active_window_ns = active_window_ns;
    }

    if let Some(voting_window_ns) = input.voting_window_ns {
        if voting_window_ns == 0 {
            return Err("voting_window_ns must be greater than zero".to_string());
        }
        settings.voting_window_ns = voting_window_ns;
    }

    if let Some(small_region_cutoff) = input.small_region_cutoff {
        settings.small_region_cutoff = small_region_cutoff;
    }

    if let Some(small_region_min_votes) = input.small_region_min_votes {
        if small_region_min_votes == 0 {
            return Err("small_region_min_votes must be greater than zero".to_string());
        }
        settings.small_region_min_votes = small_region_min_votes;
    }

    SETTINGS.with(|stored| {
        let _ = stored.borrow_mut().set(settings.clone());
    });

    Ok(settings)
}

#[query]
fn get_settings_view() -> CanisterSettings {
    get_settings()
}

#[query]
fn get_proposal_escrow_account(proposal_id: u64) -> ApiResult<EscrowAccountView> {
    let proposal = get_proposal(proposal_id)?;
    build_escrow_account_view(&proposal)
}

#[query]
fn get_my_profile() -> Option<UserProfile> {
    USERS.with(|users| users.borrow().get(&msg_caller().to_text()))
}

#[query]
fn get_user(principal: Principal) -> Option<UserProfile> {
    USERS.with(|users| users.borrow().get(&principal.to_text()))
}

#[query]
fn get_proposal_view(proposal_id: u64) -> Option<Proposal> {
    PROPOSALS.with(|proposals| proposals.borrow().get(&proposal_id))
}

#[query]
fn list_proposals() -> Vec<Proposal> {
    let mut proposals = PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .iter()
            .map(|entry| entry.value())
            .collect::<Vec<_>>()
    });
    proposals.sort_by(|left, right| right.id.cmp(&left.id));
    proposals
}

#[query]
fn list_votes(proposal_id: u64) -> Vec<Vote> {
    list_votes_internal(proposal_id)
}

#[query]
fn list_audit_events(proposal_id: Option<u64>) -> Vec<AuditEvent> {
    let mut events = AUDIT_LOG.with(|events| {
        events
            .borrow()
            .iter()
            .filter_map(|entry| {
                let event = entry.value();
                match proposal_id {
                    Some(filter_id) if event.proposal_id != Some(filter_id) => None,
                    _ => Some(event),
                }
            })
            .collect::<Vec<_>>()
    });
    events.sort_by(|left, right| right.id.cmp(&left.id));
    events
}

#[query]
fn get_quorum_snapshot(region_tag: String) -> u32 {
    calculate_quorum_threshold(&region_tag)
}

#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

fn ensure_controller_initialized() {
    SETTINGS.with(|settings| {
        let mut settings = settings.borrow_mut();
        let mut current = settings.get().clone();
        if current.controller == Principal::anonymous() {
            current.controller = msg_caller();
            let _ = settings.set(current);
        }
    });
}

fn require_controller() -> ApiResult<()> {
    let settings = get_settings();
    if msg_caller() != settings.controller {
        return Err("Only the configured controller may call this method".to_string());
    }

    Ok(())
}

fn require_registered_user(principal: &Principal) -> ApiResult<UserProfile> {
    USERS.with(|users| {
        users
            .borrow()
            .get(&principal.to_text())
            .ok_or_else(|| "Caller is not registered".to_string())
    })
}

fn get_proposal(proposal_id: u64) -> ApiResult<Proposal> {
    PROPOSALS.with(|proposals| {
        proposals
            .borrow()
            .get(&proposal_id)
            .ok_or_else(|| format!("Proposal {proposal_id} not found"))
    })
}

fn save_user(principal: &Principal, profile: &UserProfile) {
    USERS.with(|users| {
        users
            .borrow_mut()
            .insert(principal.to_text(), profile.clone());
    });
}

fn save_proposal(proposal: &Proposal) {
    PROPOSALS.with(|proposals| {
        proposals.borrow_mut().insert(proposal.id, proposal.clone());
    });
}

fn get_settings() -> CanisterSettings {
    SETTINGS.with(|settings| settings.borrow().get().clone())
}

fn default_ledger_canister_id() -> Principal {
    Principal::from_text(DEFAULT_LEDGER_CANISTER_ID_TEXT)
        .expect("default ICP ledger canister id must be valid")
}

fn next_proposal_id() -> u64 {
    COUNTERS.with(|cell| {
        let mut cell = cell.borrow_mut();
        let mut counters = cell.get().clone();
        counters.next_proposal_id = counters.next_proposal_id.saturating_add(1);
        let next = counters.next_proposal_id;
        let _ = cell.set(counters);
        next
    })
}

fn next_event_id() -> u64 {
    COUNTERS.with(|cell| {
        let mut cell = cell.borrow_mut();
        let mut counters = cell.get().clone();
        counters.next_event_id = counters.next_event_id.saturating_add(1);
        let next = counters.next_event_id;
        let _ = cell.set(counters);
        next
    })
}

fn record_event(
    actor: Principal,
    event_type: AuditEventType,
    proposal_id: Option<u64>,
    payload: serde_json::Value,
) {
    let event = AuditEvent {
        id: next_event_id(),
        timestamp: now(),
        actor,
        event_type,
        proposal_id,
        payload: payload.to_string(),
    };

    AUDIT_LOG.with(|events| {
        events.borrow_mut().insert(event.id, event);
    });
}

fn adjust_reputation(principal: &Principal, delta: f64) -> ApiResult<()> {
    let key = principal.to_text();
    USERS.with(|users| {
        let mut users = users.borrow_mut();
        let mut profile = users
            .get(&key)
            .ok_or_else(|| "User not found while adjusting reputation".to_string())?;
        profile.reputation = (profile.reputation + delta).max(1.0);
        users.insert(key, profile);
        Ok(())
    })
}

fn settle_voter_outcomes(proposal_id: u64, winning_side_yes: bool) -> ApiResult<()> {
    let votes = list_votes_internal(proposal_id);
    for vote in votes {
        USERS.with(|users| {
            let mut users = users.borrow_mut();
            let key = vote.voter.to_text();
            let mut profile = users
                .get(&key)
                .ok_or_else(|| "Voter record missing during settlement".to_string())?;
            profile.concluded_votes = profile.concluded_votes.saturating_add(1);
            if vote.in_favor == winning_side_yes {
                profile.accurate_votes = profile.accurate_votes.saturating_add(1);
            }
            users.insert(key, profile);
            Ok::<(), String>(())
        })?;
    }

    Ok(())
}

fn list_votes_internal(proposal_id: u64) -> Vec<Vote> {
    let prefix = format!("{proposal_id}:");
    VOTES.with(|votes| {
        votes
            .borrow()
            .iter()
            .filter_map(|entry| {
                let vote = entry.value();
                entry.key().starts_with(&prefix).then_some(vote)
            })
            .collect()
    })
}

fn calculate_quorum_threshold(region_tag: &str) -> u32 {
    let settings = get_settings();
    let active_users = USERS.with(|users| {
        users
            .borrow()
            .iter()
            .filter_map(|entry| {
                let profile = entry.value();
                (profile.user_type == UserType::Community
                    && profile.home_region.as_deref() == Some(region_tag)
                    && now().saturating_sub(profile.last_activity_ts) <= settings.active_window_ns)
                    .then_some(())
            })
            .count() as u32
    });

    if active_users < settings.small_region_cutoff {
        return settings.small_region_min_votes;
    }

    let numerator = active_users.saturating_mul(settings.quorum_basis_points as u32);
    let denominator = 10_000u32;
    (numerator + denominator - 1) / denominator
}

fn compute_vote_power(profile: &UserProfile, proposal_region: &str) -> f64 {
    let reputation = profile.reputation.max(1.0);
    let accuracy_ratio = if profile.concluded_votes == 0 {
        0.5
    } else {
        profile.accurate_votes as f64 / profile.concluded_votes as f64
    };
    let stability_score = (0.5 + (profile.activity_count as f64 / 20.0)).min(1.2);
    let base_weight = (reputation + 1.0).log2().min(10.0);
    let locality_mult = if profile.is_local_verified
        && profile.home_region.as_deref() == Some(proposal_region)
    {
        1.15
    } else {
        1.0
    };
    let expertise_mult = if profile.has_expert_standing { 1.10 } else { 1.0 };
    let accuracy_modifier = 0.75 + (accuracy_ratio * 0.5);

    (base_weight * locality_mult * expertise_mult * accuracy_modifier * stability_score)
        .clamp(0.1, 10.0)
}

fn is_majority_passed(yes_weight: f64, total_weight: f64) -> bool {
    if total_weight <= 0.0 {
        return false;
    }

    let settings = get_settings();
    yes_weight / total_weight > settings.approval_basis_points as f64 / 10_000.0
}

fn has_held_escrow(proposal: &Proposal) -> bool {
    matches!(
        proposal.escrow.as_ref().map(|escrow| &escrow.state),
        Some(EscrowState::Held)
    )
}

fn build_escrow_account_view(proposal: &Proposal) -> ApiResult<EscrowAccountView> {
    let settings = get_settings();
    let escrow_account = escrow_account_for_proposal(proposal.id);
    let suggested_deposit_e8s = proposal
        .requested_funding_e8s
        .checked_add(DEFAULT_LEDGER_TRANSFER_FEE_E8S)
        .ok_or_else(|| "Escrow deposit amount overflowed".to_string())?;

    Ok(EscrowAccountView {
        proposal_id: proposal.id,
        ledger_canister_id: settings.ledger_canister_id,
        account_owner: escrow_account.owner,
        subaccount_hex: hex::encode(escrow_subaccount_for_proposal(proposal.id)),
        account_id_hex: ledger_account_identifier_hex(&escrow_account),
        requested_amount_e8s: proposal.requested_funding_e8s,
        suggested_transfer_fee_e8s: DEFAULT_LEDGER_TRANSFER_FEE_E8S,
        suggested_deposit_e8s,
    })
}

fn build_vote_key(proposal_id: u64, principal: &Principal) -> String {
    format!("{proposal_id}:{}", principal.to_text())
}

fn escrow_subaccount_for_proposal(proposal_id: u64) -> Subaccount {
    let mut subaccount = vec![0u8; 32];
    subaccount[..ESCROW_SUBACCOUNT_PREFIX.len()].copy_from_slice(ESCROW_SUBACCOUNT_PREFIX);
    subaccount[24..32].copy_from_slice(&proposal_id.to_be_bytes());
    subaccount
}

fn escrow_account_for_proposal(proposal_id: u64) -> LedgerAccount {
    LedgerAccount {
        owner: canister_self(),
        subaccount: Some(escrow_subaccount_for_proposal(proposal_id)),
    }
}

fn ledger_account_identifier_hex(account: &LedgerAccount) -> String {
    let mut state = Sha224::new();
    state.update([0x0A]);
    state.update(b"account-id");
    state.update(account.owner.as_slice());
    state.update(
        account
            .subaccount
            .as_deref()
            .unwrap_or(&[0u8; 32]),
    );

    let hash = state.finalize();
    let mut checksum = Crc32Hasher::new();
    checksum.update(&hash);

    let mut account_id = Vec::with_capacity(32);
    account_id.extend_from_slice(&checksum.finalize().to_be_bytes());
    account_id.extend_from_slice(&hash);
    hex::encode(account_id)
}

fn nat_to_u64(value: &Nat, field_name: &str) -> ApiResult<u64> {
    u64::try_from(value.0.clone()).map_err(|_| format!("{field_name} exceeded u64 range"))
}

async fn fetch_ledger_fee_e8s() -> ApiResult<u64> {
    let ledger_canister_id = get_settings().ledger_canister_id;
    let (fee,): (Nat,) = Call::unbounded_wait(ledger_canister_id, "icrc1_fee")
        .await
        .map_err(|error| format!("Failed to fetch ledger fee: {error:?}"))?
        .candid_tuple()
        .map_err(|error| format!("Failed to decode ledger fee response: {error:?}"))?;

    nat_to_u64(&fee, "ledger fee")
}

async fn transfer_from_investor_to_escrow(
    funder: Principal,
    proposal_id: u64,
    amount_e8s: u64,
    fee_e8s: u64,
) -> ApiResult<u64> {
    let ledger_canister_id = get_settings().ledger_canister_id;
    let transfer = LedgerTransferFromArg {
        spender_subaccount: None,
        from: LedgerAccount {
            owner: funder,
            subaccount: None,
        },
        to: escrow_account_for_proposal(proposal_id),
        amount: Nat::from(amount_e8s),
        fee: Some(Nat::from(fee_e8s)),
        memo: None,
        created_at_time: Some(now()),
    };
    let (result,): (LedgerTransferFromResult,) = Call::unbounded_wait(
        ledger_canister_id,
        "icrc2_transfer_from",
    )
    .with_arg(transfer)
    .await
    .map_err(|error| format!("Failed to move approved ICP into escrow: {error:?}"))?
    .candid_tuple()
    .map_err(|error| format!("Failed to decode escrow funding response: {error:?}"))?;

    match result {
        LedgerTransferFromResult::Ok(block_index) => nat_to_u64(&block_index, "block_index"),
        LedgerTransferFromResult::Err(error) => {
            Err(format!("Approved escrow funding failed: {error:?}"))
        }
    }
}

async fn transfer_from_escrow_subaccount(
    proposal_id: u64,
    destination: LedgerAccount,
    amount_e8s: u64,
    fee_e8s: u64,
) -> ApiResult<u64> {
    let ledger_canister_id = get_settings().ledger_canister_id;
    let transfer = LedgerTransferArg {
        from_subaccount: Some(escrow_subaccount_for_proposal(proposal_id)),
        to: destination,
        amount: Nat::from(amount_e8s),
        fee: Some(Nat::from(fee_e8s)),
        memo: None,
        created_at_time: Some(now()),
    };
    let (result,): (LedgerTransferResult,) = Call::unbounded_wait(
        ledger_canister_id,
        "icrc1_transfer",
    )
    .with_arg(transfer)
    .await
    .map_err(|error| format!("Failed to submit ledger transfer: {error:?}"))?
    .candid_tuple()
    .map_err(|error| format!("Failed to decode ledger transfer response: {error:?}"))?;

    match result {
        LedgerTransferResult::Ok(block_index) => nat_to_u64(&block_index, "block_index"),
        LedgerTransferResult::Err(error) => Err(format!("Ledger transfer failed: {error:?}")),
    }
}

fn normalize_text(value: String, field_name: &str) -> ApiResult<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{field_name} cannot be empty"));
    }

    Ok(trimmed.to_string())
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn now() -> u64 {
    time()
}

candid::export_service!();

#[cfg(test)]
mod tests {
    use super::{compute_vote_power, is_majority_passed, UserProfile, UserType};

    #[test]
    fn vote_power_increases_with_reputation() {
        let low = UserProfile {
            user_type: UserType::Community,
            reputation: 1.0,
            home_region: Some("sofia".to_string()),
            last_activity_ts: 0,
            activity_count: 4,
            vote_count: 1,
            is_local_verified: true,
            has_expert_standing: false,
            concluded_votes: 2,
            accurate_votes: 1,
        };
        let mut high = low.clone();
        high.reputation = 16.0;

        assert!(compute_vote_power(&high, "sofia") > compute_vote_power(&low, "sofia"));
    }

    #[test]
    fn majority_rule_requires_strictly_more_than_fifty_one_percent() {
        assert!(is_majority_passed(52.0, 100.0));
        assert!(!is_majority_passed(51.0, 100.0));
        assert!(!is_majority_passed(0.0, 0.0));
    }
}
