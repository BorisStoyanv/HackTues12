import { Principal } from "@icp-sdk/core/principal";

export interface Location {
  lat: number;
  lng: number;
  city: string;
  country: string;
  formatted_address: string;
}

export type UserType = { User: null } | { InvestorUser: null };

export interface UserProfile {
  display_name: string;
  user_type: UserType;
  reputation: number;
  home_region: [] | [string];
  created_at: bigint;
  updated_at: bigint;
  last_activity_ts: bigint;
  activity_count: number;
  vote_count: number;
  is_local_verified: boolean;
  has_expert_standing: boolean;
  concluded_votes: number;
  accurate_votes: number;
  is_verified: [] | [boolean];
}

export type ProposalStatus =
  | { Active: null }
  | { QuorumNotMet: null }
  | { Rejected: null }
  | { AwaitingFunding: null }
  | { Backed: null };

export type ProposalCategory =
  | { Infrastructure: null }
  | { Marketing: null }
  | { Events: null }
  | { Conservation: null }
  | { Education: null }
  | { Technology: null }
  | { Other: null };

export interface ProposalCompany {
  legal_name: string;
  registration_id: string;
  representative_name: string;
  representative_principal: [] | [Principal];
}

export interface Proposal {
  id: bigint;
  submitter: Principal;
  region_tag: string;
  title: string;
  description: string;
  category: [] | [ProposalCategory];
  budget_amount: [] | [number];
  budget_currency: [] | [string];
  budget_breakdown: [] | [string];
  executor_name: [] | [string];
  execution_plan: [] | [string];
  timeline: [] | [string];
  expected_impact: [] | [string];
  approved_company: [] | [ProposalCompany];
  fairness_score: [] | [number];
  risk_flags: string[];
  backed_by: [] | [Principal];
  backed_at: [] | [bigint];
  status: ProposalStatus;
  created_at: bigint;
  voting_ends_at: bigint;
  yes_weight: number;
  no_weight: number;
  voter_count: number;
}

export interface Vote {
  voter: Principal;
  proposal_id: bigint;
  in_favor: boolean;
  weight: number;
  timestamp: bigint;
}

export type ContractStatus =
  | { Draft: null }
  | { Rejected: null }
  | { PendingSignatures: null }
  | { Signed: null }
  | { Expired: null };

export type SignatureMode =
  | { OnChainAck: null }
  | { ExternalQualifiedSignature: null };

export interface ContractParty {
  legal_name: string;
  registration_id: string;
  representative_name: string;
  representative_principal: [] | [Principal];
}

export interface ContractRecord {
  proposal_id: bigint;
  created_by: Principal;
  investor_principal: Principal;
  company: ContractParty;
  document_hash: string;
  document_uri: string;
  milestone_hash: [] | [string];
  signature_mode: SignatureMode;
  external_provider: [] | [string];
  external_envelope_id: [] | [string];
  investor_ack_at: [] | [bigint];
  company_ack_at: [] | [bigint];
  external_signed_at: [] | [bigint];
  status: ContractStatus;
  created_at: bigint;
  updated_at: bigint;
}

export interface AuditLog {
  id: bigint;
  timestamp: bigint;
  actor: Principal;
  event_type: any;
  proposal_id: [] | [bigint];
  payload: string;
}

export interface Config {
  voting_period_ns: bigint;
  quorum_percent: number;
  quorum_min_region_size: number;
  majority_threshold: number;
  absolute_majority: number;
}

export type Result<T> = { Ok: T } | { Err: string };

export interface AIIntegrityReport {
  fairness_score: number;
  efficiency_score: number;
  overall_score: number;
  summary: string;
  risk_factors: string[];
  positive_externalities: string[];
  debate_logs?: AIDebateLog[];
}

export interface AIDebateLog {
  agent: "advocate" | "skeptic" | "analyst";
  round: number;
  argument: string;
  timestamp: string;
}

export interface VotingMetrics {
  total_votes: number;
  quorum_reached: boolean;
  quorum_percentage: number;
  approval_percentage: number;
  yes_votes_weighted?: number;
  no_votes_weighted?: number;
  abstain_votes_weighted?: number;
  voting_power_distribution: {
    experts: number;
    locals: number;
    general: number;
  };
}

export interface ProposalPhase {
  proposal_id: bigint;
  proposal_status: ProposalStatus;
  phase_label: string;
  contract_status: [] | [ContractStatus];
}

export interface ExternalSignatureUpdateInput {
  external_envelope_id: string;
  signed: boolean;
}

export interface SubmitProposalInput {
  title: string;
  description: string;
  region_tag: string;
  category: ProposalCategory;
  budget_amount: number;
  budget_currency: string;
  budget_breakdown: string;
  executor_name: string;
  execution_plan: string;
  timeline: string;
  expected_impact: string;
  approved_company: [] | [ProposalCompany];
}

export interface CreateContractInput {
  document_hash: string;
  document_uri: string;
  milestone_hash: [] | [string];
  signature_mode: SignatureMode;
  external_provider: [] | [string];
}

export interface BackendService {
  create_my_profile(input: {
    display_name: string;
    user_type: UserType;
    home_region: [] | [string];
  }): Promise<Result<UserProfile>>;
  update_my_profile(input: {
    display_name: string;
    home_region: [] | [string];
  }): Promise<Result<UserProfile>>;
  get_user(principal: Principal): Promise<[] | [UserProfile]>;
  get_my_profile(): Promise<[] | [UserProfile]>;
  whoami(): Promise<Principal>;

  request_verification(): Promise<Result<null>>;
  admin_verify_investor(principal: Principal): Promise<Result<null>>;

  submit_proposal(input: SubmitProposalInput): Promise<Result<Proposal>>;
  get_proposal(id: bigint): Promise<[] | [Proposal]>;
  list_proposals(status_filter: [] | [ProposalStatus]): Promise<Proposal[]>;

  cast_vote(proposal_id: bigint, in_favor: boolean): Promise<Result<Vote>>;
  get_my_vote(id: bigint): Promise<[] | [Vote]>;
  get_proposal_votes(id: bigint): Promise<Vote[]>;

  finalize_proposal(id: bigint): Promise<Result<Proposal>>;
  back_proposal(id: bigint): Promise<Result<Proposal>>;

  create_contract_record(
    id: bigint,
    input: CreateContractInput,
  ): Promise<Result<ContractRecord>>;
  investor_ack_contract(id: bigint): Promise<Result<ContractRecord>>;
  company_ack_contract(id: bigint): Promise<Result<ContractRecord>>;
  record_external_signature_status(
    id: bigint,
    input: ExternalSignatureUpdateInput,
  ): Promise<Result<ContractRecord>>;
  get_contract_record(id: bigint): Promise<[] | [ContractRecord]>;
  list_contracts(
    status_filter: [] | [ContractStatus],
  ): Promise<ContractRecord[]>;
  get_proposal_phase(id: bigint): Promise<Result<ProposalPhase>>;

  get_audit_log(limit: number, offset: number): Promise<AuditLog[]>;
  get_my_vp(region_tag: string): Promise<Result<number>>;
  get_region_total_vp(region_tag: string): Promise<number>;
  get_config(): Promise<Config>;
}
