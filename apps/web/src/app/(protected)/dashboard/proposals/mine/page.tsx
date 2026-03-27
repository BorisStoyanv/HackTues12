"use client";

import { useEffect, useState } from "react";
import { Briefcase, Clock, Gavel, MapPin } from "lucide-react";
import Link from "next/link";

import { fetchMyProposals, SerializedProposal } from "@/lib/actions/proposals";
import { useAuthStore } from "@/lib/auth-store";
import {
  formatPercent,
  getProposalVotingMetrics,
} from "@/lib/proposals/voting";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function MyProposalsPage() {
  const [proposals, setProposals] = useState<SerializedProposal[]>([]);
  const principal = useAuthStore((state) => state.principal);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  useEffect(() => {
    let cancelled = false;

    if (isInitializing) {
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthenticated || !principal) {
      setProposals([]);
      return () => {
        cancelled = true;
      };
    }

    fetchMyProposals(principal).then((result) => {
      if (cancelled) {
        return;
      }
      setProposals(result.success ? result.proposals : []);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitializing, principal]);

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              My Submissions
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Track the lifecycle of your impact proposals on the Internet
              Computer.
            </p>
          </div>
          <Link
            href="/dashboard/proposals/new"
            className={buttonVariants({
              size: "sm",
              className:
                "rounded-xl font-bold px-6 shadow-lg shadow-primary/20",
            })}
          >
            Create New Draft
          </Link>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {proposals.length > 0 ? (
            proposals.map((proposal) => {
              const votingMetrics = getProposalVotingMetrics(proposal);
              const sidebarLabel =
                proposal.status === "Active" ? "Support" : "Funding";
              const sidebarValue =
                proposal.status === "Active"
                  ? formatPercent(votingMetrics.supportPercent, 0)
                  : `$${proposal.budget_amount.toLocaleString()}`;
              const sidebarProgress =
                proposal.status === "Active"
                  ? votingMetrics.supportPercent
                  : proposal.funding_goal > 0
                    ? (proposal.current_funding / proposal.funding_goal) * 100
                    : 0;

              return (
                <Link
                  key={proposal.id}
                  href={`/dashboard/proposals/detail?id=${proposal.id}`}
                >
                  <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden hover:border-primary/50 transition-all group mb-4">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 md:p-8 flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-primary/10 text-primary border-none font-semibold text-[9px] uppercase tracking-widest px-2.5 py-0.5">
                            {proposal.status}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ID: {proposal.id}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {proposal.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {proposal.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-6 pt-2">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(
                              proposal.created_at / 1_000_000,
                            ).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                            <MapPin className="w-3.5 h-3.5" />
                            {proposal.location.city || proposal.region_tag}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                            <Gavel className="w-3.5 h-3.5" />
                            {proposal.status === "Active"
                              ? `${formatPercent(votingMetrics.turnoutPercent, 0)} turnout`
                              : `${proposal.voter_count} voters`}
                          </div>
                        </div>
                      </div>
                      <div className="md:w-64 bg-neutral-50 dark:bg-neutral-900/50 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 p-6 md:p-8 flex flex-col justify-center space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {proposal.status === "Active"
                              ? "Cast VP"
                              : "Budget Requirement"}
                          </p>
                          <p className="text-2xl font-semibold">
                            {proposal.status === "Active"
                              ? votingMetrics.totalCastWeight.toFixed(1)
                              : `$${proposal.budget_amount.toLocaleString()}`}
                          </p>
                        </div>
                        <div className="pt-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                            <span>{sidebarLabel}</span>
                            <span>{sidebarValue}</span>
                          </div>
                          <Progress value={sidebarProgress} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          ) : (
            <div className="py-32 text-center space-y-6 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-900">
              <div className="h-20 w-20 rounded-full bg-background border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto shadow-sm">
                <Briefcase className="h-8 w-8 text-neutral-300" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">No submissions yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Your impact proposals will appear here once you initiate a
                  draft on the blockchain.
                </p>
              </div>
              <Link
                href="/dashboard/proposals/new"
                className={buttonVariants({
                  variant: "default",
                  className: "rounded-full px-8 shadow-xl shadow-primary/20",
                })}
              >
                Start First Proposal
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
