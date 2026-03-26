"use server";

import { createBackendActor } from "../api/icp";
import { Proposal, Vote, AuditLog, ContractRecord, Config, ProposalPhase } from "../types/api";

export interface SerializedProposal {
  id: string;
  submitter: string;
  creator: string; // Alias
  region_tag: string;
  title: string;
  description: string;
  short_description: string;
  problem_statement: string;
  category: string;
  budget_amount: number;
  funding_goal: number; // Alias
  budget_currency: string;
  budget_breakdown: string;
  executor_name: string;
  execution_plan: string;
  timeline: string;
  expected_impact: string;
  fairness_score: number;
  risk_flags: string[];
  status: string;
  created_at: number;
  updated_at: number;
  voting_ends_at: number;
  yes_weight: number;
  current_funding: number; // Alias
  no_weight: number;
  voter_count: number;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    formatted_address: string;
  };
}

function serializeProposal(proposal: Proposal): SerializedProposal {
  const statusKey = Object.keys(proposal.status)[0] || 'Active';
  const budget = proposal.budget_amount.length > 0 ? Number(proposal.budget_amount[0]) : 0;
  const yesWeight = proposal.yes_weight;
  const fairness = proposal.fairness_score.length > 0 ? proposal.fairness_score[0]! : 0;

  return {
    id: proposal.id.toString(),
    submitter: proposal.submitter.toString(),
    creator: proposal.submitter.toString(),
    region_tag: proposal.region_tag,
    title: proposal.title,
    description: proposal.description,
    short_description: proposal.description.substring(0, 160),
    problem_statement: proposal.description,
    category: proposal.category.length > 0 && proposal.category[0] ? Object.keys(proposal.category[0])[0] : 'Other',
    budget_amount: budget,
    funding_goal: budget,
    budget_currency: proposal.budget_currency.length > 0 ? proposal.budget_currency[0]! : 'USD',
    budget_breakdown: proposal.budget_breakdown.length > 0 ? proposal.budget_breakdown[0]! : '',
    executor_name: proposal.executor_name.length > 0 ? proposal.executor_name[0]! : '',
    execution_plan: proposal.execution_plan.length > 0 ? proposal.execution_plan[0]! : '',
    timeline: proposal.timeline.length > 0 ? proposal.timeline[0]! : '',
    expected_impact: proposal.expected_impact.length > 0 ? proposal.expected_impact[0]! : '',
    fairness_score: fairness,
    risk_flags: proposal.risk_flags || [],
    status: statusKey,
    created_at: Number(proposal.created_at),
    updated_at: Number(proposal.created_at),
    voting_ends_at: Number(proposal.voting_ends_at),
    yes_weight: yesWeight,
    current_funding: yesWeight,
    no_weight: proposal.no_weight,
    voter_count: proposal.voter_count,
    location: {
      lat: 50.0,
      lng: 10.0,
      city: proposal.region_tag,
      country: "Unknown",
      formatted_address: proposal.region_tag
    }
  };
}



export interface SerializedVote {
  voter: string;
  proposal_id: string;
  in_favor: boolean;
  weight: number;
  timestamp: number;
}

function serializeVote(vote: Vote): SerializedVote {
  return {
    voter: vote.voter.toString(),
    proposal_id: vote.proposal_id.toString(),
    in_favor: vote.in_favor,
    weight: vote.weight,
    timestamp: Number(vote.timestamp),
  };
}

export interface SerializedAuditLog {
  id: string;
  timestamp: number;
  actor: string;
  event_type: string;
  proposal_id: string | null;
  payload: string;
}

function serializeAuditLog(log: AuditLog): SerializedAuditLog {
  return {
    id: log.id.toString(),
    timestamp: Number(log.timestamp),
    actor: log.actor.toString(),
    event_type: typeof log.event_type === 'string' ? log.event_type : Object.keys(log.event_type)[0],
    proposal_id: log.proposal_id.length > 0 ? log.proposal_id[0]!.toString() : null,
    payload: log.payload,
  };
}

export interface SerializedContract {
  proposal_id: string;
  created_by: string;
  investor: string;
  company_name: string;
  status: string;
  created_at: number;
  updated_at: number;
  document_uri: string;
}

