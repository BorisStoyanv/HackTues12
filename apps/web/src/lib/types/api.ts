import { Principal } from '@dfinity/principal';

export interface User {
  principal: Principal;
  reputation: bigint;
  joinedAt: bigint;
}

export interface Proposal {
  id: string;
  creator: Principal;
  title: string;
  description: string;
  status: string;
  createdAt: bigint;
}

export interface AIReport {
  proposalId: string;
  summary: string;
  score: bigint;
  verdict: string;
  timestamp: bigint;
}

export interface BackendService {
  registerUser(): Promise<User>;
  getSelf(): Promise<[User] | []>;
  createProposal(title: string, description: string): Promise<Proposal>;
  getAllProposals(): Promise<Proposal[]>;
  getProposalById(id: string): Promise<[Proposal] | []>;
  submitAIReport(proposalId: string, summary: string, score: bigint, verdict: string): Promise<boolean>;
  getReportByProposalId(proposalId: string): Promise<[AIReport] | []>;
  health(): Promise<string>;
}
