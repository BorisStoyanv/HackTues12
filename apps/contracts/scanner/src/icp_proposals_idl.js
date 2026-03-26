export const idlFactory = ({ IDL }) => {
  const ProposalStatus = IDL.Variant({
    QuorumNotMet: IDL.Null,
    Active: IDL.Null,
    AwaitingFunding: IDL.Null,
    Backed: IDL.Null,
    Rejected: IDL.Null,
  });

  const ProposalCategory = IDL.Variant({
    Infrastructure: IDL.Null,
    Technology: IDL.Null,
    Other: IDL.Null,
    Events: IDL.Null,
    Marketing: IDL.Null,
    Conservation: IDL.Null,
    Education: IDL.Null,
  });

  const Proposal = IDL.Record({
    id: IDL.Nat64,
    status: ProposalStatus,
    fairness_score: IDL.Opt(IDL.Float64),
    title: IDL.Text,
    submitter: IDL.Principal,
    execution_plan: IDL.Opt(IDL.Text),
    risk_flags: IDL.Vec(IDL.Text),
    yes_weight: IDL.Float64,
    description: IDL.Text,
    created_at: IDL.Nat64,
    budget_breakdown: IDL.Opt(IDL.Text),
    executor_name: IDL.Opt(IDL.Text),
    expected_impact: IDL.Opt(IDL.Text),
    budget_currency: IDL.Opt(IDL.Text),
    voting_ends_at: IDL.Nat64,
    category: IDL.Opt(ProposalCategory),
    backed_at: IDL.Opt(IDL.Nat64),
    backed_by: IDL.Opt(IDL.Principal),
    voter_count: IDL.Nat32,
    budget_amount: IDL.Opt(IDL.Float64),
    no_weight: IDL.Float64,
    region_tag: IDL.Text,
    timeline: IDL.Opt(IDL.Text),
  });

  const Vote = IDL.Record({
    weight: IDL.Float64,
    voter: IDL.Principal,
    in_favor: IDL.Bool,
    proposal_id: IDL.Nat64,
    timestamp: IDL.Nat64,
  });

  const ContractStatus = IDL.Variant({
    Draft: IDL.Null,
    Rejected: IDL.Null,
    PendingSignatures: IDL.Null,
    Signed: IDL.Null,
    Expired: IDL.Null,
  });

  const ContractParty = IDL.Record({
    legal_name: IDL.Text,
    representative_name: IDL.Text,
    representative_principal: IDL.Opt(IDL.Principal),
    registration_id: IDL.Text,
  });

  const SignatureMode = IDL.Variant({
    OnChainAck: IDL.Null,
    ExternalQualifiedSignature: IDL.Null,
  });

  const ContractRecord = IDL.Record({
    external_envelope_id: IDL.Opt(IDL.Text),
    status: ContractStatus,
    external_provider: IDL.Opt(IDL.Text),
    updated_at: IDL.Nat64,
    milestone_hash: IDL.Opt(IDL.Text),
    document_hash: IDL.Text,
    document_uri: IDL.Text,
    investor_ack_at: IDL.Opt(IDL.Nat64),
    external_signed_at: IDL.Opt(IDL.Nat64),
    signature_mode: SignatureMode,
    created_at: IDL.Nat64,
    created_by: IDL.Principal,
    company: ContractParty,
    proposal_id: IDL.Nat64,
    investor_principal: IDL.Principal,
    company_ack_at: IDL.Opt(IDL.Nat64),
  });

  const AuditEventType = IDL.Variant({
    InvestorContractAcked: IDL.Null,
    ReputationPenalized: IDL.Null,
    UserRegistered: IDL.Null,
    InvestorVerified: IDL.Null,
    ExternalSignatureRecorded: IDL.Null,
    ProposalFinalized: IDL.Null,
    ProposalBacked: IDL.Null,
    CompanyContractAcked: IDL.Null,
    ContractCreated: IDL.Null,
    ReputationAwarded: IDL.Null,
    ProposalSubmitted: IDL.Null,
    VoteCast: IDL.Null,
  });

  const AuditEvent = IDL.Record({
    id: IDL.Nat64,
    actor: IDL.Principal,
    proposal_id: IDL.Opt(IDL.Nat64),
    timestamp: IDL.Nat64,
    event_type: AuditEventType,
    payload: IDL.Text,
  });

  const Config = IDL.Record({
    majority_threshold: IDL.Float64,
    quorum_percent: IDL.Float64,
    voting_period_ns: IDL.Nat64,
    quorum_min_region_size: IDL.Nat32,
    absolute_majority: IDL.Float64,
  });

  const ProposalPhase = IDL.Record({
    proposal_id: IDL.Nat64,
    proposal_status: ProposalStatus,
    phase_label: IDL.Text,
    contract_status: IDL.Opt(ContractStatus),
  });

  const ResultProposalPhase = IDL.Variant({
    Ok: ProposalPhase,
    Err: IDL.Text,
  });

  return IDL.Service({
    get_audit_log: IDL.Func([IDL.Nat32, IDL.Nat32], [IDL.Vec(AuditEvent)], ["query"]),
    get_config: IDL.Func([], [Config], ["query"]),
    get_proposal_phase: IDL.Func([IDL.Nat64], [ResultProposalPhase], ["query"]),
    get_proposal_votes: IDL.Func([IDL.Nat64], [IDL.Vec(Vote)], ["query"]),
    get_region_total_vp: IDL.Func([IDL.Text], [IDL.Float64], ["query"]),
    list_contracts: IDL.Func([IDL.Opt(ContractStatus)], [IDL.Vec(ContractRecord)], ["query"]),
    list_proposals: IDL.Func([IDL.Opt(ProposalStatus)], [IDL.Vec(Proposal)], ["query"]),
  });
};
