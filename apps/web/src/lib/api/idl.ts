import { IDL } from '@icp-sdk/core/candid';

export const idlFactory: IDL.InterfaceFactory = ({ IDL }: { IDL: any }) => {
  const UserType = IDL.Variant({ 'User': IDL.Null, 'InvestorUser': IDL.Null });
  const UserProfile = IDL.Record({
    'display_name': IDL.Text,
    'user_type': UserType,
    'reputation': IDL.Float64,
    'home_region': IDL.Opt(IDL.Text),
    'created_at': IDL.Int64,
    'updated_at': IDL.Int64,
    'last_activity_ts': IDL.Int64,
    'activity_count': IDL.Nat32,
    'vote_count': IDL.Nat32,
    'is_local_verified': IDL.Bool,
    'has_expert_standing': IDL.Bool,
    'concluded_votes': IDL.Nat32,
    'accurate_votes': IDL.Nat32,
    'is_verified': IDL.Opt(IDL.Bool),
  });

  const ProposalStatus = IDL.Variant({
    'Active': IDL.Null,
    'QuorumNotMet': IDL.Null,
    'Rejected': IDL.Null,
    'AwaitingFunding': IDL.Null,
    'Backed': IDL.Null,
  });

  const ProposalCategory = IDL.Variant({
    'Infrastructure': IDL.Null,
    'Marketing': IDL.Null,
    'Events': IDL.Null,
    'Conservation': IDL.Null,
    'Education': IDL.Null,
    'Technology': IDL.Null,
    'Other': IDL.Null,
  });

  const Proposal = IDL.Record({
    'id': IDL.Nat64,
    'submitter': IDL.Principal,
    'region_tag': IDL.Text,
    'title': IDL.Text,
    'description': IDL.Text,
    'category': IDL.Opt(ProposalCategory),
    'budget_amount': IDL.Opt(IDL.Float64),
    'budget_currency': IDL.Opt(IDL.Text),
    'budget_breakdown': IDL.Opt(IDL.Text),
    'executor_name': IDL.Opt(IDL.Text),
    'execution_plan': IDL.Opt(IDL.Text),
    'timeline': IDL.Opt(IDL.Text),
    'expected_impact': IDL.Opt(IDL.Text),
    'fairness_score': IDL.Opt(IDL.Float64),
    'risk_flags': IDL.Vec(IDL.Text),
    'backed_by': IDL.Opt(IDL.Principal),
    'backed_at': IDL.Opt(IDL.Int64),
    'status': ProposalStatus,
    'created_at': IDL.Int64,
    'voting_ends_at': IDL.Int64,
    'yes_weight': IDL.Float64,
    'no_weight': IDL.Float64,
    'voter_count': IDL.Nat32,
  });

  const Vote = IDL.Record({
    'voter': IDL.Principal,
    'proposal_id': IDL.Nat64,
    'in_favor': IDL.Bool,
    'weight': IDL.Float64,
    'timestamp': IDL.Int64,
  });

  const ContractStatus = IDL.Variant({
    'Draft': IDL.Null,
    'Rejected': IDL.Null,
    'PendingSignatures': IDL.Null,
    'Signed': IDL.Null,
    'Expired': IDL.Null,
  });

  const SignatureMode = IDL.Variant({
    'OnChainAck': IDL.Null,
    'ExternalQualifiedSignature': IDL.Null,
  });

  const ContractParty = IDL.Record({
    'legal_name': IDL.Text,
    'registration_id': IDL.Text,
    'representative_name': IDL.Text,
    'representative_principal': IDL.Opt(IDL.Principal),
  });

  const ContractRecord = IDL.Record({
    'proposal_id': IDL.Nat64,
    'created_by': IDL.Principal,
    'investor_principal': IDL.Principal,
    'company': ContractParty,
    'document_hash': IDL.Text,
    'document_uri': IDL.Text,
    'milestone_hash': IDL.Opt(IDL.Text),
    'signature_mode': SignatureMode,
    'external_provider': IDL.Opt(IDL.Text),
    'external_envelope_id': IDL.Opt(IDL.Text),
    'investor_ack_at': IDL.Opt(IDL.Int64),
    'company_ack_at': IDL.Opt(IDL.Int64),
    'external_signed_at': IDL.Opt(IDL.Int64),
    'status': ContractStatus,
    'created_at': IDL.Int64,
    'updated_at': IDL.Int64,
  });

  const Result_UserProfile = IDL.Variant({ 'Ok': UserProfile, 'Err': IDL.Text });
  const Result_Proposal = IDL.Variant({ 'Ok': Proposal, 'Err': IDL.Text });
  const Result_Vote = IDL.Variant({ 'Ok': Vote, 'Err': IDL.Text });
  const Result_ContractRecord = IDL.Variant({ 'Ok': ContractRecord, 'Err': IDL.Text });
  const Result_Null = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });
  const Result_Any = IDL.Variant({ 'Ok': IDL.Reserved, 'Err': IDL.Text });
  const Result_Number = IDL.Variant({ 'Ok': IDL.Float64, 'Err': IDL.Text });

  const AuditLog = IDL.Record({
    'id': IDL.Nat64,
    'timestamp': IDL.Int64,
    'actor': IDL.Principal,
    'event_type': IDL.Text,
    'proposal_id': IDL.Opt(IDL.Nat64),
    'payload': IDL.Text,
  });

  const Config = IDL.Record({
    'voting_period_ns': IDL.Int64,
    'quorum_percent': IDL.Float64,
    'quorum_min_region_size': IDL.Nat32,
    'majority_threshold': IDL.Float64,
    'absolute_majority': IDL.Float64,
  });

  return IDL.Service({
    'create_my_profile': IDL.Func([IDL.Record({ 'display_name': IDL.Text, 'user_type': UserType, 'home_region': IDL.Opt(IDL.Text) })], [Result_UserProfile], []),
    'update_my_profile': IDL.Func([IDL.Record({ 'display_name': IDL.Text, 'home_region': IDL.Opt(IDL.Text) })], [Result_UserProfile], []),
    'get_user': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'get_my_profile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'whoami': IDL.Func([], [IDL.Principal], ['query']),
    'request_verification': IDL.Func([], [Result_Null], []),
    'admin_verify_investor': IDL.Func([IDL.Principal], [Result_Null], []),
    'submit_proposal': IDL.Func([
      IDL.Record({
        'title': IDL.Text,
        'description': IDL.Text,
        'region_tag': IDL.Text,
        'category': ProposalCategory,
        'budget_amount': IDL.Float64,
        'budget_currency': IDL.Text,
        'budget_breakdown': IDL.Text,
        'executor_name': IDL.Text,
        'execution_plan': IDL.Text,
        'timeline': IDL.Text,
        'expected_impact': IDL.Text,
      })
    ], [Result_Proposal], []),
    'get_proposal': IDL.Func([IDL.Nat64], [IDL.Opt(Proposal)], ['query']),
    'list_proposals': IDL.Func([IDL.Opt(ProposalStatus)], [IDL.Vec(Proposal)], ['query']),
    'cast_vote': IDL.Func([IDL.Nat64, IDL.Bool], [Result_Vote], []),
    'get_proposal_votes': IDL.Func([IDL.Nat64], [IDL.Vec(Vote)], ['query']),
    'finalize_proposal': IDL.Func([IDL.Nat64], [Result_Proposal], []),
    'back_proposal': IDL.Func([IDL.Nat64], [Result_Proposal], []),
    'create_contract_record': IDL.Func([IDL.Nat64, IDL.Text], [Result_ContractRecord], []),
    'investor_ack_contract': IDL.Func([IDL.Nat64], [Result_ContractRecord], []),
    'company_ack_contract': IDL.Func([IDL.Nat64], [Result_ContractRecord], []),
    'record_external_signature_status': IDL.Func([IDL.Nat64, IDL.Text], [Result_ContractRecord], []),
    'get_contract_record': IDL.Func([IDL.Nat64], [IDL.Opt(ContractRecord)], ['query']),
    'list_contracts': IDL.Func([IDL.Opt(ContractStatus)], [IDL.Vec(ContractRecord)], ['query']),
    'get_proposal_phase': IDL.Func([IDL.Nat64], [Result_Any], ['query']),
    'get_audit_log': IDL.Func([IDL.Nat32, IDL.Nat32], [IDL.Vec(AuditLog)], ['query']),
    'get_my_vp': IDL.Func([IDL.Text], [Result_Number], ['query']),
    'get_region_total_vp': IDL.Func([IDL.Text], [IDL.Float64], ['query']),
    'get_config': IDL.Func([], [Config], ['query']),
  });
};
