export const idlFactory = ({ IDL }) => {
  const Result_5 = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const ProposalStatus = IDL.Variant({
    'QuorumNotMet' : IDL.Null,
    'Active' : IDL.Null,
    'AwaitingFunding' : IDL.Null,
    'Backed' : IDL.Null,
    'Rejected' : IDL.Null,
  });
  const ProposalCategory = IDL.Variant({
    'Infrastructure' : IDL.Null,
    'Technology' : IDL.Null,
    'Other' : IDL.Null,
    'Events' : IDL.Null,
    'Marketing' : IDL.Null,
    'Conservation' : IDL.Null,
    'Education' : IDL.Null,
  });
  const Proposal = IDL.Record({
    'id' : IDL.Nat64,
    'status' : ProposalStatus,
    'fairness_score' : IDL.Opt(IDL.Float64),
    'title' : IDL.Text,
    'submitter' : IDL.Principal,
    'execution_plan' : IDL.Opt(IDL.Text),
    'risk_flags' : IDL.Vec(IDL.Text),
    'yes_weight' : IDL.Float64,
    'description' : IDL.Text,
    'created_at' : IDL.Nat64,
    'budget_breakdown' : IDL.Opt(IDL.Text),
    'executor_name' : IDL.Opt(IDL.Text),
    'expected_impact' : IDL.Opt(IDL.Text),
    'budget_currency' : IDL.Opt(IDL.Text),
    'voting_ends_at' : IDL.Nat64,
    'category' : IDL.Opt(ProposalCategory),
    'backed_at' : IDL.Opt(IDL.Nat64),
    'backed_by' : IDL.Opt(IDL.Principal),
    'voter_count' : IDL.Nat32,
    'budget_amount' : IDL.Opt(IDL.Float64),
    'no_weight' : IDL.Float64,
    'region_tag' : IDL.Text,
    'timeline' : IDL.Opt(IDL.Text),
  });
  const Result_2 = IDL.Variant({ 'Ok' : Proposal, 'Err' : IDL.Text });
  const Vote = IDL.Record({
    'weight' : IDL.Float64,
    'voter' : IDL.Principal,
    'in_favor' : IDL.Bool,
    'proposal_id' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
  });
  const Result_3 = IDL.Variant({ 'Ok' : Vote, 'Err' : IDL.Text });
  const ContractStatus = IDL.Variant({
    'Draft' : IDL.Null,
    'Rejected' : IDL.Null,
    'PendingSignatures' : IDL.Null,
    'Signed' : IDL.Null,
    'Expired' : IDL.Null,
  });
  const SignatureMode = IDL.Variant({
    'OnChainAck' : IDL.Null,
    'ExternalQualifiedSignature' : IDL.Null,
  });
  const ContractParty = IDL.Record({
    'legal_name' : IDL.Text,
    'representative_name' : IDL.Text,
    'representative_principal' : IDL.Opt(IDL.Principal),
    'registration_id' : IDL.Text,
  });
  const ContractRecord = IDL.Record({
    'external_envelope_id' : IDL.Opt(IDL.Text),
    'status' : ContractStatus,
    'external_provider' : IDL.Opt(IDL.Text),
    'updated_at' : IDL.Nat64,
    'milestone_hash' : IDL.Opt(IDL.Text),
    'document_hash' : IDL.Text,
    'document_uri' : IDL.Text,
    'investor_ack_at' : IDL.Opt(IDL.Nat64),
    'external_signed_at' : IDL.Opt(IDL.Nat64),
    'signature_mode' : SignatureMode,
    'created_at' : IDL.Nat64,
    'created_by' : IDL.Principal,
    'company' : ContractParty,
    'proposal_id' : IDL.Nat64,
    'investor_principal' : IDL.Principal,
    'company_ack_at' : IDL.Opt(IDL.Nat64),
  });
  const Result_6 = IDL.Variant({ 'Ok' : ContractRecord, 'Err' : IDL.Text });
  const CreateContractInput = IDL.Record({
    'external_provider' : IDL.Opt(IDL.Text),
    'milestone_hash' : IDL.Opt(IDL.Text),
    'document_hash' : IDL.Text,
    'document_uri' : IDL.Text,
    'company_representative_name' : IDL.Text,
    'signature_mode' : SignatureMode,
    'company_registration_id' : IDL.Text,
    'company_legal_name' : IDL.Text,
    'company_representative_principal' : IDL.Opt(IDL.Principal),
  });
  const UserType = IDL.Variant({
    'User' : IDL.Null,
    'InvestorUser' : IDL.Null,
  });
  const CreateProfileInput = IDL.Record({
    'user_type' : UserType,
    'display_name' : IDL.Text,
    'home_region' : IDL.Opt(IDL.Text),
  });
  const UserProfile = IDL.Record({
    'updated_at' : IDL.Nat64,
    'user_type' : UserType,
    'concluded_votes' : IDL.Nat32,
    'accurate_votes' : IDL.Nat32,
    'activity_count' : IDL.Nat32,
    'reputation' : IDL.Float64,
    'created_at' : IDL.Nat64,
    'last_activity_ts' : IDL.Nat64,
    'display_name' : IDL.Text,
    'home_region' : IDL.Opt(IDL.Text),
    'is_local_verified' : IDL.Bool,
    'is_verified' : IDL.Opt(IDL.Bool),
    'vote_count' : IDL.Nat32,
    'has_expert_standing' : IDL.Bool,
  });
  const Result_1 = IDL.Variant({ 'Ok' : UserProfile, 'Err' : IDL.Text });
  const AuditEventType = IDL.Variant({
    'InvestorContractAcked' : IDL.Null,
    'ReputationPenalized' : IDL.Null,
    'UserRegistered' : IDL.Null,
    'InvestorVerified' : IDL.Null,
    'ExternalSignatureRecorded' : IDL.Null,
    'ProposalFinalized' : IDL.Null,
    'ProposalBacked' : IDL.Null,
    'CompanyContractAcked' : IDL.Null,
    'ContractCreated' : IDL.Null,
    'ReputationAwarded' : IDL.Null,
    'ProposalSubmitted' : IDL.Null,
    'VoteCast' : IDL.Null,
  });
  const AuditEvent = IDL.Record({
    'id' : IDL.Nat64,
    'actor' : IDL.Principal,
    'proposal_id' : IDL.Opt(IDL.Nat64),
    'timestamp' : IDL.Nat64,
    'event_type' : AuditEventType,
    'payload' : IDL.Text,
  });
  const Config = IDL.Record({
    'majority_threshold' : IDL.Float64,
    'quorum_percent' : IDL.Float64,
    'voting_period_ns' : IDL.Nat64,
    'quorum_min_region_size' : IDL.Nat32,
    'absolute_majority' : IDL.Float64,
  });
  const Result_4 = IDL.Variant({ 'Ok' : IDL.Float64, 'Err' : IDL.Text });
  const ProposalPhase = IDL.Record({
    'proposal_id' : IDL.Nat64,
    'proposal_status' : ProposalStatus,
    'phase_label' : IDL.Text,
    'contract_status' : IDL.Opt(ContractStatus),
  });
  const Result_7 = IDL.Variant({ 'Ok' : ProposalPhase, 'Err' : IDL.Text });
  const ExternalSignatureUpdateInput = IDL.Record({
    'external_envelope_id' : IDL.Text,
    'signed' : IDL.Bool,
  });
  const SubmitProposalInput = IDL.Record({
    'title' : IDL.Text,
    'execution_plan' : IDL.Text,
    'description' : IDL.Text,
    'budget_breakdown' : IDL.Text,
    'executor_name' : IDL.Text,
    'expected_impact' : IDL.Text,
    'budget_currency' : IDL.Text,
    'category' : ProposalCategory,
    'budget_amount' : IDL.Float64,
    'region_tag' : IDL.Text,
    'timeline' : IDL.Text,
  });
  const UpdateProfileInput = IDL.Record({
    'display_name' : IDL.Text,
    'home_region' : IDL.Opt(IDL.Text),
  });
  return IDL.Service({
    'admin_verify_investor' : IDL.Func([IDL.Principal], [Result_5], []),
    'back_proposal' : IDL.Func([IDL.Nat64], [Result_2], []),
    'cast_vote' : IDL.Func([IDL.Nat64, IDL.Bool], [Result_3], []),
    'company_ack_contract' : IDL.Func([IDL.Nat64], [Result_6], []),
    'create_contract_record' : IDL.Func(
        [IDL.Nat64, CreateContractInput],
        [Result_6],
        [],
      ),
    'create_my_profile' : IDL.Func([CreateProfileInput], [Result_1], []),
    'finalize_proposal' : IDL.Func([IDL.Nat64], [Result_2], []),
    'get_audit_log' : IDL.Func(
        [IDL.Nat32, IDL.Nat32],
        [IDL.Vec(AuditEvent)],
        ['query'],
      ),
    'get_config' : IDL.Func([], [Config], ['query']),
    'get_contract_record' : IDL.Func(
        [IDL.Nat64],
        [IDL.Opt(ContractRecord)],
        ['query'],
      ),
    'get_my_profile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'get_my_vp' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'get_proposal' : IDL.Func([IDL.Nat64], [IDL.Opt(Proposal)], ['query']),
    'get_proposal_phase' : IDL.Func([IDL.Nat64], [Result_7], ['query']),
    'get_proposal_votes' : IDL.Func([IDL.Nat64], [IDL.Vec(Vote)], ['query']),
    'get_region_total_vp' : IDL.Func([IDL.Text], [IDL.Float64], ['query']),
    'get_user' : IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'investor_ack_contract' : IDL.Func([IDL.Nat64], [Result_6], []),
    'list_contracts' : IDL.Func(
        [IDL.Opt(ContractStatus)],
        [IDL.Vec(ContractRecord)],
        ['query'],
      ),
    'list_proposals' : IDL.Func(
        [IDL.Opt(ProposalStatus)],
        [IDL.Vec(Proposal)],
        ['query'],
      ),
    'record_external_signature_status' : IDL.Func(
        [IDL.Nat64, ExternalSignatureUpdateInput],
        [Result_6],
        [],
      ),
    'request_verification' : IDL.Func([], [Result_5], []),
    'submit_proposal' : IDL.Func([SubmitProposalInput], [Result_2], []),
    'update_my_profile' : IDL.Func([UpdateProfileInput], [Result_1], []),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
