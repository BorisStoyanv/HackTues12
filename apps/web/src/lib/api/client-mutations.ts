import { createBackendActor } from "./icp";
import { Identity } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import { Proposal, UserProfile, Location, ContractRecord, UserType, ProposalCategory } from "../types/api";

/**
 * Handles Result<T> from backend and throws on error
 */
async function handleResult<T>(result: { Ok: T } | { Err: string }): Promise<T> {
  if ('Ok' in result) return result.Ok;
  throw new Error(result.Err);
}

export async function createMyProfileClient(
  identity: Identity, 
  displayName: string, 
  userType: UserType, 
  homeRegion: string | null
): Promise<UserProfile> {
  const actor = await createBackendActor(identity);
  const result = await actor.create_my_profile({
    display_name: displayName,
    user_type: userType,
    home_region: homeRegion ? [homeRegion] : [],
  });
  return handleResult(result);
}

export async function updateMyProfileClient(
  identity: Identity, 
  displayName: string, 
  homeRegion: string | null
): Promise<UserProfile> {
  const actor = await createBackendActor(identity);
  const result = await actor.update_my_profile({
    display_name: displayName,
    home_region: homeRegion ? [homeRegion] : [],
  });
  return handleResult(result);
}

export async function requestVerificationClient(identity: Identity): Promise<boolean> {
  const actor = await createBackendActor(identity);
  const result = await actor.request_verification();
  await handleResult(result);
  return true;
}

export async function adminVerifyInvestorClient(identity: Identity, principal: Principal): Promise<boolean> {
  const actor = await createBackendActor(identity);
  const result = await actor.admin_verify_investor(principal);
  await handleResult(result);
  return true;
}

export async function submitProposalClient(
  identity: Identity, 
  data: {
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
  }
): Promise<Proposal> {
  const actor = await createBackendActor(identity);
  const result = await actor.submit_proposal(data);
  return handleResult(result);
}

export async function castVoteClient(
  identity: Identity, 
  proposalId: string, 
  inFavor: boolean
): Promise<any> {
  const actor = await createBackendActor(identity);
  const result = await actor.cast_vote(BigInt(proposalId), inFavor);
  return handleResult(result);
}

export async function finalizeProposalClient(identity: Identity, proposalId: string): Promise<Proposal> {
  const actor = await createBackendActor(identity);
  const result = await actor.finalize_proposal(BigInt(proposalId));
  return handleResult(result);
}

export async function backProposalClient(
  identity: Identity, 
  proposalId: string
): Promise<Proposal> {
  const actor = await createBackendActor(identity);
  const result = await actor.back_proposal(BigInt(proposalId));
  return handleResult(result);
}

export async function createContractRecordClient(
  identity: Identity, 
  proposalId: string, 
  input: any
): Promise<ContractRecord> {
  const actor = await createBackendActor(identity);
  const result = await actor.create_contract_record(BigInt(proposalId), input);
  return handleResult(result);
}

export async function investorAckContractClient(identity: Identity, contractId: string): Promise<boolean> {
  const actor = await createBackendActor(identity);
  const result = await actor.investor_ack_contract(BigInt(contractId));
  await handleResult(result);
  return true;
}

export async function companyAckContractClient(identity: Identity, contractId: string): Promise<boolean> {
  const actor = await createBackendActor(identity);
  const result = await actor.company_ack_contract(BigInt(contractId));
  await handleResult(result);
  return true;
}

export async function recordExternalSignatureStatusClient(
  identity: Identity, 
  contractId: string, 
  status: any
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  const result = await actor.record_external_signature_status(BigInt(contractId), status);
  await handleResult(result);
  return true;
}
