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
export type AuditEventType = { 'InvestorContractAcked' : null } |
  { 'ReputationPenalized' : null } |
  { 'UserRegistered' : null } |
  { 'InvestorVerified' : null } |
  { 'ExternalSignatureRecorded' : null } |
  { 'ProposalFinalized' : null } |
  { 'ProposalBacked' : null } |
  { 'CompanyContractAcked' : null } |
  { 'ContractCreated' : null } |
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
export interface ContractParty {
  'legal_name' : string,
  'representative_name' : string,
  'representative_principal' : [] | [Principal],
  'registration_id' : string,
}
export interface ContractRecord {
  'external_envelope_id' : [] | [string],
  'status' : ContractStatus,
  'external_provider' : [] | [string],
  'updated_at' : bigint,
  'milestone_hash' : [] | [string],
  'document_hash' : string,
  'document_uri' : string,
  'investor_ack_at' : [] | [bigint],
  'external_signed_at' : [] | [bigint],
  'signature_mode' : SignatureMode,
  'created_at' : bigint,
  'created_by' : Principal,
  'company' : ContractParty,
  'proposal_id' : bigint,
  'investor_principal' : Principal,
  'company_ack_at' : [] | [bigint],
}
export type ContractStatus = { 'Draft' : null } |
  { 'Rejected' : null } |
  { 'PendingSignatures' : null } |
  { 'Signed' : null } |
  { 'Expired' : null };
export interface CreateContractInput {
  'external_provider' : [] | [string],
  'milestone_hash' : [] | [string],
  'document_hash' : string,
  'document_uri' : string,
  'company_representative_name' : string,
  'signature_mode' : SignatureMode,
  'company_registration_id' : string,
  'company_legal_name' : string,
  'company_representative_principal' : [] | [Principal],
}
export interface CreateProfileInput {
  'user_type' : UserType,
  'display_name' : string,
  'home_region' : [] | [string],
}
export interface ExternalSignatureUpdateInput {
  'external_envelope_id' : string,
  'signed' : boolean,
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
export interface ProposalPhase {
  'proposal_id' : bigint,
  'proposal_status' : ProposalStatus,
  'phase_label' : string,
  'contract_status' : [] | [ContractStatus],
}
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
export type Result_6 = { 'Ok' : ContractRecord } |
  { 'Err' : string };
export type Result_7 = { 'Ok' : ProposalPhase } |
  { 'Err' : string };
export type SignatureMode = { 'OnChainAck' : null } |
  { 'ExternalQualifiedSignature' : null };
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
  'company_ack_contract' : ActorMethod<[bigint], Result_6>,
  'create_contract_record' : ActorMethod<
    [bigint, CreateContractInput],
    Result_6
  >,
  'create_my_profile' : ActorMethod<[CreateProfileInput], Result_1>,
  'finalize_proposal' : ActorMethod<[bigint], Result_2>,
  'get_audit_log' : ActorMethod<[number, number], Array<AuditEvent>>,
  'get_config' : ActorMethod<[], Config>,
  'get_contract_record' : ActorMethod<[bigint], [] | [ContractRecord]>,
  'get_my_profile' : ActorMethod<[], [] | [UserProfile]>,
  'get_my_vp' : ActorMethod<[string], Result_4>,
  'get_proposal' : ActorMethod<[bigint], [] | [Proposal]>,
  'get_proposal_phase' : ActorMethod<[bigint], Result_7>,
  'get_proposal_votes' : ActorMethod<[bigint], Array<Vote>>,
  'get_region_total_vp' : ActorMethod<[string], number>,
  'get_user' : ActorMethod<[Principal], [] | [UserProfile]>,
  'investor_ack_contract' : ActorMethod<[bigint], Result_6>,
  'list_contracts' : ActorMethod<
    [[] | [ContractStatus]],
    Array<ContractRecord>
  >,
  'list_proposals' : ActorMethod<[[] | [ProposalStatus]], Array<Proposal>>,
  'record_external_signature_status' : ActorMethod<
    [bigint, ExternalSignatureUpdateInput],
    Result_6
  >,
  'request_verification' : ActorMethod<[], Result_5>,
  'submit_proposal' : ActorMethod<[SubmitProposalInput], Result_2>,
  'update_my_profile' : ActorMethod<[UpdateProfileInput], Result_1>,
  'whoami' : ActorMethod<[], Principal>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
