"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ProposalFundView } from "@/components/proposals/proposal-fund-view";
import { useEffect, useState, Suspense } from "react";
import { fetchProposalById, SerializedProposal } from "@/lib/actions/proposals";

function FundContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const [proposal, setProposal] = useState<SerializedProposal | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProposalById(id).then(res => {
        if (res.success) setProposal(res.proposal);
        setIsLoading(false);
      });
    }
  }, [id]);

  if (!id) return null;

  return (
    <div className="h-full overflow-auto">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <ProposalFundView 
          id={id} 
          mode="authenticated" 
          initialData={proposal}
          onBack={() => router.push(`/dashboard/proposals/detail?id=${id}`)} 
        />
      )}
    </div>
  );
}

export default function DashboardFundPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <FundContent />
    </Suspense>
  );
}
