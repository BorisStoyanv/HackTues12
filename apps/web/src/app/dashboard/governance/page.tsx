"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Gavel,
  Globe,
  Scale,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  fetchAllProposals,
  fetchConfig,
  SerializedProposal,
} from "@/lib/actions/proposals";
import type { Config } from "@/lib/types/api";
import {
  formatConfigPercent,
  formatPercent,
  getProposalVotingMetrics,
} from "@/lib/proposals/voting";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GovernanceConfig = Omit<Config, "voting_period_ns"> & {
  voting_period_ns: number;
};

export default function GovernancePage() {
  const [proposals, setProposals] = useState<SerializedProposal[]>([]);
  const [config, setConfig] = useState<GovernanceConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAllProposals("Active"), fetchConfig()]).then(
      ([proposalsResult, configResult]) => {
        if (cancelled) {
          return;
        }

        setProposals(proposalsResult.success ? proposalsResult.proposals : []);
        setConfig(
          configResult.success && configResult.config
            ? configResult.config
            : null,
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              Active Governance
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Participate in regional consensus. Your voting power is weighted
              by your reputation and residency proofs.
            </p>
          </div>

          {config && (
            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-xl bg-background border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  Global Quorum
                </p>
                <p className="text-sm font-black">
                  {formatConfigPercent(config.quorum_percent)}
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-background border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  Threshold
                </p>
                <p className="text-sm font-black">
                  {formatConfigPercent(config.majority_threshold)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {proposals.length > 0 ? (
              proposals.map((proposal) => {
                const endsAt = new Date(proposal.voting_ends_at / 1_000_000);
                const isExpired = endsAt < new Date();
                const votingMetrics = getProposalVotingMetrics(proposal);

                return (
                  <Card
                    key={proposal.id}
                    className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden flex flex-col hover:border-primary/40 transition-all"
                  >
                    <CardHeader className="p-6 pb-4">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest px-2 py-0 border-none">
                          {proposal.status}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                          <Timer className="h-3 w-3" />
                          {isExpired
                            ? "Concluding..."
                            : endsAt.toLocaleDateString()}
                        </div>
                      </div>
                      <CardTitle className="text-lg font-bold leading-snug line-clamp-2">
                        {proposal.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase tracking-tighter pt-1 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" /> {proposal.region_tag}{" "}
                        Domain
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 flex-1 flex flex-col justify-between space-y-6">
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {proposal.description}
                      </p>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{proposal.voter_count} voters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Scale className="h-3 w-3" />
                            <span>
                              {formatPercent(votingMetrics.supportPercent, 0)}{" "}
                              support
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-3">
                            <p className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">
                              Turnout
                            </p>
                            <p className="font-black text-base">
                              {formatPercent(votingMetrics.turnoutPercent, 0)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 p-3">
                            <p className="text-muted-foreground uppercase tracking-widest font-bold text-[9px]">
                              Cast VP
                            </p>
                            <p className="font-black text-base">
                              {votingMetrics.totalCastWeight.toFixed(1)}
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/dashboard/proposals/${proposal.id}`}
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            "w-full rounded-xl font-bold h-10 shadow-lg shadow-primary/10",
                          )}
                        >
                          Open Proposal
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full py-24 text-center space-y-4 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-[3rem] border-2 border-dashed border-neutral-100 dark:border-neutral-900">
                <Activity className="h-12 w-12 mx-auto text-neutral-200 dark:text-neutral-800" />
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">No active voting rounds</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    All recent proposals have either been finalized or are
                    currently undergoing AI vetting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
