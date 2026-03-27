"use client";

import { useEffect, useState, Suspense } from "react";
import {
  fetchProposalById,
  fetchProposalVotes,
  SerializedProposal,
  SerializedVote,
} from "@/lib/actions/proposals";
import { ProposalView } from "@/components/proposals/proposal-view";
import { useSearchParams } from "next/navigation";

function ProposalDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(
    undefined,
  );
  const [votes, setVotes] = useState<SerializedVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    Promise.all([fetchProposalById(id), fetchProposalVotes(id)]).then(
      ([proposalResult, votesResult]) => {
        if (cancelled) return;
        setProposal(
          proposalResult.success ? proposalResult.proposal : undefined,
        );
        setVotes(votesResult.success ? votesResult.votes : []);
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h1 className="text-xl font-semibold">Missing Proposal ID</h1>
        <p className="text-muted-foreground text-sm">Please provide a valid proposal ID in the URL.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
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

export default function DashboardProposalDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <ProposalDetailContent />
    </Suspense>
  );
}
