import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AuditEvent {
  'id' : bigint,
  'actor' : Principal,
  'proposal_id' : [] | [bigint],
  'timestamp' : bigint,
  'event_type' : AuditEventType,
  'payload' : string,
}
export type AuditEventType = { 'ReputationPenalized' : null } |
  { 'UserRegistered' : null } |
  { 'InvestorVerified' : null } |
  { 'ProposalFinalized' : null } |
  { 'ProposalBacked' : null } |
  { 'ReputationAwarded' : null } |
  { 'ProposalSubmitted' : null } |
  { 'VoteCast' : null };
export interface Config {
  'majority_threshold' : number,
  'quorum_percent' : number,
  'voting_period_ns' : bigint,
  'quorum_min_region_size' : number,
  'absolute_majority' : number,
}
export interface CreateProfileInput {
  'user_type' : UserType,
  'display_name' : string,
  'home_region' : [] | [string],
}
export interface Proposal {
  'id' : bigint,
  'status' : ProposalStatus,
  'fairness_score' : [] | [number],
  'title' : string,
  'submitter' : Principal,
  'execution_plan' : [] | [string],
  'risk_flags' : Array<string>,
  'yes_weight' : number,
  'description' : string,
  'created_at' : bigint,
  'budget_breakdown' : [] | [string],
  'executor_name' : [] | [string],
  'expected_impact' : [] | [string],
  'budget_currency' : [] | [string],
  'voting_ends_at' : bigint,
  'category' : [] | [ProposalCategory],
  'backed_at' : [] | [bigint],
  'backed_by' : [] | [Principal],
  'voter_count' : number,
  'budget_amount' : [] | [number],
  'no_weight' : number,
  'region_tag' : string,
  'timeline' : [] | [string],
}
export type ProposalCategory = { 'Infrastructure' : null } |
  { 'Technology' : null } |
  { 'Other' : null } |
  { 'Events' : null } |
  { 'Marketing' : null } |
  { 'Conservation' : null } |
  { 'Education' : null };
export type ProposalStatus = { 'QuorumNotMet' : null } |
  { 'Active' : null } |
  { 'AwaitingFunding' : null } |
  { 'Backed' : null } |
  { 'Rejected' : null };
export type Result_1 = { 'Ok' : UserProfile } |
  { 'Err' : string };
export type Result_2 = { 'Ok' : Proposal } |
  { 'Err' : string };
export type Result_3 = { 'Ok' : Vote } |
  { 'Err' : string };
export type Result_4 = { 'Ok' : number } |
  { 'Err' : string };
export type Result_5 = { 'Ok' : null } |
  { 'Err' : string };
export interface SubmitProposalInput {
  'title' : string,
  'execution_plan' : string,
  'description' : string,
  'budget_breakdown' : string,
  'executor_name' : string,
  'expected_impact' : string,
  'budget_currency' : string,
  'category' : ProposalCategory,
  'budget_amount' : number,
  'region_tag' : string,
  'timeline' : string,
}
export interface UpdateProfileInput {
  'display_name' : string,
  'home_region' : [] | [string],
}
export interface UserProfile {
  'updated_at' : bigint,
  'user_type' : UserType,
  'concluded_votes' : number,
  'accurate_votes' : number,
  'activity_count' : number,
  'reputation' : number,
  'created_at' : bigint,
  'last_activity_ts' : bigint,
  'display_name' : string,
  'home_region' : [] | [string],
  'is_local_verified' : boolean,
  'is_verified' : [] | [boolean],
  'vote_count' : number,
  'has_expert_standing' : boolean,
}
export type UserType = { 'User' : null } |
  { 'InvestorUser' : null };
export interface Vote {
  'weight' : number,
  'voter' : Principal,
  'in_favor' : boolean,
  'proposal_id' : bigint,
  'timestamp' : bigint,
}
export interface _SERVICE {
  'admin_verify_investor' : ActorMethod<[Principal], Result_5>,
  'back_proposal' : ActorMethod<[bigint], Result_2>,
  'cast_vote' : ActorMethod<[bigint, boolean], Result_3>,
  'create_my_profile' : ActorMethod<[CreateProfileInput], Result_1>,
  'finalize_proposal' : ActorMethod<[bigint], Result_2>,
  'get_audit_log' : ActorMethod<[number, number], Array<AuditEvent>>,
  'get_config' : ActorMethod<[], Config>,
  'get_my_profile' : ActorMethod<[], [] | [UserProfile]>,
  'get_my_vp' : ActorMethod<[string], Result_4>,
  'get_proposal' : ActorMethod<[bigint], [] | [Proposal]>,
  'get_proposal_votes' : ActorMethod<[bigint], Array<Vote>>,
  'get_region_total_vp' : ActorMethod<[string], number>,
  'get_user' : ActorMethod<[Principal], [] | [UserProfile]>,
  'list_proposals' : ActorMethod<[[] | [ProposalStatus]], Array<Proposal>>,
  'request_verification' : ActorMethod<[], Result_5>,
  'submit_proposal' : ActorMethod<[SubmitProposalInput], Result_2>,
  'update_my_profile' : ActorMethod<[UpdateProfileInput], Result_1>,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
