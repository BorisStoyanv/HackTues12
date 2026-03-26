"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalVoteView } from "@/components/proposals/proposal-vote-view";
import { fetchProposalById, SerializedProposal } from "@/lib/actions/proposals";
import { useEffect, useState } from "react";

export default function PublicVotePage() {
  const { id } = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof id === "string") {
      fetchProposalById(id).then(res => {
        if (res.success) setProposal(res.proposal);
        setIsLoading(false);
      });
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
        <ProposalVoteView 
          id={id} 
          mode="public" 
          initialData={proposal}
          onBack={() => router.push(`/proposals/${id}`)} 
        />
      )}
    </div>
  );
}
