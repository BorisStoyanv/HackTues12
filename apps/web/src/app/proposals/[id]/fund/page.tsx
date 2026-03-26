"use client";

import { useParams, useRouter } from "next/navigation";
import { ProposalFundView } from "@/components/proposals/proposal-fund-view";

export default function PublicFundPage() {
  const { id } = useParams();
  const router = useRouter();

  if (typeof id !== "string") return null;

  return (
    <ProposalFundView 
      id={id} 
      mode="public" 
      onBack={() => router.push(`/proposals/${id}`)} 
    />
  );
}
