import { buttonVariants } from "@/components/ui/button";
import { LandingNav } from "@/components/landing/landing-nav";
import { ProposalCard } from "@/components/proposals/proposal-card";
import { fetchGlobalStats, fetchAllProposals, SerializedProposal } from "@/lib/actions/proposals";
import { 
  ArrowRight, 
  Map as MapIcon, 
  ShieldCheck, 
  Zap, 
  Globe, 
  BarChart3, 
  Users,
  Database,
  Landmark
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function LandingPage() {
  const [statsResult, proposalsResult] = await Promise.all([
    fetchGlobalStats(),
    fetchAllProposals()
  ]);

  const stats = statsResult.success && statsResult.stats ? statsResult.stats : {
    total_funded: 1250000,
    active_projects: 42,
    verified_users: 12400,
    average_ai_integrity_score: 88
  };

  const featuredProposals = proposalsResult.success 
    ? proposalsResult.proposals.slice(0, 3) 
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <LandingNav />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-4 pt-20 pb-32 sm:px-6 lg:px-8 lg:pt-32">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(0,0,0,0.03)_0%,transparent 100%)] dark:bg-[radial-gradient(45%_45%_at_50%_50%,rgba(255,255,255,0.03)_0%,transparent 100%)]" />
          
          <div className="container mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <ShieldCheck className="h-4 w-4 text-primary" />
               <span className="text-xs font-black uppercase tracking-widest text-primary">
                 Decentralized Consensus Protocol v1.0
               </span>
            </div>
            
            <h1 className="mx-auto max-w-5xl text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
              Transparent Funding, <br />
              <span className="text-primary italic">Governed by Locals.</span>
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-xl text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              Empowering regional communities through AI-vetted proposals, verifiable identity, and smart contract escrow.
            </p>
            
            <div className="mt-12 flex flex-wrap justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
              <Link
                href="/explore"
                className={cn(buttonVariants({ size: "lg" }), "h-16 rounded-2xl px-10 text-xl font-black shadow-2xl shadow-primary/20 transition-transform active:scale-95")}
              >
                Explore the Protocol Map
              </Link>
              <Link
                href="/dashboard/proposals/new"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-16 rounded-2xl px-10 text-xl font-bold border-2 transition-transform active:scale-95")}
              >
                Submit Project
              </Link>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="border-y bg-neutral-50/50 dark:bg-neutral-950/50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Total Deployed</p>
                <p className="text-4xl font-black tabular-nums">${(stats.total_funded / 1000000).toFixed(1)}M</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Active Initiatives</p>
                <p className="text-4xl font-black tabular-nums">{stats.active_projects}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Verified Citizens</p>
                <p className="text-4xl font-black tabular-nums">{(stats.verified_users / 1000).toFixed(1)}k</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Avg. Integrity</p>
                <p className="text-4xl font-black tabular-nums text-primary">{stats.average_ai_integrity_score}%</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-32 px-4">
          <div className="container mx-auto">
            <div className="mb-20 text-center">
               <h2 className="text-4xl font-black tracking-tight mb-4">A Tri-Agent Trust Architecture</h2>
               <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Our unique governance protocol ensures every dollar reaches its intended impact through multi-stage validation.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
               {[
                 {
                   step: "01",
                   title: "Propose",
                   desc: "Submit structured Data Packs including location context, budget breakdown, and measurable success metrics.",
                   icon: Database,
                   color: "text-blue-500"
                 },
                 {
                   step: "02",
                   title: "Debate",
                   desc: "Our 3-Agent AI architecture (Advocate, Skeptic, Analyst) rigorously vets proposal viability and risk.",
                   icon: BarChart3,
                   color: "text-primary"
                 },
                 {
                   step: "03",
                   title: "Govern",
                   desc: "Reputation-weighted community voting triggers smart contract escrows. Funds release only on verified milestones.",
                   icon: Globe,
                   color: "text-green-500"
                 }
               ].map((item, i) => (
                 <div key={i} className="group relative p-10 rounded-[3rem] border border-neutral-100 dark:border-neutral-900 bg-neutral-50/30 dark:bg-neutral-950/30 transition-all hover:bg-white dark:hover:bg-neutral-900 hover:shadow-2xl">
                    <div className={cn("mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-black shadow-sm border", item.color)}>
                       <item.icon className="h-8 w-8" />
                    </div>
                    <span className="absolute top-10 right-10 text-6xl font-black opacity-5 italic tracking-tighter">{item.step}</span>
                    <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">{item.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* FEATURED PROPOSALS */}
        <section className="py-32 bg-neutral-50/30 dark:bg-neutral-950/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="space-y-4">
                 <h2 className="text-4xl md:text-5xl font-black tracking-tight">Active Consenus Rounds</h2>
                 <p className="text-muted-foreground text-xl max-w-xl">Live initiatives awaiting regional validation. Your vote shapes your community.</p>
              </div>
              <Link
                href="/explore"
                className={cn(buttonVariants({ variant: "outline" }), "h-14 rounded-2xl px-8 font-bold border-2")}
              >
                View All Proposals
              </Link>
            </div>

            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {featuredProposals.length > 0 ? featuredProposals.map((proposal: SerializedProposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              )) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[3rem] border-neutral-200 dark:border-neutral-800">
                   <p className="text-muted-foreground italic">No active proposals in the ledger.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 px-4 relative overflow-hidden">
           <div className="container mx-auto">
              <div className="relative z-10 rounded-[4rem] bg-neutral-900 dark:bg-white text-white dark:text-black p-12 md:p-24 overflow-hidden text-center">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                 <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">Ready to Shape <br />Your Region?</h2>
                 <p className="text-white/60 dark:text-black/60 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                   Join thousands of verified citizens and capital providers building a more accountable future.
                 </p>
                 <div className="flex flex-wrap justify-center gap-6">
                    <Link
                      href="/login"
                      className={cn(buttonVariants({ size: "lg" }), "bg-white dark:bg-black text-black dark:text-white h-16 rounded-2xl px-10 text-xl font-black hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all")}
                    >
                      Get Started Now
                    </Link>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <footer className="border-t py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
             <div className="col-span-2">
                <Link href="/" className="flex items-center gap-2 mb-6">
                  <div className="bg-primary rounded-lg p-1.5">
                    <Landmark className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">OpenFairTrip</span>
                </Link>
                <p className="text-muted-foreground text-lg max-w-md">
                  Decentralized governance for regional impact. Building trust through cryptographic truth.
                </p>
             </div>
             <div>
                <h4 className="font-bold uppercase tracking-widest text-xs mb-6">Platform</h4>
                <ul className="space-y-4 text-muted-foreground font-medium">
                   <li><Link href="/explore" className="hover:text-primary transition-colors">Explore Map</Link></li>
                   <li><Link href="/dashboard" className="hover:text-primary transition-colors">Voter Dashboard</Link></li>
                   <li><Link href="/governance" className="hover:text-primary transition-colors">Governance Token</Link></li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold uppercase tracking-widest text-xs mb-6">Support</h4>
                <ul className="space-y-4 text-muted-foreground font-medium">
                   <li><Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link></li>
                   <li><Link href="/audit" className="hover:text-primary transition-colors">Audit Logs</Link></li>
                   <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                </ul>
             </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-neutral-100 dark:border-neutral-900 gap-6 text-sm text-muted-foreground font-medium">
             <p>© 2026 OpenFairTrip Protocol. All rights reserved.</p>
             <div className="flex gap-10">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verified Nodes: 1,204</span>
                <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Network: ICP Mainnet</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
