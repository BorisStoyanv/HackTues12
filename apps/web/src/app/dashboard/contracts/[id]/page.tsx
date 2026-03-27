import { fetchContractById, fetchProposalById } from "@/lib/actions/proposals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, Lock, Building2, User, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { ContractSigningInterface } from "@/components/proposals/contract-signing-interface";
import { cn } from "@/lib/utils";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [contractResult, proposalResult] = await Promise.all([
    fetchContractById(id),
    fetchProposalById(id)
  ]);

  if (!contractResult.success || !contractResult.contract) {
    notFound();
  }

  const contract = contractResult.contract;
  const proposal = proposalResult.success ? proposalResult.proposal : null;

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-4 md:px-8 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/contracts" className={buttonVariants({ variant: "ghost", size: "icon", className: "rounded-full" })}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="space-y-0.5">
               <h1 className="text-lg font-bold tracking-tight">Trust Contract #{id}</h1>
               <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Digital Trust Engine</p>
            </div>
          </div>
          <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-background/50">
            {contract.status}
          </Badge>
        </div>
      </div>

      <div className="px-6 py-10 md:px-8">
        <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-12">
          
          <div className="lg:col-span-8 space-y-10">
            <section className="space-y-4">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">Legal Binding</h2>
              <Card className="border-neutral-200 dark:border-neutral-800 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Agreement Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="p-10 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center text-center space-y-4 group cursor-pointer hover:border-primary/50 transition-colors">
                     <div className="h-16 w-16 rounded-full bg-background border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <Lock className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                     </div>
                     <div className="space-y-1">
                        <p className="font-bold text-sm">OpenFairTrip Standard Trust Agreement</p>
                        <p className="text-xs text-muted-foreground font-mono opacity-60">SHA-256: 0x8a2f...c91d</p>
                     </div>
                     <Button variant="outline" size="sm" className="rounded-full px-6">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View Document
                     </Button>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                     <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Signatory Status</h3>
                     <div className="grid gap-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                                 <Building2 className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-sm font-bold">{contract.company_name}</span>
                           </div>
                           <Badge className="bg-green-500 text-white font-black text-[9px] uppercase">SIGNED</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                                 <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span className="text-sm font-bold">Investor (Principal @{contract.investor.substring(0, 8)}...)</span>
                           </div>
                           <Badge variant="secondary" className="font-black text-[9px] uppercase">PENDING</Badge>
                        </div>
                     </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {proposal && (
              <section className="space-y-4">
                 <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Linked Initiative</h2>
                 <Link href={`/dashboard/proposals/${proposal.id}`}>
                   <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl hover:border-primary/50 transition-all group overflow-hidden">
                      <div className="p-6 flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-lg font-bold group-hover:text-primary transition-colors">{proposal.title}</p>
                            <p className="text-xs text-muted-foreground">{proposal.region_tag} Domain • ${proposal.budget_amount.toLocaleString()} Goal</p>
                         </div>
                         <ShieldCheck className="h-8 w-8 text-primary/20 group-hover:text-primary transition-colors" />
                      </div>
                   </Card>
                 </Link>
              </section>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
             <Card className="border-neutral-200 dark:border-neutral-800 shadow-xl rounded-[2rem] overflow-hidden sticky top-24 bg-neutral-900 text-white border-none">
                <CardHeader className="p-8">
                   <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Signature Core</CardTitle>
                   <CardDescription className="text-white/60 font-medium">Verify and commit your legal intent to the ledger.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-8">
                   <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <div className="flex gap-3">
                         <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-5 w-5 text-green-400" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-bold">On-Chain Acknowledgment</p>
                            <p className="text-[10px] text-white/50 leading-relaxed">Your cryptographic signature will be permanently linked to this record.</p>
                         </div>
                      </div>
                   </div>

                   <ContractSigningInterface contractId={id} />

                   <div className="flex items-center gap-3 p-2">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <p className="text-[10px] text-white/40 italic leading-tight">
                        Warning: This action initiates an irreversible cryptographic bond.
                      </p>
                   </div>
                </CardContent>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
