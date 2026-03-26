import { fetchAuditLogs, fetchAllProposals } from "@/lib/actions/proposals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function LedgerPage() {
  const [logsResult, proposalsResult] = await Promise.all([
    fetchAuditLogs(50, 0),
    fetchAllProposals()
  ]);

  const logs = logsResult.success ? logsResult.logs : [];
  const proposals = proposalsResult.success ? proposalsResult.proposals : [];
  
  // Calculate aggregate stats
  const totalBudget = proposals.reduce((acc, p) => acc + (p.budget_amount || 0), 0);
  const totalBacking = proposals.reduce((acc, p) => acc + (p.yes_weight || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-12 shrink-0">
        <div className="max-w-7xl mx-auto space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Impact Ledger
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Financial transparency engine tracking regional capital flow and escrow releases.
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Financial Stats */}
          <div className="grid gap-6 md:grid-cols-3">
             <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-[10px] font-black uppercase tracking-widest">Global Capital Pledged</CardDescription>
                   <CardTitle className="text-3xl font-black">${totalBudget.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex items-center gap-1.5 text-xs text-green-500 font-bold">
                      <TrendingUp className="h-3 w-3" />
                      <span>+12.4% this quarter</span>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-[10px] font-black uppercase tracking-widest">Locked in Escrow</CardDescription>
                   <CardTitle className="text-3xl font-black">${totalBacking.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      <span>Verifying 3 active contracts</span>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-neutral-900 text-white border-none">
                <CardHeader className="pb-2">
                   <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60 text-white">Trust Tokens Issued</CardDescription>
                   <CardTitle className="text-3xl font-black">1.2M <span className="text-sm font-bold opacity-40">OFT</span></CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-[10px] font-medium opacity-60 leading-relaxed italic">
                      Minted upon verified impact milestones.
                   </p>
                </CardContent>
             </Card>
          </div>

          <div className="grid gap-10 lg:grid-cols-12">
             {/* Transaction Feed */}
             <div className="lg:col-span-8 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Wallet className="h-4 w-4" />
                   On-Chain Capital Events
                </h3>
                <Card className="border-neutral-200 dark:border-neutral-800 shadow-none rounded-2xl overflow-hidden">
                   <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                      {logs.filter(l => l.payload.toLowerCase().includes('budget') || l.payload.toLowerCase().includes('fund')).length > 0 ? (
                        logs.filter(l => l.payload.toLowerCase().includes('budget') || l.payload.toLowerCase().includes('fund')).map((log) => (
                           <div key={log.id} className="p-5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                 </div>
                                 <div className="space-y-0.5">
                                    <p className="text-sm font-bold tracking-tight">{log.payload}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                       {new Date(log.timestamp / 1000000).toLocaleDateString()} • ID: {log.id}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <Badge variant="outline" className="text-[10px] font-black font-mono">CONFIRMED</Badge>
                              </div>
                           </div>
                        ))
                      ) : (
                        <div className="p-20 text-center text-muted-foreground text-sm italic">
                           Awaiting financial triggers on the regional subnets.
                        </div>
                      )}
                   </div>
                </Card>
             </div>

             {/* Regional Breakdown */}
             <div className="lg:col-span-4 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Landmark className="h-4 w-4" />
                   Regional Domain Stats
                </h3>
                <Card className="border-neutral-200 dark:border-neutral-800 shadow-none rounded-2xl p-6 space-y-6">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold">Sofia Urban</span>
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500">
                            <ArrowUpRight className="h-3 w-3" /> $42k
                         </div>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                         <div className="h-full bg-primary w-[65%]" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold">Plovdiv Tech Hub</span>
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500">
                            <ArrowDownRight className="h-3 w-3" /> $12k
                         </div>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                         <div className="h-full bg-primary w-[30%]" />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold">Varna Coastal</span>
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500">
                            <ArrowUpRight className="h-3 w-3" /> $28k
                         </div>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                         <div className="h-full bg-primary w-[45%]" />
                      </div>
                   </div>
                </Card>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
