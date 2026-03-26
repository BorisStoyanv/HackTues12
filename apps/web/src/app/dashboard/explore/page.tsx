"use client";

import { ProposalExplorer } from "@/components/explorer/proposal-explorer";

export default function DashboardExplorePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProposalExplorer mode="authenticated" />
    </div>
  );
}
