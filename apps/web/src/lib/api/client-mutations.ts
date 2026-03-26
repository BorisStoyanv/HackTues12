import { createBackendActor } from "./icp";
import { Identity } from "@dfinity/agent";
import { Proposal, User, AIReport } from "../types/api";

/**
 * These utilities are designed to be run on the client side (e.g., inside an onClick handler)
 * because they require the user's cryptographic Identity (from Internet Identity)
 * to sign the transactions.
 */

export async function registerUserClient(identity: Identity): Promise<User> {
  const actor = await createBackendActor(identity);
  return await actor.registerUser();
}

export async function fetchSelfClient(identity: Identity): Promise<User | null> {
  const actor = await createBackendActor(identity);
  const result = await actor.getSelf();
  return result.length > 0 ? result[0]! : null;
}

export async function createProposalClient(
  identity: Identity, 
  title: string, 
  description: string
): Promise<Proposal> {
  const actor = await createBackendActor(identity);
  return await actor.createProposal(title, description);
}

export async function submitAIReportClient(
  identity: Identity,
  proposalId: string,
  summary: string,
  score: bigint,
  verdict: string
): Promise<boolean> {
  const actor = await createBackendActor(identity);
  return await actor.submitAIReport(proposalId, summary, score, verdict);
}
