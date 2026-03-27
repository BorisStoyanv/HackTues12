export const idlFactory = ({ IDL }) => {
  const UserType = IDL.Variant({
    Community: IDL.Null,
    Investor: IDL.Null,
  });

  const UserProfile = IDL.Record({
    user_type: UserType,
    reputation: IDL.Float64,
    home_region: IDL.Opt(IDL.Text),
    last_activity_ts: IDL.Nat64,
    activity_count: IDL.Nat32,
    vote_count: IDL.Nat32,
    is_local_verified: IDL.Bool,
    has_expert_standing: IDL.Bool,
    concluded_votes: IDL.Nat32,
    accurate_votes: IDL.Nat32,
  });

  const ProposalKind = IDL.Variant({
    OpenFunding: IDL.Null,
    ProgramAllocation: IDL.Null,
  });

  const ProposalStatus = IDL.Variant({
    Active: IDL.Null,
    QuorumNotMet: IDL.Null,
    Rejected: IDL.Null,
    AwaitingFunding: IDL.Null,
    Backed: IDL.Null,
  });

  const EscrowState = IDL.Variant({
    Held: IDL.Null,
    Released: IDL.Null,
    Refunded: IDL.Null,
  });

  const EscrowAgreement = IDL.Record({
    funder: IDL.Principal,
    beneficiary: IDL.Principal,
    amount_e8s: IDL.Nat64,
    transfer_fee_e8s: IDL.Nat64,
    escrow_subaccount_hex: IDL.Text,
    deposit_block_index: IDL.Nat64,
    state: EscrowState,
    deposit_reference: IDL.Opt(IDL.Text),
    release_reference: IDL.Opt(IDL.Text),
    refund_reference: IDL.Opt(IDL.Text),
    deposited_at: IDL.Nat64,
    released_at: IDL.Opt(IDL.Nat64),
    refunded_at: IDL.Opt(IDL.Nat64),
    release_block_index: IDL.Opt(IDL.Nat64),
    refund_block_index: IDL.Opt(IDL.Nat64),
  });

  const EscrowAccountView = IDL.Record({
    proposal_id: IDL.Nat64,
    ledger_canister_id: IDL.Principal,
    account_owner: IDL.Principal,
    subaccount_hex: IDL.Text,
    account_id_hex: IDL.Text,
    requested_amount_e8s: IDL.Nat64,
    suggested_transfer_fee_e8s: IDL.Nat64,
    suggested_deposit_e8s: IDL.Nat64,
  });

  const Proposal = IDL.Record({
    id: IDL.Nat64,
    kind: ProposalKind,
    submitter: IDL.Principal,
    beneficiary: IDL.Principal,
    region_tag: IDL.Text,
    title: IDL.Text,
    description: IDL.Text,
    budget_description: IDL.Text,
    requested_funding_e8s: IDL.Nat64,
    fairness_score: IDL.Opt(IDL.Float64),
    risk_flags: IDL.Vec(IDL.Text),
    funding_program_id: IDL.Opt(IDL.Nat64),
    backed_by: IDL.Opt(IDL.Principal),
    backed_at: IDL.Opt(IDL.Nat64),
    status: ProposalStatus,
    created_at: IDL.Nat64,
    voting_ends_at: IDL.Nat64,
    yes_weight: IDL.Float64,
    no_weight: IDL.Float64,
    voter_count: IDL.Nat32,
    escrow: IDL.Opt(EscrowAgreement),
  });

  const Vote = IDL.Record({
    proposal_id: IDL.Nat64,
    voter: IDL.Principal,
    in_favor: IDL.Bool,
    weight: IDL.Float64,
    timestamp: IDL.Nat64,
  });

  const AuditEventType = IDL.Variant({
    UserRegistered: IDL.Null,
    AttributeVerified: IDL.Null,
    ProposalSubmitted: IDL.Null,
    AiScoreIngested: IDL.Null,
    VoteCast: IDL.Null,
    ProposalFinalized: IDL.Null,
    ProposalBacked: IDL.Null,
    EscrowReleased: IDL.Null,
    EscrowRefunded: IDL.Null,
    ReputationAwarded: IDL.Null,
    ReputationPenalized: IDL.Null,
  });

  const AuditEvent = IDL.Record({
    id: IDL.Nat64,
    timestamp: IDL.Nat64,
    actor: IDL.Principal,
    event_type: AuditEventType,
    proposal_id: IDL.Opt(IDL.Nat64),
    payload: IDL.Text,
  });

  const CanisterSettings = IDL.Record({
    controller: IDL.Principal,
    ledger_canister_id: IDL.Principal,
    quorum_basis_points: IDL.Nat16,
    approval_basis_points: IDL.Nat16,
    active_window_ns: IDL.Nat64,
    voting_window_ns: IDL.Nat64,
    small_region_cutoff: IDL.Nat32,
    small_region_min_votes: IDL.Nat32,
  });

  const ResultEscrowAccountView = IDL.Variant({
    Ok: EscrowAccountView,
    Err: IDL.Text,
  });

  return IDL.Service({
    get_my_profile: IDL.Func([], [IDL.Opt(UserProfile)], ["query"]),
    get_proposal_escrow_account: IDL.Func([IDL.Nat64], [ResultEscrowAccountView], ["query"]),
    get_proposal_view: IDL.Func([IDL.Nat64], [IDL.Opt(Proposal)], ["query"]),
    get_quorum_snapshot: IDL.Func([IDL.Text], [IDL.Nat32], ["query"]),
    get_settings_view: IDL.Func([], [CanisterSettings], ["query"]),
    get_user: IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ["query"]),
    list_audit_events: IDL.Func([IDL.Opt(IDL.Nat64)], [IDL.Vec(AuditEvent)], ["query"]),
    list_proposals: IDL.Func([], [IDL.Vec(Proposal)], ["query"]),
    list_votes: IDL.Func([IDL.Nat64], [IDL.Vec(Vote)], ["query"]),
  });
};
