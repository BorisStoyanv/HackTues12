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
    'ReputationPenalized' : IDL.Null,
    'UserRegistered' : IDL.Null,
    'InvestorVerified' : IDL.Null,
    'ProposalFinalized' : IDL.Null,
    'ProposalBacked' : IDL.Null,
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
    'create_my_profile' : IDL.Func([CreateProfileInput], [Result_1], []),
    'finalize_proposal' : IDL.Func([IDL.Nat64], [Result_2], []),
    'get_audit_log' : IDL.Func(
        [IDL.Nat32, IDL.Nat32],
        [IDL.Vec(AuditEvent)],
        ['query'],
      ),
    'get_config' : IDL.Func([], [Config], ['query']),
    'get_my_profile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'get_my_vp' : IDL.Func([IDL.Text], [Result_4], ['query']),
    'get_proposal' : IDL.Func([IDL.Nat64], [IDL.Opt(Proposal)], ['query']),
    'get_proposal_votes' : IDL.Func([IDL.Nat64], [IDL.Vec(Vote)], ['query']),
    'get_region_total_vp' : IDL.Func([IDL.Text], [IDL.Float64], ['query']),
    'get_user' : IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'list_proposals' : IDL.Func(
        [IDL.Opt(ProposalStatus)],
        [IDL.Vec(Proposal)],
        ['query'],
      ),
    'request_verification' : IDL.Func([], [Result_5], []),
    'submit_proposal' : IDL.Func([SubmitProposalInput], [Result_2], []),
    'update_my_profile' : IDL.Func([UpdateProfileInput], [Result_1], []),
    'whoami' : IDL.Func([], [IDL.Principal], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
