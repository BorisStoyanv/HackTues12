import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Principal } from '@dfinity/principal';
import { fetchAllProposals, fetchProposalById } from '../actions/proposals';
import { submitProposalClient } from './client-mutations';

// Mock the icp.ts file which creates the actor
vi.mock('./icp', () => ({
  createBackendActor: vi.fn(),
}));

import { createBackendActor } from './icp';

describe('API Service Layer', () => {
  const mockPrincipal = Principal.fromText('aaaaa-aa');
  
  const mockProposal = {
    id: 'prop-1',
    creator: mockPrincipal,
    title: 'Test Proposal',
    short_description: 'Short desc',
    problem_statement: 'Problem',
    success_metric: 'Metric',
    location: {
      lat: 10,
      lng: 20,
      city: 'Sofia',
      country: 'Bulgaria',
      formatted_address: 'Address',
    },
    funding_goal: BigInt(1000),
    current_funding: BigInt(500),
    status: 'voting',
    created_at: BigInt(1711450000000000),
    updated_at: BigInt(1711450000000000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Actions (Queries)', () => {
    it('fetchAllProposals should fetch and serialize proposals', async () => {
      const mockActor = {
        list_proposals: vi.fn().mockResolvedValue([mockProposal]),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const result = await fetchAllProposals();

      expect(result.success).toBe(true);
      expect(result.proposals).toHaveLength(1);
      // Verify serialization (BigInt -> Number, Principal -> String)
      expect(typeof result.proposals![0].funding_goal).toBe('number');
      expect(typeof result.proposals![0].creator).toBe('string');
      expect(result.proposals![0].creator).toBe(mockPrincipal.toString());
    });

    it('fetchProposalById should return a serialized proposal', async () => {
      const mockActor = {
        get_proposal: vi.fn().mockResolvedValue([mockProposal]),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const result = await fetchProposalById('prop-1');

      expect(result.success).toBe(true);
      expect(result.proposal?.id).toBe('prop-1');
      expect(result.proposal?.funding_goal).toBe(1000);
    });

    it('fetchProposalById should return error if not found', async () => {
      const mockActor = {
        get_proposal: vi.fn().mockResolvedValue([]),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const result = await fetchProposalById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Proposal not found.');
    });
  });

  describe('Client Mutations (Updates)', () => {
    it('submitProposalClient should call the canister with correct data', async () => {
      const mockActor = {
        submit_proposal: vi.fn().mockResolvedValue(mockProposal),
      };
      (createBackendActor as any).mockResolvedValue(mockActor);

      const mockIdentity = {} as any;
      const proposalData = {
        title: 'New Prop',
        short_description: 'Desc',
        problem_statement: 'Prob',
        success_metric: 'Metric',
        location: mockProposal.location,
        funding_goal: BigInt(2000),
      };

      const result = await submitProposalClient(mockIdentity, proposalData);

      expect(createBackendActor).toHaveBeenCalledWith(mockIdentity);
      expect(mockActor.submit_proposal).toHaveBeenCalledWith(proposalData);
      expect(result.id).toBe('prop-1');
    });
  });
});
