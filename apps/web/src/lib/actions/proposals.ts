"use server";

import { createBackendActor } from "../api/icp";
import { Proposal, Vote, ContractRecord, AuditLog, Config } from "../types/api";

function serializeProposal(proposal: Proposal) {
  return {
    ...proposal,
    creator: proposal.creator.toString(),
    funding_goal: Number(proposal.funding_goal),
    current_funding: Number(proposal.current_funding),
    created_at: Number(proposal.created_at),
    updated_at: Number(proposal.updated_at),
    // Ensure nested objects are handled or defaulted
    tags: proposal.tags || [],
    ai_integrity_report: proposal.ai_integrity_report || null,
    voting_metrics: proposal.voting_metrics || {
      total_votes: 0,
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
    investor: contract.investor.toString(),
    company: contract.company.toString(),
    created_at: Number(contract.created_at),
  };
}

function serializeAuditLog(log: AuditLog) {
  return {
    ...log,
    caller: log.caller.toString(),
    timestamp: Number(log.timestamp),
  };
}

export async function fetchAllProposals() {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.list_proposals();
    
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
    const result = await actor.get_proposal(id);
    
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
    const votes = await actor.get_proposal_votes(id);
    return { success: true, votes: votes.map(serializeVote) };
  } catch (error) {
    console.error("Failed to fetch votes:", error);
    return { success: false, error: "Failed to fetch proposal votes." };
  }
}

export async function fetchProposalPhase(id: string) {
  try {
    const actor = await createBackendActor();
    const phase = await actor.get_proposal_phase(id);
    return { success: true, phase };
  } catch (error) {
    console.error("Failed to fetch proposal phase:", error);
    return { success: false, error: "Failed to fetch proposal phase." };
  }
}

export async function fetchContractRecord(id: string) {
  try {
    const actor = await createBackendActor();
    const result = await actor.get_contract_record(id);
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
    const contracts = await actor.list_contracts();
    return { success: true, contracts: contracts.map(serializeContract) };
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return { success: false, error: "Failed to fetch contract list." };
  }
}

export async function fetchAuditLogs() {
  try {
    const actor = await createBackendActor();
    const logs = await actor.get_audit_log();
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
        min_quorum: Number(config.min_quorum),
        governance_token: config.governance_token.length > 0 ? config.governance_token[0]!.toString() : null
      } 
    };
  } catch (error) {
    console.error("Failed to fetch config:", error);
    return { success: false, error: "Failed to fetch platform configuration." };
  }
}
