"use client";

import { useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Users, 
  MapPin, 
  Clock, 
  BarChart3, 
  AlertTriangle, 
  Zap,
  MessageSquare,
  ChevronRight
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

interface ProposalViewProps {
  id: string;
  mode: "public" | "authenticated";
  onBack?: () => void;
}

export function ProposalView({ id, mode, onBack }: ProposalViewProps) {
  const user = useAuthStore((state) => state.user);

  const proposal = useMemo(
    () => MOCK_FEATURED_PROPOSALS.find((p) => p.id === id),
    [id]
  );

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Proposal not found</h1>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const fundingProgress = (proposal.current_funding / proposal.funding_goal) * 100;

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      {/* Header logic depends on mode */}
      {mode === "public" && (
        <header className="z-40 border-b bg-background/80 backdrop-blur-md sticky top-0 h-14">
          <div className="container mx-auto flex h-full items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground">Explore</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[200px]">{proposal.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!user && (
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Sign in to Vote
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={cn(
        "py-8 px-4 sm:px-6 md:px-8 lg:px-12",
        mode === "public" && "container mx-auto"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
          
          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-10 min-w-0">
            {/* Header Section */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="uppercase tracking-wider text-[10px] px-2 py-0.5">
                  {proposal.status.replace('_', ' ')}
                </Badge>
                {proposal.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">{proposal.title}</h1>
              <div className="flex flex-wrap items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border text-xs font-bold">
                    {proposal.creator_id[0].toUpperCase()}
                  </div>
                  <span className="text-base">Proposed by <span className="text-foreground font-semibold">@{proposal.creator_id}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-base">
                  <MapPin className="h-5 w-5" />
                  {proposal.location.city}, {proposal.location.country}
                </div>
                <div className="flex items-center gap-1.5 text-base">
                  <Clock className="h-5 w-5" />
                  Created March 2024
                </div>
              </div>
            </div>

            <Separator />

            {/* Tabs for different sections */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full flex justify-start border-b rounded-none h-auto bg-transparent p-0 space-x-10 mb-8">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 bg-transparent shadow-none font-bold text-base transition-none">Overview</TabsTrigger>
                <TabsTrigger value="ai-integrity" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 bg-transparent shadow-none font-bold text-base transition-none">
                  AI Integrity
                  {proposal.ai_integrity_report && (
                    <Badge className="ml-2 bg-primary/10 text-primary border-none hover:bg-primary/20">
                      {proposal.ai_integrity_report.overall_score}%
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="debate" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 bg-transparent shadow-none font-bold text-base transition-none">Debate Log</TabsTrigger>
                <TabsTrigger value="budget" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 bg-transparent shadow-none font-bold text-base transition-none">Financials</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-10 focus-visible:outline-none mt-2">
                <section className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">Problem Statement</h3>
                  <p className="text-muted-foreground leading-relaxed text-xl max-w-4xl">
                    {proposal.problem_statement}
                  </p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">Proposed Solution</h3>
                  <p className="text-muted-foreground leading-relaxed text-xl max-w-4xl">
                    {proposal.short_description}
                  </p>
                </section>

                <section className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">Success Metrics</h3>
                  <div className="p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-4xl">
                    <p className="text-2xl font-medium italic text-foreground leading-relaxed">
                      "{proposal.success_metric}"
                    </p>
                  </div>
                </section>
              </TabsContent>

              {/* AI Integrity Tab */}
              <TabsContent value="ai-integrity" className="space-y-10 focus-visible:outline-none mt-2">
                {proposal.ai_integrity_report ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <Card className="border-neutral-200 dark:border-neutral-800 shadow-none p-2">
                        <CardHeader className="pb-2">
                          <CardDescription className="text-xs uppercase font-bold tracking-widest">Overall Integrity</CardDescription>
                          <CardTitle className="text-5xl font-black text-primary">{proposal.ai_integrity_report.overall_score}%</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card className="border-neutral-200 dark:border-neutral-800 shadow-none p-2">
                        <CardHeader className="pb-2">
                          <CardDescription className="text-xs uppercase font-bold tracking-widest">Fairness Score</CardDescription>
                          <CardTitle className="text-5xl font-black text-blue-500">{proposal.ai_integrity_report.fairness_score}%</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card className="border-neutral-200 dark:border-neutral-800 shadow-none p-2">
                        <CardHeader className="pb-2">
                          <CardDescription className="text-xs uppercase font-bold tracking-widest">Efficiency Score</CardDescription>
                          <CardTitle className="text-5xl font-black text-green-500">{proposal.ai_integrity_report.efficiency_score}%</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>

                    <section className="space-y-4">
                      <h3 className="text-3xl font-bold tracking-tight">AI Analysis Summary</h3>
                      <p className="text-muted-foreground leading-relaxed text-xl max-w-4xl">
                        {proposal.ai_integrity_report.summary}
                      </p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <section className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Risk Factors
                        </h3>
                        <div className="space-y-3">
                          {proposal.ai_integrity_report.risk_factors.map((risk, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-base text-muted-foreground leading-relaxed">
                              <span className="h-2 w-2 rounded-full bg-amber-500 mt-2 shrink-0" />
                              {risk}
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Zap className="h-5 w-5 text-green-500" />
                          Positive Externalities
                        </h3>
                        <div className="space-y-3">
                          {proposal.ai_integrity_report.positive_externalities.map((ext, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-base text-muted-foreground leading-relaxed">
                              <span className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
                              {ext}
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </>
                ) : (
                  <div className="p-16 text-center border-2 border-dashed rounded-2xl">
                    <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-6 opacity-20" />
                    <h4 className="text-2xl font-bold tracking-tight">AI Debate in Progress</h4>
                    <p className="text-muted-foreground text-lg">Our 3-agent AI protocol is currently vetting this proposal.</p>
                  </div>
                )}
              </TabsContent>

              {/* Debate Log Tab */}
              <TabsContent value="debate" className="space-y-8 focus-visible:outline-none mt-2">
                <div className="space-y-8">
                   <div className="flex items-center justify-between">
                     <h3 className="text-3xl font-bold tracking-tight">3-Agent AI Consensus</h3>
                     <Badge variant="outline" className="gap-2 px-4 py-1.5 text-sm font-semibold">
                       <ShieldCheck className="h-4 w-4 text-primary" />
                       Verifiable Protocol
                     </Badge>
                   </div>

                   <div className="space-y-12 pt-6">
                     <div className="relative pl-10 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-16">
                        {/* Advocate */}
                        <div className="relative">
                          <div className="absolute -left-[51px] top-0 h-10 w-10 rounded-full bg-blue-500 border-4 border-background flex items-center justify-center shadow-lg">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold uppercase tracking-widest text-blue-500">Agent: Advocate</span>
                              <Badge variant="secondary" className="text-[10px] h-5 px-2">Proponent</Badge>
                            </div>
                            <div className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 shadow-sm">
                               <p className="text-lg leading-relaxed italic text-muted-foreground">
                                 "The long-term impact on regional air quality justifies the initial capital outlay. Indigenous tree species are low-maintenance and provide maximum ecological resilience for this specific urban corridor."
                               </p>
                            </div>
                          </div>
                        </div>

                        {/* Skeptic */}
                        <div className="relative">
                          <div className="absolute -left-[51px] top-0 h-10 w-10 rounded-full bg-red-500 border-4 border-background flex items-center justify-center shadow-lg">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold uppercase tracking-widest text-red-500">Agent: Skeptic</span>
                              <Badge variant="secondary" className="text-[10px] h-5 px-2">Adversarial</Badge>
                            </div>
                            <div className="p-6 rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 shadow-sm">
                               <p className="text-lg leading-relaxed italic text-muted-foreground">
                                 "I question the maintenance budget in Years 2-5. Without a formal commitment from the municipal water department, survival rates for these trees could drop below 60% during drought seasons."
                               </p>
                            </div>
                          </div>
                        </div>

                        {/* Analyst */}
                        <div className="relative">
                          <div className="absolute -left-[51px] top-0 h-10 w-10 rounded-full bg-green-500 border-4 border-background flex items-center justify-center shadow-lg">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold uppercase tracking-widest text-green-500">Agent: Analyst</span>
                              <Badge variant="secondary" className="text-[10px] h-5 px-2">Synthesizer</Badge>
                            </div>
                            <div className="p-6 rounded-3xl bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 shadow-md">
                               <p className="text-lg leading-relaxed italic text-muted-foreground">
                                 "Data from similar urban reforestations indicates an average 12% property value increase within 400m. Recommending a 5% budget buffer for early-stage irrigation to mitigate Skeptic's concerns."
                               </p>
                            </div>
                          </div>
                        </div>
                     </div>
                   </div>
                </div>
              </TabsContent>

              {/* Budget & Milestones Tab */}
              <TabsContent value="budget" className="space-y-8 focus-visible:outline-none mt-2">
                 <section className="space-y-8">
                   <h3 className="text-3xl font-bold tracking-tight">Financial Roadmap</h3>
                   <div className="grid gap-6">
                      {[
                        { title: "Planning & Sourcing", pct: 20, desc: "Finalize tree species and nursery contracts." },
                        { title: "Phase 1: Excavation", pct: 30, desc: "Preparation of 250 sites along the Northern corridor." },
                        { title: "Phase 2: Planting", pct: 40, desc: "Installation of all 500 trees and irrigation setup." },
                        { title: "Verification & Audit", pct: 10, desc: "Independent survival audit after 3 months." }
                      ].map((m, i) => (
                        <div key={i} className="flex gap-8 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm hover:border-primary/20 transition-all hover:shadow-md">
                           <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                             {m.pct}%
                           </div>
                           <div className="space-y-2">
                             <p className="font-bold text-xl">{m.title}</p>
                             <p className="text-muted-foreground leading-relaxed text-lg">{m.desc}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 </section>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-8 lg:sticky lg:top-24 h-fit">
            {/* Action Card */}
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl">Project Governance</CardTitle>
                <CardDescription className="text-base font-medium">Target: ${proposal.funding_goal.toLocaleString()} {proposal.currency}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-2xl">${proposal.current_funding.toLocaleString()}</span>
                    <span className="text-muted-foreground self-end font-semibold">{fundingProgress.toFixed(1)}% Funded</span>
                  </div>
                  <Progress value={fundingProgress} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase font-black text-muted-foreground tracking-widest">Goal</p>
                    <p className="text-lg font-bold">${proposal.funding_goal.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] uppercase font-black text-muted-foreground tracking-widest">Status</p>
                    <p className={cn(
                      "text-lg font-bold capitalize",
                      proposal.status === 'funding' ? "text-green-500" : "text-primary"
                    )}>{proposal.status.replace('_', ' ')}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-5">
                  <div className="flex items-center justify-between text-base">
                    <span className="text-muted-foreground flex items-center gap-2.5 font-medium">
                      <Users className="h-5 w-5" />
                      Community Voters
                    </span>
                    <span className="font-bold text-lg">{proposal.voting_metrics.total_votes}</span>
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <span className="text-muted-foreground flex items-center gap-2.5 font-medium">
                      <ShieldCheck className="h-5 w-5" />
                      Regional Quorum
                    </span>
                    <span className={cn(
                      "font-bold text-lg",
                      proposal.voting_metrics.quorum_reached ? "text-green-500" : "text-amber-500"
                    )}>
                      {proposal.voting_metrics.quorum_percentage}% / 5.0%
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                   {proposal.status === 'voting' && (
                     <Link 
                       href={mode === "authenticated" ? `/dashboard/proposals/${proposal.id}/vote` : `/proposals/${proposal.id}/vote`}
                       className={buttonVariants({ className: "w-full h-14 text-xl font-bold shadow-lg" })}
                     >
                        Cast Your Vote
                     </Link>
                   )}
                   {proposal.status === 'funding' && (
                     <Link 
                       href={mode === "authenticated" ? `/dashboard/proposals/${proposal.id}/fund` : `/proposals/${proposal.id}/fund`}
                       className={buttonVariants({ variant: "default", className: "w-full h-14 text-xl font-bold shadow-lg" })}
                     >
                        Deploy Capital
                     </Link>
                   )}
                   <Button variant="outline" className="w-full h-14 font-bold text-lg">
                     Share Proposal
                   </Button>
                </div>
              </CardContent>
            </Card>

            {/* Voting Distribution */}
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-none bg-neutral-50/30 dark:bg-neutral-900/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Governance Power Split</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                          <span className="font-semibold text-muted-foreground">Local Residents</span>
                          <span className="font-black text-primary">{proposal.voting_metrics.voting_power_distribution.locals} $V_p$</span>
                       </div>
                       <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[60%]" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                          <span className="font-semibold text-muted-foreground">Verified Experts</span>
                          <span className="font-black text-blue-500">{proposal.voting_metrics.voting_power_distribution.experts} $V_p$</span>
                       </div>
                       <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[30%]" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                          <span className="font-semibold text-muted-foreground">Global Community</span>
                          <span className="font-black text-neutral-400">{proposal.voting_metrics.voting_power_distribution.general} $V_p$</span>
                       </div>
                       <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-neutral-400 w-[10%]" />
                       </div>
                    </div>
                 </div>
                 <p className="text-xs text-muted-foreground leading-relaxed italic opacity-70">
                   *Weight is dynamically calculated via ZK-proofs of residency and professional validation.
                 </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
