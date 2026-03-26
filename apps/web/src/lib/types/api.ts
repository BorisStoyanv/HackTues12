import { Principal } from '@dfinity/principal';

export interface Location {
  lat: number;
  lng: number;
  city: string;
  country: string;
  formatted_address: string;
}

export interface Proposal {
  id: string;
  creator: Principal;
  title: string;
  short_description: string;
  problem_statement: string;
  success_metric: string;
  location: Location;
  funding_goal: bigint;
  current_funding: bigint;
  status: string;
  created_at: bigint;
  updated_at: bigint;
  
  // Rich Metadata (Optional, may be fetched from separate stores/maps)
  ai_integrity_report?: AIIntegrityReport;
  voting_metrics?: VotingMetrics;
  tags?: string[];
}

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
  agent: 'advocate' | 'skeptic' | 'analyst';
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

export interface UserProfile {
  id: Principal;
  username: string;
  role: [string] | [];
  kyc_status: string;
  geo_verified: boolean;
  reputation: bigint;
  region: [string] | [];
}

export interface Vote {
  voter: Principal;
  proposal_id: string;
  vote_type: string;
  weight: bigint;
  timestamp: bigint;
}

export interface ContractRecord {
  id: string;
  proposal_id: string;
  investor: Principal;
  company: Principal;
  status: string;
  investor_signed: boolean;
  company_signed: boolean;
  created_at: bigint;
}

export interface AuditLog {
  timestamp: bigint;
  event: string;
  caller: Principal;
  details: string;
}

export interface Config {
  min_quorum: bigint;
  governance_token: [Principal] | [];
}

export interface BackendService {
  create_my_profile(): Promise<UserProfile>;
  update_my_profile(data: { username: string, region: [string] | [] }): Promise<UserProfile>;
  get_my_profile(): Promise<[UserProfile] | []>;
  get_user(principal: Principal): Promise<[UserProfile] | []>;
  whoami(): Promise<Principal>;
  request_verification(data: string): Promise<boolean>;
  admin_verify_investor(principal: Principal): Promise<boolean>;
  get_my_vp(): Promise<bigint>;
  get_region_total_vp(region: string): Promise<bigint>;

  submit_proposal(data: {
    title: string;
    short_description: string;
    problem_statement: string;
    success_metric: string;
    location: Location;
    funding_goal: bigint;
  }): Promise<Proposal>;
  get_proposal(id: string): Promise<[Proposal] | []>;
  list_proposals(): Promise<Proposal[]>;
  get_proposal_phase(id: string): Promise<string>;
  finalize_proposal(id: string): Promise<boolean>;

  cast_vote(proposal_id: string, vote_type: string): Promise<boolean>;
  get_proposal_votes(id: string): Promise<Vote[]>;
  back_proposal(proposal_id: string, amount: bigint): Promise<boolean>;

  create_contract_record(proposal_id: string, investor: Principal): Promise<ContractRecord>;
  get_contract_record(id: string): Promise<[ContractRecord] | []>;
  list_contracts(): Promise<ContractRecord[]>;
  investor_ack_contract(id: string): Promise<boolean>;
  company_ack_contract(id: string): Promise<boolean>;
  record_external_signature_status(id: string, status: string): Promise<boolean>;

  get_audit_log(): Promise<AuditLog[]>;
  get_config(): Promise<Config>;
}
