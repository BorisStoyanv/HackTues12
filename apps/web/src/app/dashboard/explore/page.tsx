"use client";

import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";

export default function DashboardExplorePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProposalExplorer 
        mode="authenticated" 
        proposals={MOCK_FEATURED_PROPOSALS} 
      />
    </div>
  );
}
