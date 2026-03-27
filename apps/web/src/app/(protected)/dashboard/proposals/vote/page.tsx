"use client";

import { useSearchParams } from "next/navigation";
import { ProposalView } from "@/components/proposals/proposal-view";
import {
  fetchProposalById,
  fetchProposalVotes,
  SerializedProposal,
  SerializedVote,
} from "@/lib/actions/proposals";
import { useEffect, useState, Suspense } from "react";

function VoteContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(
    undefined,
  );
  const [votes, setVotes] = useState<SerializedVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([fetchProposalById(id), fetchProposalVotes(id)]).then(
        ([proposalResult, votesResult]) => {
          if (proposalResult.success) setProposal(proposalResult.proposal);
          if (votesResult.success) setVotes(votesResult.votes);
          setIsLoading(false);
        },
      );
    }
  }, [id]);

  if (!id) return null;

  return (
    <div className="h-full overflow-auto">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <ProposalView
          id={id}
          mode="authenticated"
          initialData={proposal}
          votes={votes}
        />
      )}
    </div>
  );
}

export default function DashboardVotePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <VoteContent />
    </Suspense>
  );
}
