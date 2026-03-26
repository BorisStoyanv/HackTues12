"use server";

import { createBackendActor } from "../api/icp";
import { Proposal, Vote, ContractRecord, AuditLog, Config } from "../types/api";

function serializeProposal(proposal: Proposal) {
  // Convert Variant status to string
  const statusKey = Object.keys(proposal.status)[0];
  
  return {
    ...proposal,
    id: proposal.id.toString(),
    creator: proposal.submitter.toString(),
    budget_amount: proposal.budget_amount.length > 0 ? Number(proposal.budget_amount[0]) : 0,
    budget_currency: proposal.budget_currency.length > 0 ? proposal.budget_currency[0] : 'USD',
    funding_goal: proposal.budget_amount.length > 0 ? Number(proposal.budget_amount[0]) : 0,
    current_funding: proposal.yes_weight, 
    created_at: Number(proposal.created_at),
    updated_at: Number(proposal.created_at),
    status: statusKey || 'Active',
    tags: proposal.risk_flags || [],
    description: proposal.description,
    short_description: proposal.description.substring(0, 160),
    problem_statement: proposal.description,
    // Provide fallback location if missing from record (canister doesn't have it yet)
    location: {
      lat: 50.0,
      lng: 10.0,
      city: proposal.region_tag,
      country: "Unknown",
      formatted_address: proposal.region_tag
    },
    execution_plan: proposal.execution_plan.length > 0 ? proposal.execution_plan[0] : "",
    timeline: proposal.timeline.length > 0 ? proposal.timeline[0] : "",
    expected_impact: proposal.expected_impact.length > 0 ? proposal.expected_impact[0] : "",
    ai_integrity_report: proposal.fairness_score.length > 0 ? {
      overall_score: proposal.fairness_score[0],
      fairness_score: proposal.fairness_score[0],
      efficiency_score: 0,
      summary: "Backend analysis pending.",
      risk_factors: proposal.risk_flags,
      positive_externalities: []
    } : null,
    voting_metrics: {
      total_votes: proposal.voter_count,
      quorum_reached: false,
      quorum_percentage: 0,
      approval_percentage: 0,
      voting_power_distribution: { experts: 0, locals: 0, general: 0 }
    }
  };
}

export type SerializedProposal = ReturnType<typeof serializeProposal>;

function serializeVote(vote: Vote) {
  return {
    ...vote,
    voter: vote.voter.toString(),
    weight: Number(vote.weight),
    timestamp: Number(vote.timestamp),
  };
}

function serializeContract(contract: ContractRecord) {
  return {
    ...contract,
    investor_principal: contract.investor_principal.toString(),
    created_by: contract.created_by.toString(),
    created_at: Number(contract.created_at),
    updated_at: Number(contract.updated_at),
  };
}

function serializeAuditLog(log: AuditLog) {
  return {
    ...log,
    caller: log.actor.toString(),
    timestamp: Number(log.timestamp),
  };
}

export async function fetchAllProposals() {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.list_proposals([]); 
    
    return { 
      success: true, 
      proposals: proposals.map(serializeProposal)
    };
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return { success: false, error: "Failed to fetch proposals from ledger." };
  }
}

export async function fetchProposalById(id: string) {
  try {
    const actor = await createBackendActor();
    const result = await actor.get_proposal(BigInt(id));
    
    if (result.length > 0) {
      return { success: true, proposal: serializeProposal(result[0]!) };
    }
    
    return { success: false, error: "Proposal not found." };
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return { success: false, error: "Failed to fetch proposal details." };
  }
}

export async function fetchProposalVotes(id: string) {
  try {
    const actor = await createBackendActor();
    const votes = await actor.get_proposal_votes(BigInt(id));
    return { success: true, votes: votes.map(serializeVote) };
  } catch (error) {
    console.error("Failed to fetch votes:", error);
    return { success: false, error: "Failed to fetch proposal votes." };
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

export async function fetchContractRecord(id: string) {
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

export async function fetchAllContracts() {
  try {
    const actor = await createBackendActor();
    const contracts = await actor.list_contracts([]);
    return { success: true, contracts: contracts.map(serializeContract) };
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return { success: false, error: "Failed to fetch contract list." };
  }
}

export async function fetchAuditLogs(limit = 10, offset = 0) {
  try {
    const actor = await createBackendActor();
    const logs = await actor.get_audit_log(limit, offset);
    return { success: true, logs: logs.map(serializeAuditLog) };
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, error: "Failed to fetch audit log." };
  }
}

export async function fetchConfig() {
  try {
    const actor = await createBackendActor();
    const config = await actor.get_config();
    return { 
      success: true, 
      config: {
        voting_period_ns: config.voting_period_ns.toString(),
        quorum_percent: config.quorum_percent,
        quorum_min_region_size: config.quorum_min_region_size,
        majority_threshold: config.majority_threshold,
        absolute_majority: config.absolute_majority
      } 
    };
  } catch (error) {
    console.error("Failed to fetch config:", error);
    return { success: false, error: "Failed to fetch platform configuration." };
  }
}
