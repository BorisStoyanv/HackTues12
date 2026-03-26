import { createBackendActor } from "./icp";
import { Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { Proposal, UserProfile, Location, ContractRecord } from "../types/api";

/**
 * These utilities are designed to be run on the client side because they require 
 * the user's cryptographic Identity (from Internet Identity) to sign the transactions.
 */

// --- User Mutations ---

export async function createMyProfileClient(identity: Identity): Promise<UserProfile> {
  const actor = await createBackendActor(identity);
  return await actor.create_my_profile();
}

export async function updateMyProfileClient(
  identity: Identity, 
  username: string, 
  region?: string
): Promise<UserProfile> {
  const actor = await createBackendActor(identity);
  return await actor.update_my_profile({ 
    username, 
    region: region ? [region] : [] 
  });
}

export async function requestVerificationClient(identity: Identity, data: string): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.request_verification(data);
}

export async function adminVerifyInvestorClient(identity: Identity, principal: Principal): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.admin_verify_investor(principal);
}

// --- Proposal Mutations ---

export async function submitProposalClient(
  identity: Identity,
  data: {
    title: string;
    short_description: string;
    problem_statement: string;
    success_metric: string;
    location: Location;
    funding_goal: bigint;
  }
): Promise<Proposal> {
  const actor = await createBackendActor(identity);
  return await actor.submit_proposal(data);
}

export async function castVoteClient(
  identity: Identity,
  proposalId: string,
  voteType: string
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.cast_vote(proposalId, voteType);
}

export async function finalizeProposalClient(identity: Identity, proposalId: string): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.finalize_proposal(proposalId);
}

export async function backProposalClient(
  identity: Identity,
  proposalId: string,
  amount: bigint
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.back_proposal(proposalId, amount);
}

// --- Contract Mutations ---

export async function createContractRecordClient(
  identity: Identity, 
  proposalId: string, 
  investor: Principal
): Promise<ContractRecord> {
  const actor = await createBackendActor(identity);
  return await actor.create_contract_record(proposalId, investor);
}

export async function investorAckContractClient(identity: Identity, contractId: string): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.investor_ack_contract(contractId);
}

export async function companyAckContractClient(identity: Identity, contractId: string): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.company_ack_contract(contractId);
}

export async function recordExternalSignatureStatusClient(
  identity: Identity, 
  contractId: string, 
  status: string
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.record_external_signature_status(contractId, status);
}
