"use server";

import { createBackendActor } from "../api/icp";
import { Proposal } from "../types/api";

export interface SerializedProposal {
  id: string;
  submitter: string;
  creator: string; // Alias for submitter
  region_tag: string;
  title: string;
  description: string;
  short_description: string;
  problem_statement: string;
  category: string;
  budget_amount: number;
  funding_goal: number; // Alias for budget_amount
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
  updated_at: number; // Alias for created_at
  voting_ends_at: number;
  yes_weight: number;
  current_funding: number; // Alias for yes_weight
  no_weight: number;
  voter_count: number;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    formatted_address: string;
  };
  ai_integrity_report: {
    overall_score: number;
    fairness_score: number;
    efficiency_score: number;
    summary: string;
    risk_factors: string[];
    positive_externalities: string[];
  } | null;
  voting_metrics: {
    total_votes: number;
    quorum_reached: boolean;
    quorum_percentage: number;
    approval_percentage: number;
    voting_power_distribution: { experts: number; locals: number; general: number };
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
      lat: 50.0, // Default for now
      lng: 10.0, // Default for now
      city: proposal.region_tag,
      country: "Unknown",
      formatted_address: proposal.region_tag
    },
    ai_integrity_report: {
      overall_score: fairness,
      fairness_score: fairness,
      efficiency_score: 0,
      summary: "Backend analysis pending.",
      risk_factors: proposal.risk_flags,
      positive_externalities: []
    },
    voting_metrics: {
      total_votes: proposal.voter_count,
      quorum_reached: false,
      quorum_percentage: 0,
      approval_percentage: 0,
      voting_power_distribution: { experts: 0, locals: 0, general: 0 }
    }
  };
}

export async function fetchAllProposals(status?: string) {
  try {
    const actor = await createBackendActor();
    const proposals = await actor.list_proposals(status ? [{ [status]: null } as any] : []);
    return { 
      success: true, 
      proposals: proposals.map(serializeProposal)
    };
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return { success: false, proposals: [] };
  }
}

export async function fetchProposalById(id: string) {
  if (isNaN(Number(id))) {
    return { success: false, error: "Invalid ID format." };
  }

  try {
    const actor = await createBackendActor();
    const result = await actor.get_proposal(BigInt(id));
    
    if (result.length > 0) {
      return { success: true, proposal: serializeProposal(result[0]!) };
    }
    
    return { success: false, error: "Proposal not found." };
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return { success: false, error: "Backend communication error." };
  }
}

// Additional helper functions...
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