function serializeContract(c: ContractRecord): SerializedContract {
  return {
    proposal_id: c.proposal_id.toString(),
    created_by: c.created_by.toString(),
    investor: c.investor_principal.toString(),
    company_name: c.company.legal_name,
    status: Object.keys(c.status)[0] || 'Draft',
    created_at: Number(c.created_at),
    updated_at: Number(c.updated_at),
    document_uri: c.document_uri,
  };
}

export async function fetchAllProposals(status?: string) {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.list_proposals(status ? [{ [status]: null } as any] : []);
    return { success: true, proposals: proposals.map(serializeProposal) };
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return { success: false, proposals: [] };
  }
}

export async function fetchMyProposals() {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.list_proposals([]);
    const principal = await actor.whoami();
    const myProposals = proposals.filter(p => p.submitter.toString() === principal.toString());
    
    return { success: true, proposals: myProposals.map(serializeProposal) };
  } catch (error) {
    console.error("Failed to fetch my proposals:", error);
    return { success: false, proposals: [] };
  }
}

export async function fetchProposalById(id: string) {
  if (isNaN(Number(id))) return { success: false, error: "Invalid ID" };
  try {
    const actor = await createBackendActor();
    const result = await actor.get_proposal(BigInt(id));
    if (result.length > 0) return { success: true, proposal: serializeProposal(result[0]!) };
    return { success: false, error: "Not found" };
  } catch (error) {
    return { success: false, error: "Error fetching proposal" };
  }
}

export async function fetchProposalVotes(id: string) {
  try {
    const actor = await createBackendActor();
    const votes = await actor.get_proposal_votes(BigInt(id));
    return { success: true, votes: votes.map(serializeVote) };
  } catch (error) {
    console.error("Failed to fetch votes:", error);
    return { success: false, votes: [] };
  }
}

export async function fetchProposalPhase(id: string) {
  try {
    const actor = await createBackendActor();
    const result = await actor.get_proposal_phase(BigInt(id));
    if ('Ok' in result) {
      return { success: true, phase: result.Ok };
    }
    return { success: false, error: result.Err };
  } catch (error) {
    console.error("Failed to fetch proposal phase:", error);
    return { success: false, error: "Failed to fetch proposal phase." };
  }
}

export async function fetchAuditLogs(limit: number = 50, offset: number = 0) {
  try {
    const actor = await createBackendActor();
    const logs = await actor.get_audit_log(limit, offset);
    return { success: true, logs: logs.map(serializeAuditLog) };
  } catch (error) {
    return { success: false, logs: [] };
  }
}

export async function fetchAllContracts(status?: string) {
  try {
    const actor = await createBackendActor();
    const contracts = await actor.list_contracts(status ? [{ [status]: null } as any] : []);
    return { success: true, contracts: contracts.map(serializeContract) };
  } catch (error) {
    return { success: false, contracts: [] };
  }
}

export async function fetchContractById(id: string) {
  try {
    const actor = await createBackendActor();
    const result = await actor.get_contract_record(BigInt(id));
    if (result.length > 0) {
      return { success: true, contract: serializeContract(result[0]!) };
    }
    return { success: false, error: "Contract not found." };
  } catch (error) {
    console.error("Failed to fetch contract:", error);
    return { success: false, error: "Failed to fetch contract record." };
  }
}

export async function fetchConfig() {
  try {
    const actor = await createBackendActor();
    const config = await actor.get_config();
    return { 
      success: true, 
      config: {
        ...config,
        voting_period_ns: config.voting_period_ns.toString()
      } 
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch config" };
  }
}

export async function fetchGlobalStats() {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.list_proposals([]); 
    
    const total_funded = proposals.reduce((acc, p) => acc + Number(p.budget_amount.length > 0 ? p.budget_amount[0] : 0), 0);
    const active_projects = proposals.filter(p => 'Active' in p.status).length;
    
    const fairness_scores = proposals
      .filter(p => p.fairness_score.length > 0)
      .map(p => p.fairness_score[0]!);
    
    const average_ai_integrity_score = fairness_scores.length > 0 
      ? Math.round(fairness_scores.reduce((a, b) => a + b, 0) / fairness_scores.length)
      : 88;

    return {
      success: true,
      stats: {
        total_funded,
        active_projects,
        verified_users: 12400, 
        average_ai_integrity_score
      }
    };
  } catch (error) {
    console.error("Failed to fetch global stats:", error);
    return { success: false, error: "Failed to load platform statistics." };
  }
}
