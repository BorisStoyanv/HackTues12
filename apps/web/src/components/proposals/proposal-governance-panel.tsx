"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Circle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { useProposalGovernance } from "@/hooks/use-proposal-governance";
import { SerializedProposal } from "@/lib/actions/proposals";
import {
  ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL,
  formatPercent,
  getProposalVotingMetrics,
  QUORUM_PERCENT_OF_TOTAL,
} from "@/lib/proposals/voting";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ProposalGovernancePanelProps {
  id: string;
  mode: "public" | "authenticated";
  proposal: SerializedProposal;
}

export function ProposalGovernancePanel({
  id,
  mode,
  proposal,
}: ProposalGovernancePanelProps) {
  const metrics = getProposalVotingMetrics(proposal);
  const {
    handleVote,
    isLoading,
    isLocallyVerified,
    isSubmittingVote,
    viewerProfile,
    viewerVote,
    viewerVotingPower,
    voteDisabledReason,
    voteError,
  } = useProposalGovernance(proposal);

  const statusFormatted = proposal.status.replace(/([A-Z])/g, " $1").trim();
  const voteRoutePrefix =
    mode === "authenticated" ? "/dashboard/proposals" : "/proposals";
  const voteButtonsDisabled = Boolean(voteDisabledReason) || isSubmittingVote;
  const hasRecordedVote = Boolean(viewerVote);
  const isPassedStatus =
    proposal.status === "AwaitingFunding" || proposal.status === "Backed";
  const isResolvedWithQuorum =
    isPassedStatus || proposal.status === "Rejected";
  const quorumReached =
    metrics.turnoutPercent >= QUORUM_PERCENT_OF_TOTAL || isResolvedWithQuorum;
  const approvalReached =
    metrics.supportPercent >= ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL;
  const approvalRulePassed = approvalReached || isPassedStatus;
  const passedByDeadlineMajority =
    isPassedStatus &&
    metrics.supportPercent < ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL &&
    metrics.supportShareOfCastPercent >= 50;
  const supportLabel =
    metrics.totalRegionalVp > 0
      ? `${metrics.yesWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} yes VP`
      : `${metrics.yesWeight.toFixed(1)} yes VP`;
  const oppositionLabel =
    metrics.totalRegionalVp > 0
      ? `${metrics.noWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} no VP`
      : `${metrics.noWeight.toFixed(1)} no VP`;
  const turnoutLabel =
    metrics.totalRegionalVp > 0
      ? `${metrics.totalCastWeight.toFixed(1)} / ${metrics.totalRegionalVp.toFixed(1)} VP`
      : `${metrics.totalCastWeight.toFixed(1)} VP cast`;
  const ruleItems = [
    {
      passed: quorumReached,
      label: `Quorum: at least ${QUORUM_PERCENT_OF_TOTAL}% of eligible VP has voted`,
      detail: `${formatPercent(metrics.turnoutPercent, 1)} turnout so far`,
    },
    {
      passed: approvalRulePassed,
      label: `Passes automatically at ${ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL}% Yes VP, or by majority after time ends`,
      detail: passedByDeadlineMajority
        ? `Approved after deadline with ${formatPercent(metrics.supportShareOfCastPercent, 1)} Yes share of cast VP`
        : `${formatPercent(metrics.supportPercent, 1)} Yes of total eligible VP`,
    },
  ];

  return (
    <Card className="border-border shadow-sm rounded-xl overflow-hidden bg-background lg:sticky lg:top-24">
      <CardHeader className="p-6 pb-4 border-b border-border">
        <CardTitle className="text-lg font-medium tracking-tight">
          Governance Status
        </CardTitle>
        <CardDescription className="text-sm font-medium mt-1">
          {statusFormatted}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-6 items-end">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground mb-1">
                Yes of total VP
              </span>
              <span className="font-semibold text-2xl tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatPercent(metrics.supportPercent, 1)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm mt-1">
                {metrics.hasVotes ? supportLabel : "0.0 yes VP"}
              </span>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-medium text-muted-foreground mb-1">
                No of total VP
              </span>
              <span className="font-semibold text-2xl tracking-tight text-red-600 dark:text-red-400">
                {formatPercent(metrics.oppositionPercent, 1)}
              </span>
              <span className="text-red-600 dark:text-red-400 font-medium text-sm mt-1">
                {metrics.hasVotes ? oppositionLabel : "0.0 no VP"}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative pt-5">
              <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-emerald-500/90"
                  style={{ width: `${Math.min(metrics.supportPercent, 100)}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 rounded-full bg-red-500/85"
                  style={{ width: `${Math.min(metrics.oppositionPercent, 100)}%` }}
                />
              </div>
              {[
                {
                  label: `${QUORUM_PERCENT_OF_TOTAL}%`,
                  value: QUORUM_PERCENT_OF_TOTAL,
                },
                {
                  label: `${ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL}%`,
                  value: ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL,
                },
              ].map((marker) => (
                <div
                  key={`${marker.label}-${marker.value}`}
                  className="pointer-events-none absolute top-0 -translate-x-1/2"
                  style={{ left: `${marker.value}%` }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {marker.label}
                    </span>
                    <div className="h-5 border-l border-dashed border-muted-foreground/40" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {ruleItems.map((rule) => (
                <div
                  key={rule.label}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  {rule.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-snug">
                      {rule.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rule.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Turnout</p>
            <p className="text-base font-semibold tracking-tight">
              {formatPercent(metrics.turnoutPercent, 1)}
            </p>
            <p className="text-xs text-muted-foreground">{turnoutLabel}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Yes / No
            </p>
            <p className="text-base font-semibold tracking-tight">
              {metrics.yesWeight.toFixed(1)} / {metrics.noWeight.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              {proposal.voter_count} voters
            </p>
          </div>
        </div>

        {proposal.status === "Active" && (
          <>
            <Separator className="bg-border" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cast your vote</p>
                  <p className="text-xs text-muted-foreground">
                    One click submits directly to the canister.
                  </p>
                </div>
                {hasRecordedVote && (
                  <Badge variant="outline" className="font-medium">
                    {viewerVote?.inFavor ? "Voted Yes" : "Voted No"}
                  </Badge>
                )}
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  disabled={voteButtonsDisabled}
                  onClick={() => handleVote(true)}
                  className={cn(
                    "h-12 touch-manipulation justify-start rounded-xl border",
                    viewerVote?.inFavor
                      ? "bg-emerald-600 text-white hover:bg-emerald-600"
                      : "bg-background text-foreground hover:bg-emerald-500/10",
                  )}
                >
                  {isSubmittingVote ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Yes
                </Button>
                <Button
                  type="button"
                  disabled={voteButtonsDisabled}
                  onClick={() => handleVote(false)}
                  className={cn(
                    "h-12 touch-manipulation justify-start rounded-xl border",
                    viewerVote && !viewerVote.inFavor
                      ? "bg-red-600 text-white hover:bg-red-600"
                      : "bg-background text-foreground hover:bg-red-500/10",
                  )}
                >
                  {isSubmittingVote ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  No
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Your voting power
                  </span>
                  <span className="font-semibold">
                    {viewerVotingPower !== null
                      ? `${viewerVotingPower.toFixed(1)} VP`
                      : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Eligibility</span>
                  <span className="font-semibold">
                    {isLoading
                      ? "Checking"
                      : viewerProfile
                        ? viewerProfile.userType === "User"
                          ? "Community voter"
                          : "Investor account"
                        : "No profile"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Region weighting
                  </span>
                  <span className="font-semibold">
                    {viewerProfile
                      ? isLocallyVerified
                        ? "Local verified"
                        : viewerProfile.homeRegion
                          ? "External to region"
                          : "No home region"
                      : "Unavailable"}
                  </span>
                </div>
              </div>

              {voteDisabledReason && (
                <p className="text-sm text-muted-foreground">
                  {voteDisabledReason}
                </p>
              )}
              {voteError && (
                <p className="text-sm text-destructive">{voteError}</p>
              )}
            </div>
          </>
        )}

        <Separator className="bg-border" />

        <div className="space-y-3">
          {proposal.status === "AwaitingFunding" && (
            <Link
              href={`${voteRoutePrefix}/${id}/fund`}
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "w-full font-medium bg-green-600 hover:bg-green-700 text-white",
              )}
            >
              Back project
            </Link>
          )}
          <Button variant="outline" className="w-full font-medium">
            Export Audit
          </Button>
        </div>

        {proposal.status === "Active" && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Voting snapshot
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">No of total VP</span>
              <span>{formatPercent(metrics.oppositionPercent, 1)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Yes share of cast VP</span>
              <span>{formatPercent(metrics.supportShareOfCastPercent, 1)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
