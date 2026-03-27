"use client";

import { fetchAllContracts } from "@/lib/actions/proposals";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowRight, ShieldCheck, FileText, Lock, Building2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { SerializedContract } from "@/lib/actions/proposals";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<SerializedContract[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchAllContracts().then((result) => {
      if (cancelled) return;
      setContracts(result.success ? result.contracts : []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Trust Contracts
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Legally binding cryptographic agreements between capital providers and regional project leads.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-12">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {contracts.length > 0 ? (
              contracts.map((contract) => (
                <Link 
                  key={contract.proposal_id} 
                  href={`/dashboard/contracts/detail?id=${contract.proposal_id}`}
                  className="group block transition-all"
                >
                  <Card className="h-full border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all rounded-2xl overflow-hidden flex flex-col">
                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                       <div className={cn(
                         "h-full transition-all duration-1000",
                         contract.status === 'Signed' ? "bg-green-500 w-full" : 
                         contract.status === 'PendingSignatures' ? "bg-amber-500 w-2/3" : "bg-neutral-400 w-1/3"
                       )} />
                    </div>
                    <CardHeader className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="font-semibold text-[9px] uppercase tracking-widest px-2 py-0">
                          {contract.status}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground font-bold">
                          #{contract.proposal_id}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">
                        Trust Record: {contract.company_name}
                      </CardTitle>
                      <CardDescription className="text-[10px] uppercase font-semibold tracking-tight pt-1">
                        Established {new Date(contract.created_at / 1000000).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 space-y-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Project Lead</p>
                            <p className="text-xs font-semibold truncate">{contract.company_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Investor</p>
                            <p className="text-xs font-semibold truncate">@{contract.investor.substring(0, 10)}...</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 mt-auto">
                        <div className="flex items-center gap-1.5">
                           <FileText className="h-3 w-3 text-muted-foreground" />
                           <span className="text-[10px] font-bold text-muted-foreground uppercase">Smart Contract V1</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-24 text-center space-y-6">
                <div className="mx-auto h-20 w-20 rounded-full bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                  <Lock className="h-8 w-8 text-neutral-300 dark:text-neutral-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">No active contracts found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Contracts are generated automatically when an impact proposal reaches the backing phase.
                  </p>
                </div>
                <Link 
                  href="/dashboard/explore" 
                  className={cn(buttonVariants({ variant: "default" }), "rounded-full px-8")}
                >
                  Explore Proposals
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
