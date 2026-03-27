"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SerializedProposal } from "@/lib/actions/proposals";
import { createBackendActor } from "@/lib/api/icp";
import {
  castVoteClient,
  finalizeProposalClient,
} from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";
import { isProposalClosable } from "@/lib/proposals/voting";

interface ViewerProposalProfile {
  reputation: number;
  homeRegion: string | null;
  isLocalVerified: boolean;
  userType: "User" | "InvestorUser";
}

interface ViewerVote {
  inFavor: boolean;
  weight: number;
  timestamp: number;
}

function parseUserType(userType: {
  User?: null;
  InvestorUser?: null;
}): ViewerProposalProfile["userType"] {
  return "InvestorUser" in userType ? "InvestorUser" : "User";
}

export function useProposalGovernance(proposal?: SerializedProposal) {
  const router = useRouter();
  const identity = useAuthStore((state) => state.identity);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [viewerProfile, setViewerProfile] =
    useState<ViewerProposalProfile | null>(null);
  const [viewerVote, setViewerVote] = useState<ViewerVote | null>(null);
  const [viewerVotingPower, setViewerVotingPower] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isClosingProposal, setIsClosingProposal] = useState(false);

  useEffect(() => {
    if (!proposal || proposal.status !== "Active") {
      return;
    }

    const deadlineMs = proposal.voting_ends_at / 1_000_000;
    const timeoutMs = Math.max(
      1_500,
      Math.ceil(deadlineMs - Date.now() + 1_000),
    );
    const timer = window.setTimeout(() => {
      router.refresh();
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [proposal?.status, proposal?.voting_ends_at, router]);

  useEffect(() => {
    if (!proposal || !identity || !isAuthenticated) {
      setViewerProfile(null);
      setViewerVote(null);
      setViewerVotingPower(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setVoteError(null);
    setCloseError(null);

    createBackendActor(identity)
      .then(async (actor) => {
        const [profileResult, voteResult, vpResult] = await Promise.all([
          actor.get_my_profile(),
          actor.get_my_vote(BigInt(proposal.id)),
          actor.get_my_vp(proposal.region_tag),
        ]);

        if (cancelled) {
          return;
        }

        setViewerProfile(
          profileResult.length > 0
            ? {
                reputation: Number(profileResult[0]!.reputation),
                homeRegion:
                  profileResult[0]!.home_region.length > 0
                    ? profileResult[0]!.home_region[0]!
                    : null,
                isLocalVerified: profileResult[0]!.is_local_verified,
                userType: parseUserType(profileResult[0]!.user_type),
              }
            : null,
        );

        setViewerVote(
          voteResult.length > 0
            ? {
                inFavor: voteResult[0]!.in_favor,
                weight: Number(voteResult[0]!.weight),
                timestamp: Number(voteResult[0]!.timestamp),
              }
            : null,
        );

        setViewerVotingPower("Ok" in vpResult ? Number(vpResult.Ok) : null);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load proposal governance state:", error);
          setViewerProfile(null);
          setViewerVote(null);
          setViewerVotingPower(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [identity, isAuthenticated, proposal?.id, proposal?.region_tag]);

  const isLocallyVerified = useMemo(() => {
    if (!proposal || !viewerProfile?.homeRegion) {
      return false;
    }

    return (
      viewerProfile.isLocalVerified &&
      viewerProfile.homeRegion.toLowerCase() ===
        proposal.region_tag.toLowerCase()
    );
  }, [proposal, viewerProfile]);

  const voteDisabledReason = useMemo(() => {
    if (!proposal) {
      return "Proposal data is unavailable.";
    }
    if (proposal.status !== "Active") {
      return "Voting is closed for this proposal.";
    }
    if (!identity || !isAuthenticated) {
      return "Sign in with Internet Identity to vote.";
    }
    if (isLoading) {
      return "Checking your voting eligibility.";
    }
    if (!viewerProfile) {
      return "Create your community profile before voting.";
    }
    if (viewerProfile.userType !== "User") {
      return "Only community users can vote on proposals.";
    }
    if (viewerVote) {
      return `You already voted ${viewerVote.inFavor ? "Yes" : "No"} on this proposal.`;
    }
    return null;
  }, [
    identity,
    isAuthenticated,
    isLoading,
    proposal,
    viewerProfile,
    viewerVote,
  ]);

  const canCloseProposal = useMemo(() => {
    if (!proposal || !identity || !isAuthenticated) {
      return false;
    }
    return isProposalClosable(proposal);
  }, [identity, isAuthenticated, proposal]);

  const handleVote = async (inFavor: boolean) => {
    if (!proposal || !identity || voteDisabledReason) {
      return;
    }

    setVoteError(null);
    setIsSubmittingVote(true);

    try {
      const result = await castVoteClient(identity, proposal.id, inFavor);
      setViewerVote({
        inFavor: result.in_favor,
        weight: Number(result.weight),
        timestamp: Number(result.timestamp),
      });
      router.refresh();
    } catch (error) {
      console.error("Vote submission failed:", error);
      setVoteError(
        error instanceof Error ? error.message : "Failed to record your vote.",
      );
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleCloseProposal = async () => {
    if (!proposal || !identity || !canCloseProposal) {
      return;
    }

    setCloseError(null);
    setIsClosingProposal(true);

    try {
      await finalizeProposalClient(identity, proposal.id);
      router.refresh();
    } catch (error) {
      console.error("Proposal finalization failed:", error);
      setCloseError(
        error instanceof Error
          ? error.message
          : "Failed to close this proposal.",
      );
    } finally {
      setIsClosingProposal(false);
    }
  };

  return {
    canCloseProposal,
    closeError,
    handleCloseProposal,
    handleVote,
    isClosingProposal,
    isLoading,
    isLocallyVerified,
    isSubmittingVote,
    viewerProfile,
    viewerVote,
    viewerVotingPower,
    voteDisabledReason,
    voteError,
  };
}
