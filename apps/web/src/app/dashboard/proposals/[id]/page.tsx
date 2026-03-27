"use client";

import { useEffect, useState } from "react";
import {
  fetchProposalById,
  fetchProposalVotes,
  SerializedProposal,
  SerializedVote,
} from "@/lib/actions/proposals";
import { ProposalView } from "@/components/proposals/proposal-view";
import { useParams } from "next/navigation";

export default function DashboardProposalDetailPage() {
  const { id } = useParams();
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(
    undefined,
  );
  const [votes, setVotes] = useState<SerializedVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof id !== "string") return;

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

  if (typeof id !== "string") {
    return null;
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
