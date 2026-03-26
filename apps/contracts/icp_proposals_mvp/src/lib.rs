use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk::{init, post_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::storable::Bound;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::Deserialize;
use std::borrow::Cow;
use std::cell::RefCell;
use std::cmp::Ordering;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// =========================================================================
// Constants
// =========================================================================

const VOTING_PERIOD_NS: u64 = 10 * 60 * 1_000_000_000; // 10 min (prod: 7 days)
const ACTIVE_USER_WINDOW_NS: u64 = 90 * 24 * 60 * 60 * 1_000_000_000;
const QUORUM_PERCENT: f64 = 0.05;
const QUORUM_MIN_REGION_SIZE: u32 = 20;
const MAJORITY_THRESHOLD: f64 = 0.51;
const ABSOLUTE_MAJORITY: f64 = 0.50; // >50% of ALL possible VP = early resolution

// =========================================================================
// User types
// =========================================================================

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub enum UserType {
    User,
    InvestorUser,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct UserProfile {
    pub display_name: String,
    pub user_type: UserType,
    pub reputation: f64,
    pub home_region: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
    pub last_activity_ts: u64,
    pub activity_count: u32,
    pub vote_count: u32,
    pub is_local_verified: bool,
    pub has_expert_standing: bool,
    pub concluded_votes: u32,
    pub accurate_votes: u32,
    pub is_verified: Option<bool>, // opt for backward compat with pre-existing profiles
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct CreateProfileInput {
    pub display_name: String,
    pub user_type: UserType,
    pub home_region: Option<String>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct UpdateProfileInput {
    pub display_name: String,
    pub home_region: Option<String>,
}

// =========================================================================
// Proposal types
// =========================================================================

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub enum ProposalStatus {
    Active,
    QuorumNotMet,
    Rejected,
    AwaitingFunding,
    Backed,
}

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub enum ProposalCategory {
    Infrastructure,
    Marketing,
    Events,
    Conservation,
    Education,
    Technology,
    Other,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Proposal {
    pub id: u64,
    pub submitter: Principal,
    pub region_tag: String,
    pub title: String,
    pub description: String,
    // New fields are opt so old proposals (pre-upgrade) still decode
    pub category: Option<ProposalCategory>,
    pub budget_amount: Option<f64>,
    pub budget_currency: Option<String>,
    pub budget_breakdown: Option<String>,
    pub executor_name: Option<String>,
    pub execution_plan: Option<String>,
    pub timeline: Option<String>,
    pub expected_impact: Option<String>,
    pub fairness_score: Option<f64>,
    pub risk_flags: Vec<String>,
    pub backed_by: Option<Principal>,
    pub backed_at: Option<u64>,
    pub status: ProposalStatus,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub yes_weight: f64,
    pub no_weight: f64,
    pub voter_count: u32,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct SubmitProposalInput {
    pub title: String,
    pub description: String,
    pub region_tag: String,
    pub category: ProposalCategory,
    pub budget_amount: f64,
    pub budget_currency: String,
    pub budget_breakdown: String,
    pub executor_name: String,
    pub execution_plan: String,
    pub timeline: String,
    pub expected_impact: String,
}

// =========================================================================
// Vote types
// =========================================================================

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Vote {
    pub voter: Principal,
    pub proposal_id: u64,
    pub in_favor: bool,
    pub weight: f64,
    pub timestamp: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct VoteKey {
    proposal_id: u64,
    voter: Principal,
}

impl Ord for VoteKey {
    fn cmp(&self, other: &Self) -> Ordering {
        self.proposal_id
            .cmp(&other.proposal_id)
            .then_with(|| self.voter.as_slice().cmp(other.voter.as_slice()))
    }
}
impl PartialOrd for VoteKey {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

// =========================================================================
// Audit types
// =========================================================================

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub enum AuditEventType {
    UserRegistered,
    InvestorVerified,
    ProposalSubmitted,
    VoteCast,
    ProposalFinalized,
    ProposalBacked,
    ReputationAwarded,
    ReputationPenalized,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct AuditEvent {
    pub id: u64,
    pub timestamp: u64,
    pub actor: Principal,
    pub event_type: AuditEventType,
    pub proposal_id: Option<u64>,
    pub payload: String,
}

// =========================================================================
// Config
// =========================================================================

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Config {
    pub voting_period_ns: u64,
    pub quorum_percent: f64,
    pub quorum_min_region_size: u32,
    pub majority_threshold: f64,
    pub absolute_majority: f64,
}

// =========================================================================
// Storable wrappers
// =========================================================================

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    const BOUND: Bound = Bound::Bounded { max_size: 29, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<'_, [u8]> { Cow::Owned(self.0.as_slice().to_vec()) }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self { Self(Principal::from_slice(bytes.as_ref())) }
}

impl Storable for UserProfile {
    const BOUND: Bound = Bound::Bounded { max_size: 512, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<'_, [u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
}

impl Storable for Proposal {
    const BOUND: Bound = Bound::Bounded { max_size: 8192, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<'_, [u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
}

impl Storable for Vote {
    const BOUND: Bound = Bound::Bounded { max_size: 128, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<'_, [u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
}

impl Storable for VoteKey {
    const BOUND: Bound = Bound::Bounded { max_size: 38, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        let pb = self.voter.as_slice();
        let mut buf = Vec::with_capacity(9 + pb.len());
        buf.extend_from_slice(&self.proposal_id.to_be_bytes());
        buf.push(pb.len() as u8);
        buf.extend_from_slice(pb);
        Cow::Owned(buf)
    }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        let proposal_id = u64::from_be_bytes(bytes[..8].try_into().unwrap());
        let plen = bytes[8] as usize;
        let voter = Principal::from_slice(&bytes[9..9 + plen]);
        Self { proposal_id, voter }
    }
}

impl Storable for AuditEvent {
    const BOUND: Bound = Bound::Bounded { max_size: 2048, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<'_, [u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
}

// =========================================================================
// Stable memory
// =========================================================================

const USERS_MEM_ID: MemoryId = MemoryId::new(0);
const PROPOSALS_MEM_ID: MemoryId = MemoryId::new(1);
const VOTES_MEM_ID: MemoryId = MemoryId::new(2);
const AUDIT_MEM_ID: MemoryId = MemoryId::new(3);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USERS: RefCell<StableBTreeMap<StorablePrincipal, UserProfile, Memory>> =
        RefCell::new(StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(USERS_MEM_ID))));
    static PROPOSALS: RefCell<StableBTreeMap<u64, Proposal, Memory>> =
        RefCell::new(StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(PROPOSALS_MEM_ID))));
    static VOTES: RefCell<StableBTreeMap<VoteKey, Vote, Memory>> =
        RefCell::new(StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(VOTES_MEM_ID))));
    static AUDIT_LOG: RefCell<StableBTreeMap<u64, AuditEvent, Memory>> =
        RefCell::new(StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(AUDIT_MEM_ID))));

    static NEXT_PROPOSAL_ID: RefCell<u64> = RefCell::new(1);
    static NEXT_EVENT_ID: RefCell<u64> = RefCell::new(1);
}

// =========================================================================
// Lifecycle
// =========================================================================

#[init]
fn init() {}

#[post_upgrade]
fn post_upgrade() {
    let next_p = PROPOSALS.with(|p| p.borrow().len() + 1);
    NEXT_PROPOSAL_ID.with(|c| *c.borrow_mut() = next_p);
    let next_e = AUDIT_LOG.with(|a| a.borrow().len() + 1);
    NEXT_EVENT_ID.with(|c| *c.borrow_mut() = next_e);
}

// =========================================================================
// Helpers — auth & validation
// =========================================================================

fn require_auth() -> Result<Principal, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Sign in with Internet Identity first".into());
    }
    Ok(caller)
}

fn norm_required(value: &str, name: &str) -> Result<String, String> {
    let s = value.trim().to_string();
    if s.is_empty() { return Err(format!("{name} must not be empty")); }
    if s.chars().count() > 1000 { return Err(format!("{name} must be 1000 characters or fewer")); }
    Ok(s)
}

fn norm_opt(value: Option<String>) -> Option<String> {
    value.and_then(|r| { let s = r.trim().to_string(); if s.is_empty() { None } else { Some(s) } })
}

fn validate_profile(
    display_name: &str, user_type: &UserType, home_region: Option<String>,
) -> Result<(String, Option<String>), String> {
    let dn = norm_required(display_name, "display_name")?;
    let hr = norm_opt(home_region);
    match user_type {
        UserType::User => match hr {
            Some(r) => Ok((dn, Some(r))),
            None => Err("Community users must provide a home_region".into()),
        },
        UserType::InvestorUser => {
            if hr.is_some() { return Err("Investor users must not set a home_region".into()); }
            Ok((dn, None))
        }
    }
}

// =========================================================================
// Helpers — counters
// =========================================================================

fn alloc_proposal_id() -> u64 {
    NEXT_PROPOSAL_ID.with(|c| { let id = *c.borrow(); *c.borrow_mut() = id + 1; id })
}
fn alloc_event_id() -> u64 {
    NEXT_EVENT_ID.with(|c| { let id = *c.borrow(); *c.borrow_mut() = id + 1; id })
}

// =========================================================================
// Helpers — reputation & Vp
// =========================================================================

fn modify_user<F: FnOnce(&mut UserProfile)>(key: &StorablePrincipal, f: F) {
    USERS.with(|u| {
        let mut users = u.borrow_mut();
        if let Some(mut p) = users.get(key) { f(&mut p); users.insert(key.clone(), p); }
    });
}

fn award_rep(principal: Principal, delta: f64) {
    modify_user(&StorablePrincipal(principal), |p| {
        p.reputation = (p.reputation + delta).max(1.0);
        p.last_activity_ts = ic_cdk::api::time();
        p.activity_count += 1;
    });
}

fn penalize_rep(principal: Principal, delta: f64) {
    modify_user(&StorablePrincipal(principal), |p| {
        p.reputation = (p.reputation - delta).max(1.0);
    });
}

fn touch_activity(principal: Principal) {
    modify_user(&StorablePrincipal(principal), |p| {
        p.last_activity_ts = ic_cdk::api::time();
        p.activity_count += 1;
    });
}

fn compute_vp(profile: &UserProfile, proposal_region: &str) -> f64 {
    let base_weight = (profile.reputation + 1.0_f64).log2().min(10.0);
    let locality = if profile.is_local_verified
        && profile.home_region.as_deref() == Some(proposal_region) { 1.5 } else { 1.0 };
    let expertise = if profile.has_expert_standing { 1.3 } else { 1.0 };
    let accuracy_ratio = if profile.concluded_votes == 0 { 0.5 }
        else { profile.accurate_votes as f64 / profile.concluded_votes as f64 };
    let accuracy = 0.7 + (accuracy_ratio * 0.6);
    let stability = (0.5 + (profile.activity_count as f64 / 20.0)).min(1.2);
    (base_weight * locality * expertise * accuracy * stability).min(10.0)
}

// =========================================================================
// Helpers — audit
// =========================================================================

fn append_audit(actor: Principal, event_type: AuditEventType, proposal_id: Option<u64>, payload: String) {
    let id = alloc_event_id();
    AUDIT_LOG.with(|a| a.borrow_mut().insert(id, AuditEvent {
        id, timestamp: ic_cdk::api::time(), actor, event_type, proposal_id, payload,
    }));
}

// =========================================================================
// Helpers — regional VP
// =========================================================================

fn count_active_regional_users(region: &str, now: u64) -> u32 {
    USERS.with(|u| {
        u.borrow().iter().filter(|(_, p)| {
            p.user_type == UserType::User
                && p.home_region.as_deref() == Some(region)
                && now.saturating_sub(p.last_activity_ts) <= ACTIVE_USER_WINDOW_NS
        }).count() as u32
    })
}

/// Sum of compute_vp for every active community user in a region.
/// This is the denominator for the absolute-majority early resolution.
fn total_regional_vp(region: &str, now: u64) -> f64 {
    USERS.with(|u| {
        u.borrow().iter()
            .filter(|(_, p)| {
                p.user_type == UserType::User
                    && p.home_region.as_deref() == Some(region)
                    && now.saturating_sub(p.last_activity_ts) <= ACTIVE_USER_WINDOW_NS
            })
            .map(|(_, p)| compute_vp(&p, region))
            .sum()
    })
}

// =========================================================================
// User endpoints
// =========================================================================

#[update]
fn create_my_profile(input: CreateProfileInput) -> Result<UserProfile, String> {
    let caller = require_auth()?;
    let (display_name, home_region) =
        validate_profile(&input.display_name, &input.user_type, input.home_region)?;
    let now = ic_cdk::api::time();

    let profile = USERS.with(|u| -> Result<UserProfile, String> {
        let mut users = u.borrow_mut();
        let key = StorablePrincipal(caller);
        if users.contains_key(&key) { return Err("Profile already exists".into()); }
        let profile = UserProfile {
            display_name, user_type: input.user_type, reputation: 1.0, home_region,
            created_at: now, updated_at: now, last_activity_ts: now,
            activity_count: 0, vote_count: 0,
            is_local_verified: false, has_expert_standing: false,
            concluded_votes: 0, accurate_votes: 0,
            is_verified: Some(false),
        };
        users.insert(key, profile.clone());
        Ok(profile)
    })?;

    append_audit(caller, AuditEventType::UserRegistered, None,
        format!("Registered as {:?}", profile.user_type));
    Ok(profile)
}

#[update]
fn update_my_profile(input: UpdateProfileInput) -> Result<UserProfile, String> {
    let caller = require_auth()?;
    USERS.with(|u| {
        let mut users = u.borrow_mut();
        let key = StorablePrincipal(caller);
        let Some(mut existing) = users.get(&key) else { return Err("Profile not found".into()); };
        let (display_name, home_region) =
            validate_profile(&input.display_name, &existing.user_type, input.home_region)?;
        existing.display_name = display_name;
        existing.home_region = home_region;
        existing.updated_at = ic_cdk::api::time();
        existing.last_activity_ts = existing.updated_at;
        users.insert(key, existing.clone());
        Ok(existing)
    })
}

#[query]
fn get_user(principal: Principal) -> Option<UserProfile> {
    USERS.with(|u| u.borrow().get(&StorablePrincipal(principal)))
}

#[query]
fn get_my_profile() -> Option<UserProfile> {
    USERS.with(|u| u.borrow().get(&StorablePrincipal(ic_cdk::caller())))
}

#[query]
fn whoami() -> Principal { ic_cdk::caller() }

// =========================================================================
// Investor verification (stub — auto-approves, replace with real KYC later)
// =========================================================================

#[update]
fn request_verification() -> Result<(), String> {
    let caller = require_auth()?;
    let profile = USERS.with(|u| u.borrow().get(&StorablePrincipal(caller)))
        .ok_or("Register first")?;
    if profile.user_type != UserType::InvestorUser {
        return Err("Only investor users need verification".into());
    }
    if profile.is_verified.unwrap_or(false) {
        return Err("Already verified".into());
    }
    modify_user(&StorablePrincipal(caller), |p| p.is_verified = Some(true));

    append_audit(caller, AuditEventType::InvestorVerified, None,
        "Investor verification approved (stub)".into());
    Ok(())
}

#[update]
fn admin_verify_investor(target: Principal) -> Result<(), String> {
    let caller = require_auth()?;
    if !ic_cdk::api::is_controller(&caller) {
        return Err("Only canister controllers can verify investors".into());
    }
    let profile = USERS.with(|u| u.borrow().get(&StorablePrincipal(target)))
        .ok_or("Target user not found")?;
    if profile.user_type != UserType::InvestorUser {
        return Err("Target is not an investor".into());
    }
    modify_user(&StorablePrincipal(target), |p| p.is_verified = Some(true));
    append_audit(caller, AuditEventType::InvestorVerified, None,
        format!("Admin verified investor {}", target));
    Ok(())
}

// =========================================================================
// Proposal endpoints
// =========================================================================

#[update]
fn submit_proposal(input: SubmitProposalInput) -> Result<Proposal, String> {
    let caller = require_auth()?;
    let now = ic_cdk::api::time();

    let profile = USERS.with(|u| u.borrow().get(&StorablePrincipal(caller)))
        .ok_or("Register before submitting proposals")?;
    if profile.user_type != UserType::User {
        return Err("Only community users can submit proposals".into());
    }

    let title = norm_required(&input.title, "title")?;
    let description = norm_required(&input.description, "description")?;
    let region_tag = norm_required(&input.region_tag, "region_tag")?;
    let budget_breakdown = norm_required(&input.budget_breakdown, "budget_breakdown")?;
    let executor_name = norm_required(&input.executor_name, "executor_name")?;
    let execution_plan = norm_required(&input.execution_plan, "execution_plan")?;
    let timeline = norm_required(&input.timeline, "timeline")?;
    let expected_impact = norm_required(&input.expected_impact, "expected_impact")?;
    let budget_currency = norm_required(&input.budget_currency, "budget_currency")?;
    if input.budget_amount <= 0.0 {
        return Err("budget_amount must be positive".into());
    }

    let id = alloc_proposal_id();
    let proposal = Proposal {
        id, submitter: caller, region_tag, title, description,
        category: Some(input.category),
        budget_amount: Some(input.budget_amount),
        budget_currency: Some(budget_currency),
        budget_breakdown: Some(budget_breakdown),
        executor_name: Some(executor_name),
        execution_plan: Some(execution_plan),
        timeline: Some(timeline),
        expected_impact: Some(expected_impact),
        fairness_score: None, risk_flags: vec![],
        backed_by: None, backed_at: None,
        status: ProposalStatus::Active, created_at: now, voting_ends_at: now + VOTING_PERIOD_NS,
        yes_weight: 0.0, no_weight: 0.0, voter_count: 0,
    };
    PROPOSALS.with(|p| p.borrow_mut().insert(id, proposal.clone()));

    touch_activity(caller);
    append_audit(caller, AuditEventType::ProposalSubmitted, Some(id),
        format!("\"{}\" — {} {} for {}",
            proposal.title,
            proposal.budget_amount.unwrap_or(0.0),
            proposal.budget_currency.as_deref().unwrap_or("?"),
            proposal.region_tag));
    Ok(proposal)
}

#[query]
fn get_proposal(id: u64) -> Option<Proposal> {
    PROPOSALS.with(|p| p.borrow().get(&id))
}

#[query]
fn list_proposals(status_filter: Option<ProposalStatus>) -> Vec<Proposal> {
    PROPOSALS.with(|p| {
        p.borrow().iter().map(|(_, v)| v)
            .filter(|prop| match &status_filter { Some(s) => prop.status == *s, None => true })
            .collect()
    })
}

// =========================================================================
// Voting
// =========================================================================

#[update]
fn cast_vote(proposal_id: u64, in_favor: bool) -> Result<Vote, String> {
    let caller = require_auth()?;
    let now = ic_cdk::api::time();

    let profile = USERS.with(|u| u.borrow().get(&StorablePrincipal(caller)))
        .ok_or("Register before voting")?;
    if profile.user_type != UserType::User {
        return Err("Only community users can vote".into());
    }

    let proposal = PROPOSALS.with(|p| p.borrow().get(&proposal_id))
        .ok_or("Proposal not found")?;
    if proposal.status != ProposalStatus::Active {
        return Err("Proposal is not active".into());
    }
    if now >= proposal.voting_ends_at {
        return Err("Voting period has ended — call finalize_proposal".into());
    }

    let key = VoteKey { proposal_id, voter: caller };
    if VOTES.with(|v| v.borrow().contains_key(&key)) {
        return Err("Already voted on this proposal".into());
    }

    let vp = compute_vp(&profile, &proposal.region_tag);
    let vote = Vote { voter: caller, proposal_id, in_favor, weight: vp, timestamp: now };

    VOTES.with(|v| v.borrow_mut().insert(key, vote.clone()));
    PROPOSALS.with(|p| {
        let mut proposals = p.borrow_mut();
        if let Some(mut prop) = proposals.get(&proposal_id) {
            if in_favor { prop.yes_weight += vp; } else { prop.no_weight += vp; }
            prop.voter_count += 1;
            proposals.insert(proposal_id, prop);
        }
    });

    award_rep(caller, 2.0);
    modify_user(&StorablePrincipal(caller), |p| p.vote_count += 1);
    append_audit(caller, AuditEventType::VoteCast, Some(proposal_id),
        format!("{} with Vp {:.2}", if in_favor { "yes" } else { "no" }, vp));
    Ok(vote)
}

#[query]
fn get_proposal_votes(proposal_id: u64) -> Vec<Vote> {
    VOTES.with(|v| {
        v.borrow().iter()
            .filter(|(k, _)| k.proposal_id == proposal_id)
            .map(|(_, vote)| vote).collect()
    })
}

// =========================================================================
// Finalization — early absolute-majority OR deadline 5/51 rule
// =========================================================================

#[update]
fn finalize_proposal(proposal_id: u64) -> Result<Proposal, String> {
    let caller = require_auth()?;
    let now = ic_cdk::api::time();

    let proposal = PROPOSALS.with(|p| p.borrow().get(&proposal_id))
        .ok_or("Proposal not found")?;
    if proposal.status != ProposalStatus::Active {
        return Err(format!("Proposal is {:?}, not Active", proposal.status));
    }

    let total_vp = total_regional_vp(&proposal.region_tag, now);
    let deadline_passed = now >= proposal.voting_ends_at;

    // Path 1: Early resolution — >50% of ALL possible VP voted one way
    let early_approve = total_vp > 0.0 && proposal.yes_weight > total_vp * ABSOLUTE_MAJORITY;
    let early_reject = total_vp > 0.0 && proposal.no_weight > total_vp * ABSOLUTE_MAJORITY;

    if !deadline_passed && !early_approve && !early_reject {
        return Err("Voting still in progress — no absolute majority reached yet".into());
    }

    let mut updated = proposal.clone();

    if early_approve {
        updated.status = ProposalStatus::AwaitingFunding;
        award_rep(proposal.submitter, 15.0);
        append_audit(caller, AuditEventType::ReputationAwarded, Some(proposal_id),
            format!("+15 rep to submitter {} (early approval)", proposal.submitter));
    } else if early_reject {
        updated.status = ProposalStatus::Rejected;
        penalize_rep(proposal.submitter, 10.0);
        append_audit(caller, AuditEventType::ReputationPenalized, Some(proposal_id),
            format!("-10 rep to submitter {} (early rejection)", proposal.submitter));
    } else {
        // Path 2: Deadline passed — normal 5/51 rule
        let active_regional = count_active_regional_users(&proposal.region_tag, now);
        let threshold = if active_regional < QUORUM_MIN_REGION_SIZE { 1_u32 }
            else { (active_regional as f64 * QUORUM_PERCENT).ceil() as u32 };

        if updated.voter_count < threshold {
            updated.status = ProposalStatus::QuorumNotMet;
        } else {
            let total = updated.yes_weight + updated.no_weight;
            if total > 0.0 && (updated.yes_weight / total) > MAJORITY_THRESHOLD {
                updated.status = ProposalStatus::AwaitingFunding;
                award_rep(proposal.submitter, 15.0);
                append_audit(caller, AuditEventType::ReputationAwarded, Some(proposal_id),
                    format!("+15 rep to submitter {}", proposal.submitter));
            } else {
                updated.status = ProposalStatus::Rejected;
                penalize_rep(proposal.submitter, 10.0);
                append_audit(caller, AuditEventType::ReputationPenalized, Some(proposal_id),
                    format!("-10 rep to submitter {}", proposal.submitter));
            }
        }
    }

    PROPOSALS.with(|p| p.borrow_mut().insert(proposal_id, updated.clone()));
    append_audit(caller, AuditEventType::ProposalFinalized, Some(proposal_id),
        format!("{:?} — yes {:.2} / no {:.2} (total possible {:.2}), {} voters",
            updated.status, updated.yes_weight, updated.no_weight, total_vp, updated.voter_count));
    Ok(updated)
}

// =========================================================================
// Investor backing — the Sign rule
// =========================================================================

#[update]
fn back_proposal(proposal_id: u64) -> Result<Proposal, String> {
    let caller = require_auth()?;
    let now = ic_cdk::api::time();

    let profile = USERS.with(|u| u.borrow().get(&StorablePrincipal(caller)))
        .ok_or("Register before backing proposals")?;
    if profile.user_type != UserType::InvestorUser {
        return Err("Only investor users can back proposals".into());
    }
    if !profile.is_verified.unwrap_or(false) {
        return Err("Complete investor verification before backing proposals".into());
    }

    let mut proposal = PROPOSALS.with(|p| p.borrow().get(&proposal_id))
        .ok_or("Proposal not found")?;
    if proposal.status != ProposalStatus::AwaitingFunding {
        return Err(format!("Proposal is {:?}, not AwaitingFunding", proposal.status));
    }

    proposal.status = ProposalStatus::Backed;
    proposal.backed_by = Some(caller);
    proposal.backed_at = Some(now);

    PROPOSALS.with(|p| p.borrow_mut().insert(proposal_id, proposal.clone()));
    append_audit(caller, AuditEventType::ProposalBacked, Some(proposal_id),
        format!("Backed by verified investor {}", caller));
    Ok(proposal)
}

// =========================================================================
// Query endpoints
// =========================================================================

#[query]
fn get_audit_log(limit: u32, offset: u32) -> Vec<AuditEvent> {
    AUDIT_LOG.with(|a| {
        a.borrow().iter().rev().skip(offset as usize).take(limit as usize).map(|(_, e)| e).collect()
    })
}

#[query]
fn get_my_vp(region_tag: String) -> Result<f64, String> {
    let caller = ic_cdk::caller();
    let profile = USERS.with(|u| u.borrow().get(&StorablePrincipal(caller))).ok_or("Not registered")?;
    if profile.user_type != UserType::User {
        return Err("VP is only computed for community users".into());
    }
    Ok(compute_vp(&profile, &region_tag))
}

#[query]
fn get_region_total_vp(region_tag: String) -> f64 {
    total_regional_vp(&region_tag, ic_cdk::api::time())
}

#[query]
fn get_config() -> Config {
    Config {
        voting_period_ns: VOTING_PERIOD_NS,
        quorum_percent: QUORUM_PERCENT,
        quorum_min_region_size: QUORUM_MIN_REGION_SIZE,
        majority_threshold: MAJORITY_THRESHOLD,
        absolute_majority: ABSOLUTE_MAJORITY,
    }
}

// =========================================================================
// Candid export
// =========================================================================

ic_cdk::export_candid!();
