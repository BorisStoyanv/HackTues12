"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalFundView } from "@/components/proposals/proposal-fund-view";

export default function DashboardFundPage() {
  const { id } = useParams();
  const router = useRouter();

  if (typeof id !== "string") return null;

  return (
    <div className="h-full overflow-auto">
      <ProposalFundView 
        id={id} 
        mode="authenticated" 
        onBack={() => router.push(`/dashboard/proposals/${id}`)} 
      />
    </div>
  );
}
