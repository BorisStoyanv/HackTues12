import { describe, it, expect, vi, beforeEach } from "vitest";
import { Principal } from "@dfinity/principal";
import { fetchAllProposals, fetchProposalById } from "../actions/proposals";
import { submitProposalClient } from "./client-mutations";
import { ProposalCategory } from "../types/api";

// Mock the icp.ts file which creates the actor
vi.mock("./icp", () => ({
  createBackendActor: vi.fn(),
}));

import { createBackendActor } from "./icp";

describe("API Service Layer", () => {
  const mockPrincipal = Principal.fromText("aaaaa-aa");

  const mockProposal = {
    id: BigInt(1),
    submitter: mockPrincipal,
    title: "Test Proposal",
    description: "A test description for the proposal",
    region_tag: "test_region",
    category: [{ Infrastructure: null }] as [ProposalCategory],
    budget_amount: [1000] as [number],
    budget_currency: ["USD"] as [string],
    budget_breakdown: ["Materials: 500, Labor: 500"] as [string],
    executor_name: ["Test Executor"] as [string],
    execution_plan: ["Step 1: Planning, Step 2: Execution"] as [string],
    timeline: ["6 months"] as [string],
    expected_impact: ["Positive impact on the community"] as [string],
    approved_company: [] as [],
    fairness_score: [85] as [number],
    risk_flags: [] as string[],
    status: { Active: null },
    created_at: BigInt(1711450000000000000),
    voting_ends_at: BigInt(1711550000000000000),
    yes_weight: 0,
    no_weight: 0,
    voter_count: 0,
    backed_by: [] as [Principal] | [],
    backed_at: [] as [bigint] | [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Server Actions (Queries)", () => {
    it("fetchAllProposals should fetch and serialize proposals", async () => {
      const mockActor = {
        list_proposals: vi.fn().mockResolvedValue([mockProposal]),
        get_region_total_vp: vi.fn().mockResolvedValue(250),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const result = await fetchAllProposals();

      expect(result.success).toBe(true);
      expect(result.proposals).toHaveLength(1);
      // Verify serialization
      expect(typeof result.proposals![0].budget_amount).toBe("number");
      expect(typeof result.proposals![0].creator).toBe("string");
      expect(result.proposals![0].creator).toBe(mockPrincipal.toString());
      expect(result.proposals![0].total_regional_vp).toBe(250);
    });

    it("fetchProposalById should return a serialized proposal", async () => {
      const mockActor = {
        get_proposal: vi.fn().mockResolvedValue([mockProposal]),
        get_region_total_vp: vi.fn().mockResolvedValue(125),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const result = await fetchProposalById("1");

      expect(result.success).toBe(true);
      expect(result.proposal?.id).toBe("1");
      expect(result.proposal?.budget_amount).toBe(1000);
      expect(result.proposal?.total_regional_vp).toBe(125);
    });
  });

  describe("Client Mutations (Updates)", () => {
    it("submitProposalClient should call the canister with correct data", async () => {
      const mockActor = {
        submit_proposal: vi.fn().mockResolvedValue({ Ok: mockProposal }),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const mockIdentity = {} as any;
      const proposalData = {
        title: "New Prop",
        description: "New Description",
        region_tag: "new_region",
        category: { Infrastructure: null } as ProposalCategory,
        budget_amount: 2000,
        budget_currency: "USD",
        budget_breakdown: "Breakdown text",
        executor_name: "New Executor",
        execution_plan: "Detailed execution plan text...",
        timeline: "12 months",
        expected_impact: "Community impact text...",
        approved_company: [] as [],
      };

      const result = await submitProposalClient(mockIdentity, proposalData);

      expect(createBackendActor).toHaveBeenCalledWith(mockIdentity);
      expect(mockActor.submit_proposal).toHaveBeenCalledWith(proposalData);
      expect(result.id).toBe(BigInt(1));
    });
  });
});
