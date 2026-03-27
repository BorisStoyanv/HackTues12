"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  ShieldCheck,
  TrendingUp,
  User,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { SerializedProposal, SerializedVote } from "@/lib/actions/proposals";
import { AIDebateLive } from "./ai-debate-live";
import { ProposalGovernancePanel } from "./proposal-governance-panel";

interface ProposalViewProps {
  id: string;
  mode: "public" | "authenticated";
  initialData?: SerializedProposal;
  votes?: SerializedVote[];
}

export function ProposalView({
  id,
  mode,
  initialData,
  votes = [],
}: ProposalViewProps) {
  if (!initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center animate-pulse">
          <BarChart3 className="h-6 w-6 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Proposal Not Found
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This proposal may have been pruned from the ledger or the ID is
          incorrect.
        </p>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const proposal = initialData;
  const statusFormatted = proposal.status.replace(/([A-Z])/g, " $1").trim();
  const creatorId = proposal.submitter;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Clean, Vercel-like Header Section */}
      <div className="border-b bg-background px-6 py-8 md:px-12 shrink-0 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-primary text-primary-foreground px-2.5 py-0.5 rounded-md text-[11px] font-medium border-transparent shadow-sm">
                {statusFormatted}
              </Badge>
              <Badge
                variant="outline"
                className="border-neutral-200 dark:border-neutral-800 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-background"
              >
                {proposal.region_tag}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground ml-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(proposal.created_at / 1000000).toLocaleDateString()}
              </div>
            </div>

            <h1 className="text-2xl md:text-5xl font-bold tracking-tight text-foreground leading-snug max-w-4xl">
              {proposal.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Submitter
                  </span>
                  <span className="text-sm font-medium">
                    @{creatorId.substring(0, 8)}...
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Region
                  </span>
                  <span className="text-sm font-medium">
                    {proposal.region_tag}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-10 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT COLUMN: Depth Details */}
          <div className="lg:col-span-8">
            <Tabs
              defaultValue="overview"
              className="w-full flex flex-col gap-6"
            >
              <TabsList className="w-full flex justify-start border-b border-border rounded-none h-auto bg-transparent p-0 overflow-x-auto scrollbar-hide">
                {[
                  "overview",
                  "debate",
                  "impact",
                  "execution",
                  "financials",
                  "votes",
                ].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="relative h-10 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none capitalize"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="w-full mt-4">
                <TabsContent
                  value="overview"
                  className="space-y-8 animate-in fade-in duration-500 m-0"
                >
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Executive Summary
                    </h3>
                    <p className="text-xl font-normal leading-relaxed text-foreground/90 max-w-4xl whitespace-pre-wrap">
                      {proposal.description}
                    </p>
                  </section>

                  <Separator className="bg-border" />

                  <section className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Category
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium">
                        {proposal.category}
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px] font-normal"
                      >
                        Verified Tag
                      </Badge>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent
                  value="debate"
                  className="space-y-8 animate-in fade-in duration-500 m-0 focus-visible:outline-none"
                >
                  <AIDebateLive
                    proposal={proposal}
                    onComplete={(res) => console.log("Debate synced", res)}
                  />
                </TabsContent>

                <TabsContent
                  value="impact"
                  className="space-y-8 animate-in fade-in duration-500 m-0"
                >
                  <Card className="border-border shadow-sm bg-background">
                    <CardContent className="p-8 space-y-8">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium tracking-tight">
                          Projected Impact
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                          Quantifiable outcomes cross-referenced by our
                          autonomous protocol.
                        </p>
                      </div>
                      <div className="text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                        {proposal.expected_impact}
                      </div>
                      <Separator className="bg-border" />
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <h4 className="font-medium text-sm">
                              Fairness Score: {proposal.fairness_score}%
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Equitable distribution verified by protocol.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            <h4 className="font-medium text-sm text-foreground">
                              Regional ROI
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Direct correlation with local stability.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="execution"
                  className="space-y-8 animate-in fade-in duration-500 m-0"
                >
                  <Card className="border-border shadow-sm bg-background">
                    <CardContent className="p-8 space-y-8">
                      <section className="space-y-4">
                        <h3 className="text-lg font-medium tracking-tight">
                          Materialization
                        </h3>
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          Timeline: {proposal.timeline}
                        </div>
                        <div className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          {proposal.execution_plan}
                        </div>
                      </section>

                      <Separator className="bg-border" />

                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-muted-foreground">
                            Executor
                          </span>
                          <span className="text-sm font-medium">
                            {proposal.executor_name}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent
                  value="financials"
                  className="space-y-8 animate-in fade-in duration-500 m-0"
                >
                  <div className="grid lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-border shadow-sm bg-background">
                      <CardContent className="p-8 space-y-6">
                        <h3 className="text-lg font-medium tracking-tight">
                          Budget Allocation
                        </h3>
                        <div className="text-sm leading-relaxed font-mono whitespace-pre-wrap p-4 bg-muted/50 rounded-md border border-border">
                          {proposal.budget_breakdown}
                        </div>
                      </CardContent>
                    </Card>
                    <div className="space-y-6">
                      <Card className="border-border shadow-sm bg-background">
                        <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                          <DollarSign className="h-6 w-6 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground">
                            Target Capital
                          </p>
                          <p className="text-3xl font-semibold tracking-tight">
                            ${proposal.budget_amount.toLocaleString()}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {proposal.budget_currency}
                          </p>
                        </CardContent>
                      </Card>
                      <div className="p-5 rounded-lg border border-border bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Protocol Rule
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Funds pinned to milestones. 66% consensus required for
                          release.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="votes"
                  className="space-y-8 animate-in fade-in duration-500 m-0"
                >
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium tracking-tight flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Voting Audit Trail
                    </h3>
                    <div className="border border-border rounded-xl overflow-hidden bg-background">
                      <table className="w-full text-sm">
                        <thead className="bg-muted border-b border-border">
                          <tr>
                            <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">
                              Voter Principal
                            </th>
                            <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">
                              Stance
                            </th>
                            <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">
                              Weight ($V_p$)
                            </th>
                            <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">
                              Timestamp
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {votes.length > 0 ? (
                            votes.map((vote, i) => (
                              <tr
                                key={i}
                                className="hover:bg-muted/50 transition-colors"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                  @{vote.voter.substring(0, 16)}...
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {vote.in_favor ? (
                                    <div className="inline-flex items-center gap-1.5 text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md font-medium text-[10px] uppercase">
                                      <CheckCircle2 className="h-3 w-3" />{" "}
                                      Approve
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 text-red-600 bg-red-500/10 px-2 py-0.5 rounded-md font-medium text-[10px] uppercase">
                                      <XCircle className="h-3 w-3" /> Reject
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-primary font-mono">
                                  {vote.weight.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                  {new Date(
                                    Number(vote.timestamp) / 1000000,
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-8 text-center text-muted-foreground text-sm"
                              >
                                No consensus data committed to the ledger for
                                this project yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* RIGHT COLUMN: Governance Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <ProposalGovernancePanel id={id} mode={mode} proposal={proposal} />
          </div>
        </div>
      </div>
    </div>
  );
}
