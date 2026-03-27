"use client";

import { useParams } from "next/navigation";
import { ProposalView } from "@/components/proposals/proposal-view";
import {
  fetchProposalById,
  fetchProposalVotes,
  SerializedProposal,
  SerializedVote,
} from "@/lib/actions/proposals";
import { useEffect, useState } from "react";

export default function PublicProposalDetailPage() {
  const { id } = useParams();
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(
    undefined,
  );
  const [votes, setVotes] = useState<SerializedVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof id === "string") {
      Promise.all([fetchProposalById(id), fetchProposalVotes(id)]).then(
        ([proposalResult, votesResult]) => {
          if (proposalResult.success) setProposal(proposalResult.proposal);
          if (votesResult.success) setVotes(votesResult.votes);
          setIsLoading(false);
        },
      );
    }
  }, [id]);

  if (typeof id !== "string") return null;

  return (
    <div className="min-h-screen bg-background">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <ProposalView
          id={id}
          mode="public"
          initialData={proposal}
          votes={votes}
        />
      )}
    </div>
  );
}
