"use client";

import { InteractiveMap } from "@/components/map/interactive-map";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Globe, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SerializedProposal } from "@/lib/actions/proposals";
import {
  formatPercent,
  getProposalVotingMetrics,
} from "@/lib/proposals/voting";

interface ProposalExplorerProps {
  proposals: SerializedProposal[];
  mode: "public" | "authenticated";
  searchQuery?: string;
}

export function ProposalExplorer({
  proposals,
  mode,
  searchQuery = "",
}: ProposalExplorerProps) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  );
  const [boundingBox, setBoundingBox] = useState<
    [number, number, number, number] | null
  >(null);

  const linkPrefix =
    mode === "authenticated" ? "/dashboard/proposals" : "/proposals";

  // Filter proposals based on bounding box and search query
  const visibleProposals = useMemo(() => {
    let filtered = proposals;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.location?.city || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    if (boundingBox) {
      const [west, south, east, north] = boundingBox;
      filtered = filtered.filter((p) => {
        const { lng, lat } = p.location;
        return lng >= west && lng <= east && lat >= south && lat <= north;
      });
    }

    return filtered;
  }, [proposals, boundingBox, searchQuery]);

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId),
    [proposals, selectedProposalId],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background md:flex-row">
      {/* Proposal List Pane */}
      <aside className="z-10 flex h-[40svh] min-h-0 w-full flex-col overflow-hidden border-b border-neutral-200 bg-background shadow-2xl dark:border-neutral-800 md:h-full md:w-[26rem] md:shrink-0 md:border-b-0 md:border-r">
        <div className="shrink-0 border-b bg-neutral-50/50 p-6 dark:bg-neutral-950/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Protocol Nodes
              </h2>
              <p className="text-xl font-black tracking-tight">
                Active Proposals
              </p>
            </div>
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 font-mono font-bold bg-background border-primary/20 text-primary shadow-sm"
            >
              {visibleProposals.length}
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {visibleProposals.length > 0 ? (
              visibleProposals.map((proposal) =>
                (() => {
                  const votingMetrics = getProposalVotingMetrics(proposal);
                  const primaryValue =
                    proposal.status === "Active"
                      ? `${formatPercent(votingMetrics.supportPercent, 0)} support`
                      : `$${proposal.current_funding.toLocaleString()}`;
                  const primaryProgress =
                    proposal.status === "Active"
                      ? votingMetrics.supportPercent
                      : (proposal.funding_goal ?? 0) > 0
                        ? Math.min(
                            100,
                            (proposal.current_funding /
                              (proposal.funding_goal ?? 1)) *
                              100,
                          )
                        : 0;

                  return (
                    <div
                      key={proposal.id}
                      onClick={() => setSelectedProposalId(proposal.id)}
                      className={cn(
                        "p-6 cursor-pointer transition-all duration-300 border-l-4 border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50",
                        selectedProposalId === proposal.id &&
                          "bg-neutral-50 dark:bg-neutral-900 border-l-primary shadow-inner",
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-base line-clamp-1 tracking-tight">
                          {proposal.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border-neutral-200 dark:border-neutral-800"
                        >
                          {proposal.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed font-medium">
                        {proposal.short_description || proposal.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-sm text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                            <Users className="h-3 w-3" />
                            {proposal.voter_count || 0}
                          </div>
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 rounded-sm text-[10px] font-black text-blue-500 uppercase tracking-tighter">
                            <ShieldCheck className="h-3 w-3" />
                            {proposal.fairness_score || 0}%
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-black font-mono">
                            {primaryValue}
                          </span>
                          <div className="h-1 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-primary shadow-[0_0_5px_rgba(var(--primary-rgb),0.5)]"
                              style={{
                                width: `${primaryProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })(),
              )
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="h-16 w-16 bg-neutral-50 dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto opacity-40">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    No results in this region
                  </p>
                  <p className="text-xs text-muted-foreground px-6">
                    Adjust the map viewport or clear your search criteria to
                    find projects.
                  </p>
                </div>
                {mode === "authenticated" && (
                  <Link
                    href="/dashboard/proposals/new"
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                        size: "sm",
                      }),
                      "mt-4 h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px]",
                    )}
                  >
                    Initialize New Protocol
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Selected Detail Overlay */}
        {selectedProposal && (
          <div className="shrink-0 border-t border-neutral-200 bg-neutral-50/80 p-6 backdrop-blur-xl animate-in slide-in-from-bottom-full duration-500 dark:border-neutral-800 dark:bg-neutral-950/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">
                Selected Node
              </span>
              <button
                className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full transition-colors"
                onClick={() => setSelectedProposalId(null)}
              >
                <div className="text-xl">×</div>
              </button>
            </div>
            <h4 className="font-black text-xl mb-2 tracking-tight leading-tight">
              {selectedProposal.title}
            </h4>
            <div className="flex items-center gap-2 mb-6">
              <Badge className="bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
                {selectedProposal.status}
              </Badge>
              <span className="text-[11px] font-bold text-muted-foreground truncate uppercase tracking-widest">
                {selectedProposal.region_tag} Impact Zone
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`${linkPrefix}/${selectedProposal.id}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full h-14 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20",
                )}
              >
                Inspect Data Pack
              </Link>
              <div className="flex h-14 items-center justify-center rounded-xl border border-border bg-muted/40 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                Vote inside proposal
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Map Canvas */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <InteractiveMap
          proposals={proposals}
          selectedProposalId={selectedProposalId}
          onProposalSelect={setSelectedProposalId}
          onBoundingBoxChange={setBoundingBox}
          linkPrefix={linkPrefix}
        />

        {/* Subtle overlay elements for map */}
        <div className="absolute top-6 left-6 z-20 pointer-events-none">
          <div className="bg-background/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-2xl space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Geographic Ledger
            </p>
            <p className="text-sm font-bold">Consensus Mapping v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
