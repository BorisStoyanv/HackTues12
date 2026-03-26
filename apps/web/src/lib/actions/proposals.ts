"use server";

import { createBackendActor } from "../api/icp";
import { Proposal, AuditLog, ContractRecord, Config, Vote } from "../types/api";

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

// Map region tags to base coordinates
const REGION_COORDINATES: Record<string, { lat: number; lng: number; country: string }> = {
  'sofia': { lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
  'sofia_urban': { lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
  'sofia_center': { lat: 42.6977, lng: 23.3219, country: "Bulgaria" },
  'plovdiv': { lat: 42.1354, lng: 24.7453, country: "Bulgaria" },
  'varna': { lat: 43.2141, lng: 27.9147, country: "Bulgaria" },
  'burgas': { lat: 42.5048, lng: 27.4626, country: "Bulgaria" },
  'nairobi': { lat: -1.2921, lng: 36.8219, country: "Kenya" },
  'london': { lat: 51.5074, lng: -0.1278, country: "UK" },
  'new_york': { lat: 40.7128, lng: -74.0060, country: "USA" },
  'global': { lat: 20.0, lng: 0.0, country: "Multiple" },
};

/**
 * Deterministic jitter based on an ID (bigint)
 * Returns a value between -0.01 and 0.01
 */
function getJitter(id: bigint): number {
  return (Number(id % BigInt(1000)) / 50000) - 0.01;
}

function serializeProposal(proposal: Proposal): SerializedProposal {
  const statusKey = Object.keys(proposal.status)[0] || 'Active';
  const budget = proposal.budget_amount.length > 0 ? Number(proposal.budget_amount[0]) : 0;
  const yesWeight = proposal.yes_weight;
  const fairness = proposal.fairness_score.length > 0 ? proposal.fairness_score[0]! : 0;
  
  // Resolve location from region tag
  const regionKey = proposal.region_tag.toLowerCase();
  const baseCoords = REGION_COORDINATES[regionKey] || REGION_COORDINATES['global']!;
  
  // Apply jitter so markers don't overlap if they share a region tag
  const lat = baseCoords.lat + getJitter(proposal.id);
  const lng = baseCoords.lng + getJitter(proposal.id + BigInt(1));

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
      lat,
      lng,
      city: proposal.region_tag,
      country: baseCoords.country,
      formatted_address: `${proposal.region_tag}, ${baseCoords.country}`
    }
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
    const [proposals, principal] = await Promise.all([
      actor.list_proposals([]),
      actor.whoami()
    ]);
    const principalStr = principal.toString();
    const filtered = proposals.filter(p => p.submitter.toString() === principalStr);
    return { success: true, proposals: filtered.map(serializeProposal) };
  } catch (error) {
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
    return { 
      success: true, 
      votes: votes.map(v => ({
        ...v,
        voter: v.voter.toString(),
        weight: Number(v.weight),
        timestamp: Number(v.timestamp),
      })) 
    };
  } catch (error) {
    console.error("Failed to fetch votes:", error);
    return { success: false, votes: [] };
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
  if (isNaN(Number(id))) return { success: false, error: "Invalid ID" };
  try {
    const actor = await createBackendActor();
    const result = await actor.get_contract_record(BigInt(id));
    if (result.length > 0) return { success: true, contract: serializeContract(result[0]!) };
    return { success: false, error: "Contract not found" };
  } catch (error) {
    return { success: false, error: "Error fetching contract" };
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
        voting_period_ns: Number(config.voting_period_ns)
      } 
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch config" };
  }
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
    status: Object.keys(c.status)[0],
    created_at: Number(c.created_at),
    updated_at: Number(c.updated_at),
    document_uri: c.document_uri,
  };
}
