import { IDL } from "@icp-sdk/core/candid";

/**
 * IDL Factory for the OpenFairTrip backend canister.
 * Strictly aligned with @apps/contracts/icp_proposals_mvp/icp_proposals_mvp.did
 */
export const idlFactory: IDL.InterfaceFactory = ({
  IDL: idl,
}: Parameters<IDL.InterfaceFactory>[0]) => {
  const UserType = idl.Variant({ User: idl.Null, InvestorUser: idl.Null });

  const UserProfile = idl.Record({
    updated_at: idl.Nat64,
    user_type: UserType,
    concluded_votes: idl.Nat32,
    accurate_votes: idl.Nat32,
    activity_count: idl.Nat32,
    reputation: idl.Float64,
    created_at: idl.Nat64,
    last_activity_ts: idl.Nat64,
    display_name: idl.Text,
    home_region: idl.Opt(idl.Text),
    is_local_verified: idl.Bool,
    is_verified: idl.Opt(idl.Bool),
    vote_count: idl.Nat32,
    has_expert_standing: idl.Bool,
  });

  const CreateProfileInput = idl.Record({
    display_name: idl.Text,
    user_type: UserType,
    home_region: idl.Opt(idl.Text),
  });

  const UpdateProfileInput = idl.Record({
    display_name: idl.Text,
    home_region: idl.Opt(idl.Text),
  });

  const ProposalStatus = idl.Variant({
    QuorumNotMet: idl.Null,
    Active: idl.Null,
    AwaitingFunding: idl.Null,
    Backed: idl.Null,
    Rejected: idl.Null,
  });

  const ProposalCategory = idl.Variant({
    Infrastructure: idl.Null,
    Marketing: idl.Null,
    Events: idl.Null,
    Conservation: idl.Null,
    Education: idl.Null,
    Technology: idl.Null,
    Other: idl.Null,
  });

  const ProposalCompany = idl.Record({
    legal_name: idl.Text,
    registration_id: idl.Text,
    representative_name: idl.Text,
    representative_principal: idl.Opt(idl.Principal),
  });

  const ProposalLocation = idl.Record({
    formatted_address: idl.Text,
    city: idl.Text,
    country: idl.Text,
    lat: idl.Float64,
    lng: idl.Float64,
  });

  const Proposal = idl.Record({
    id: idl.Nat64,
    status: ProposalStatus,
    fairness_score: idl.Opt(idl.Float64),
    title: idl.Text,
    submitter: idl.Principal,
    execution_plan: idl.Opt(idl.Text),
    risk_flags: idl.Vec(idl.Text),
    yes_weight: idl.Float64,
    description: idl.Text,
    created_at: idl.Nat64,
    budget_breakdown: idl.Opt(idl.Text),
    executor_name: idl.Opt(idl.Text),
    expected_impact: idl.Opt(idl.Text),
    approved_company: idl.Opt(ProposalCompany),
    location: idl.Opt(ProposalLocation),
    budget_currency: idl.Opt(idl.Text),
    voting_ends_at: idl.Nat64,
    category: idl.Opt(ProposalCategory),
    backed_at: idl.Opt(idl.Nat64),
    backed_by: idl.Opt(idl.Principal),
    resolved_total_vp: idl.Opt(idl.Float64),
    voter_count: idl.Nat32,
    budget_amount: idl.Opt(idl.Float64),
    no_weight: idl.Float64,
    region_tag: idl.Text,
    timeline: idl.Opt(idl.Text),
  });

  const SubmitProposalInput = idl.Record({
    title: idl.Text,
    execution_plan: idl.Text,
    description: idl.Text,
    budget_breakdown: idl.Text,
    executor_name: idl.Text,
    expected_impact: idl.Text,
    budget_currency: idl.Text,
    category: ProposalCategory,
    budget_amount: idl.Float64,
    region_tag: idl.Text,
    timeline: idl.Text,
    approved_company: idl.Opt(ProposalCompany),
    location: idl.Opt(ProposalLocation),
  });

  const Vote = idl.Record({
    weight: idl.Float64,
    voter: idl.Principal,
    in_favor: idl.Bool,
    proposal_id: idl.Nat64,
    timestamp: idl.Nat64,
  });

  const Config = idl.Record({
    majority_threshold: idl.Float64,
    quorum_percent: idl.Float64,
    voting_period_ns: idl.Nat64,
    quorum_min_region_size: idl.Nat32,
    absolute_majority: idl.Float64,
  });

  const ContractStatus = idl.Variant({
    Draft: idl.Null,
    Rejected: idl.Null,
    PendingSignatures: idl.Null,
    Signed: idl.Null,
    Expired: idl.Null,
  });

  const SignatureMode = idl.Variant({
    OnChainAck: idl.Null,
    ExternalQualifiedSignature: idl.Null,
  });

  const ContractParty = idl.Record({
    legal_name: idl.Text,
    registration_id: idl.Text,
    representative_name: idl.Text,
    representative_principal: idl.Opt(idl.Principal),
  });

  const ContractRecord = idl.Record({
    external_envelope_id: idl.Opt(idl.Text),
    status: ContractStatus,
    external_provider: idl.Opt(idl.Text),
    updated_at: idl.Nat64,
    milestone_hash: idl.Opt(idl.Text),
    document_hash: idl.Text,
    document_uri: idl.Text,
    investor_ack_at: idl.Opt(idl.Nat64),
    external_signed_at: idl.Opt(idl.Nat64),
    signature_mode: SignatureMode,
    created_at: idl.Nat64,
    created_by: idl.Principal,
    company: ContractParty,
    proposal_id: idl.Nat64,
    investor_principal: idl.Principal,
    company_ack_at: idl.Opt(idl.Nat64),
  });

  const CreateContractInput = idl.Record({
    document_hash: idl.Text,
    document_uri: idl.Text,
    milestone_hash: idl.Opt(idl.Text),
    signature_mode: SignatureMode,
    external_provider: idl.Opt(idl.Text),
  });

  const ExternalSignatureUpdateInput = idl.Record({
    external_envelope_id: idl.Text,
    signed: idl.Bool,
  });

  const ProposalPhase = idl.Record({
    proposal_id: idl.Nat64,
    proposal_status: ProposalStatus,
    phase_label: idl.Text,
    contract_status: idl.Opt(ContractStatus),
  });

  const Result_UserProfile = idl.Variant({ Ok: UserProfile, Err: idl.Text });
  const Result_Proposal = idl.Variant({ Ok: Proposal, Err: idl.Text });
  const Result_Vote = idl.Variant({ Ok: Vote, Err: idl.Text });
  const Result_ContractRecord = idl.Variant({
    Ok: ContractRecord,
    Err: idl.Text,
  });
  const Result_Null = idl.Variant({ Ok: idl.Null, Err: idl.Text });
  const Result_Number = idl.Variant({ Ok: idl.Float64, Err: idl.Text });
  const Result_ProposalPhase = idl.Variant({
    Ok: ProposalPhase,
    Err: idl.Text,
  });

  const AuditEventType = idl.Variant({
    InvestorContractAcked: idl.Null,
    ReputationPenalized: idl.Null,
    UserRegistered: idl.Null,
    InvestorVerified: idl.Null,
    ExternalSignatureRecorded: idl.Null,
    ProposalFinalized: idl.Null,
    ProposalBacked: idl.Null,
    CompanyContractAcked: idl.Null,
    ContractCreated: idl.Null,
    ReputationAwarded: idl.Null,
    ProposalSubmitted: idl.Null,
    VoteCast: idl.Null,
  });

  const AuditLog = idl.Record({
    id: idl.Nat64,
    timestamp: idl.Nat64,
    actor: idl.Principal,
    event_type: AuditEventType,
    proposal_id: idl.Opt(idl.Nat64),
    payload: idl.Text,
  });
  return idl.Service({
    admin_verify_investor: idl.Func([idl.Principal], [Result_Null], []),
    back_proposal: idl.Func([idl.Nat64], [Result_Proposal], []),
    cast_vote: idl.Func([idl.Nat64, idl.Bool], [Result_Vote], []),
    company_ack_contract: idl.Func([idl.Nat64], [Result_ContractRecord], []),
    create_contract_record: idl.Func(
      [idl.Nat64, CreateContractInput],
      [Result_ContractRecord],
      [],
    ),
    create_my_profile: idl.Func([CreateProfileInput], [Result_UserProfile], []),
    finalize_proposal: idl.Func([idl.Nat64], [Result_Proposal], []),
    get_audit_log: idl.Func(
      [idl.Nat32, idl.Nat32],
      [idl.Vec(AuditLog)],
      ["query"],
    ),
    get_config: idl.Func([], [Config], ["query"]),
    get_contract_record: idl.Func(
      [idl.Nat64],
      [idl.Opt(ContractRecord)],
      ["query"],
    ),
    get_my_profile: idl.Func([], [idl.Opt(UserProfile)], ["query"]),
    get_my_vote: idl.Func([idl.Nat64], [idl.Opt(Vote)], ["query"]),
    get_my_vp: idl.Func([idl.Text], [Result_Number], ["query"]),
    get_proposal: idl.Func([idl.Nat64], [idl.Opt(Proposal)], ["query"]),
    get_proposal_phase: idl.Func(
      [idl.Nat64],
      [Result_ProposalPhase],
      ["query"],
    ),
    get_proposal_votes: idl.Func([idl.Nat64], [idl.Vec(Vote)], ["query"]),
    get_region_total_vp: idl.Func([idl.Text], [idl.Float64], ["query"]),
    get_user: idl.Func([idl.Principal], [idl.Opt(UserProfile)], ["query"]),
    investor_ack_contract: idl.Func([idl.Nat64], [Result_ContractRecord], []),
    list_contracts: idl.Func(
      [idl.Opt(ContractStatus)],
      [idl.Vec(ContractRecord)],
      ["query"],
    ),
    list_proposals: idl.Func(
      [idl.Opt(ProposalStatus)],
      [idl.Vec(Proposal)],
      ["query"],
    ),
    record_external_signature_status: idl.Func(
      [idl.Nat64, ExternalSignatureUpdateInput],
      [Result_ContractRecord],
      [],
    ),
    request_verification: idl.Func([], [Result_Null], []),
    submit_proposal: idl.Func([SubmitProposalInput], [Result_Proposal], []),
    update_my_profile: idl.Func([UpdateProfileInput], [Result_UserProfile], []),
    whoami: idl.Func([], [idl.Principal], ["query"]),
  });
};
