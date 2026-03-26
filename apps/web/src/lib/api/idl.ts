import { IDL } from '@dfinity/candid';

export const idlFactory: IDL.InterfaceFactory = ({ IDL }: { IDL: any }) => {
  const Location = IDL.Record({
    'lat': IDL.Float64,
    'lng': IDL.Float64,
    'city': IDL.Text,
    'country': IDL.Text,
    'formatted_address': IDL.Text,
  });

  const Proposal = IDL.Record({
    'id': IDL.Text,
    'creator': IDL.Principal,
    'title': IDL.Text,
    'short_description': IDL.Text,
    'problem_statement': IDL.Text,
    'success_metric': IDL.Text,
    'location': Location,
    'funding_goal': IDL.Nat64,
    'current_funding': IDL.Nat64,
    'status': IDL.Text,
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
  });

  const UserProfile = IDL.Record({
    'id': IDL.Principal,
    'username': IDL.Text,
    'role': IDL.Opt(IDL.Text),
    'kyc_status': IDL.Text,
    'geo_verified': IDL.Bool,
    'reputation': IDL.Nat64,
    'region': IDL.Opt(IDL.Text),
  });

  const Vote = IDL.Record({
    'voter': IDL.Principal,
    'proposal_id': IDL.Text,
    'vote_type': IDL.Text,
    'weight': IDL.Nat64,
    'timestamp': IDL.Nat64,
  });

  const ContractRecord = IDL.Record({
    'id': IDL.Text,
    'proposal_id': IDL.Text,
    'investor': IDL.Principal,
    'company': IDL.Principal,
    'status': IDL.Text,
    'investor_signed': IDL.Bool,
    'company_signed': IDL.Bool,
    'created_at': IDL.Nat64,
  });

  const AuditLog = IDL.Record({
    'timestamp': IDL.Nat64,
    'event': IDL.Text,
    'caller': IDL.Principal,
    'details': IDL.Text,
  });

  return IDL.Service({
    'create_my_profile': IDL.Func([], [UserProfile], []),
    'update_my_profile': IDL.Func([IDL.Record({ 'username': IDL.Text, 'region': IDL.Opt(IDL.Text) })], [UserProfile], []),
    'get_my_profile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'get_user': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'whoami': IDL.Func([], [IDL.Principal], ['query']),
    'request_verification': IDL.Func([IDL.Text], [IDL.Bool], []),
    'admin_verify_investor': IDL.Func([IDL.Principal], [IDL.Bool], []),
    'get_my_vp': IDL.Func([], [IDL.Nat64], ['query']),
    'get_region_total_vp': IDL.Func([IDL.Text], [IDL.Nat64], ['query']),

    'submit_proposal': IDL.Func([
      IDL.Record({
        'title': IDL.Text,
        'short_description': IDL.Text,
        'problem_statement': IDL.Text,
        'success_metric': IDL.Text,
        'location': Location,
        'funding_goal': IDL.Nat64,
      })
    ], [Proposal], []),
    'get_proposal': IDL.Func([IDL.Text], [IDL.Opt(Proposal)], ['query']),
    'list_proposals': IDL.Func([], [IDL.Vec(Proposal)], ['query']),
    'get_proposal_phase': IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'finalize_proposal': IDL.Func([IDL.Text], [IDL.Bool], []),

    'cast_vote': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
    'get_proposal_votes': IDL.Func([IDL.Text], [IDL.Vec(Vote)], ['query']),
    'back_proposal': IDL.Func([IDL.Text, IDL.Nat64], [IDL.Bool], []),

    'create_contract_record': IDL.Func([IDL.Text, IDL.Principal], [ContractRecord], []),
    'get_contract_record': IDL.Func([IDL.Text], [IDL.Opt(ContractRecord)], ['query']),
    'list_contracts': IDL.Func([], [IDL.Vec(ContractRecord)], ['query']),
    'investor_ack_contract': IDL.Func([IDL.Text], [IDL.Bool], []),
    'company_ack_contract': IDL.Func([IDL.Text], [IDL.Bool], []),
    'record_external_signature_status': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),

    'get_audit_log': IDL.Func([], [IDL.Vec(AuditLog)], ['query']),
    'get_config': IDL.Func([], [IDL.Record({ 'min_quorum': IDL.Nat64, 'governance_token': IDL.Opt(IDL.Principal) })], ['query']),
  });
};
