"use server";

import { createBackendActor } from "../api/icp";
import { Proposal } from "../types/api";

// Helper to serialize BigInts and Principals for Next.js Server Actions
function serializeProposal(proposal: Proposal) {
  return {
    ...proposal,
    creator: proposal.creator.toString(),
    createdAt: Number(proposal.createdAt), // Convert bigint to number for safe client-side JSON serialization
  };
}

export async function fetchHealthStatus() {
  try {
    const actor = await createBackendActor();
    const status = await actor.health();
    return { success: true, status };
  } catch (error) {
    console.error("Failed to fetch health:", error);
    return { success: false, error: "Failed to connect to backend canister." };
  }
}

export async function fetchAllProposals() {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.getAllProposals();
    
    // Sort by newest first
    const sorted = proposals.sort((a: Proposal, b: Proposal) => Number(b.createdAt) - Number(a.createdAt));
    
    return { 
      success: true, 
      proposals: sorted.map(serializeProposal)
    };
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return { success: false, error: "Failed to fetch proposals from ledger." };
  }
}

export async function fetchProposalById(id: string) {
  try {
    const actor = await createBackendActor();
    const result = await actor.getProposalById(id);
    
    if (result.length > 0) {
      return { success: true, proposal: serializeProposal(result[0]!) };
    }
    
    return { success: false, error: "Proposal not found." };
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return { success: false, error: "Failed to fetch proposal details." };
  }
}

export async function fetchReportByProposalId(proposalId: string) {
  try {
    const actor = await createBackendActor();
    const result = await actor.getReportByProposalId(proposalId);
    
    if (result.length > 0) {
      const report = result[0]!;
      return { 
        success: true, 
        report: {
          proposalId: report.proposalId,
          summary: report.summary,
          score: Number(report.score),
          verdict: report.verdict,
          timestamp: Number(report.timestamp)
        }
      };
    }
    
    return { success: false, error: "Report not found." };
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return { success: false, error: "Failed to fetch report details." };
  }
}
