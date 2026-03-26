"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Info, 
  CheckCircle2,
  AlertCircle,
  Scale,
  Award,
  Globe,
  MapPin,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { castVoteClient } from "@/lib/api/client-mutations";
import { SerializedProposal } from "@/lib/actions/proposals";

interface ProposalVoteViewProps {
  id: string;
  mode: "public" | "authenticated";
  initialData?: SerializedProposal;
  onBack?: () => void;
}

export function ProposalVoteView({ id, mode, initialData, onBack }: ProposalVoteViewProps) {
  const router = useRouter();
  const { identity, user } = useAuthStore();
  const [voteValue, setVoteValue] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const proposal = useMemo(() => {
    const mock = MOCK_FEATURED_PROPOSALS.find((p) => p.id === id) || MOCK_FEATURED_PROPOSALS[0]!;
    return initialData ? { ...mock, ...initialData } : mock;
  }, [id, initialData]);

  // Mock regional eligibility check
  const isEligibleRegion = user?.detected_location?.city === (proposal.location as any)?.city;
  const reputationScore = user?.reputation || 100;
  
  const regionalMultiplier = isEligibleRegion ? 2.5 : 1.0;
  const expertiseMultiplier = 1.25; 
  const totalWeightedPower = Number(reputationScore) * regionalMultiplier * expertiseMultiplier;

  const handleSubmitVote = async () => {
    if (!voteValue || !identity) return;
    setIsSubmitting(true);
    
    try {
      await castVoteClient(identity, id, voteValue === "yes");
      setIsSuccess(true);
    } catch (error) {
      console.error("Vote failed:", error);
      alert("Failed to record vote on-chain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in fade-in zoom-in duration-500">
        <Card className="max-w-md w-full border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pt-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6 border-2 border-green-500">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">Vote Recorded</CardTitle>
            <CardDescription className="text-lg">
              Your cryptographic signature has been verified and added to the regional consensus pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8">
             <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 text-left">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground font-medium">Weighted Power Used</span>
                   <span className="font-bold text-primary">{totalWeightedPower.toFixed(0)} $V_p$</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground font-medium">Protocol Reward</span>
                   <span className="font-bold text-blue-500">+5 $V_p$</span>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-12 px-8">
            <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => onBack?.()}>
              Return to Proposal
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      {mode === "public" && (
        <header className="z-40 border-b bg-background/80 backdrop-blur-md sticky top-0 h-14">
          <div className="container mx-auto flex h-full items-center px-4 sm:px-6">
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight">Cast Your Vote</h1>
          </div>
        </header>
      )}

      <main className={cn(
        "py-8 px-4 sm:px-6 md:px-8 lg:px-12",
        mode === "public" && "container mx-auto"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full max-w-7xl mx-auto">
          
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight">{proposal.title}</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Choose your stance on this regional proposal. Your decision is immutable once committed to the ledger.
              </p>
            </div>

            <Card className="border-neutral-200 dark:border-neutral-800 shadow-xl rounded-[2.5rem] overflow-hidden">
               <CardHeader className="p-8 md:p-12 pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <Scale className="h-6 w-6 text-primary" />
                    Consensus Selection
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-8 md:p-12 pt-0">
                  <RadioGroup onValueChange={setVoteValue} className="grid grid-cols-1 gap-4">
                    <div className={cn(
                      "relative flex items-center space-x-2 border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300",
                      voteValue === "yes" ? "border-primary bg-primary/[0.03] scale-[1.02]" : "border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700"
                    )}>
                      <RadioGroupItem value="yes" id="yes" className="sr-only" />
                      <Label htmlFor="yes" className="flex flex-1 items-center gap-6 cursor-pointer">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                          voteValue === "yes" ? "bg-primary text-primary-foreground border-primary rotate-6" : "bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-muted-foreground"
                        )}>
                          <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-bold">Approve Proposal</p>
                          <p className="text-sm text-muted-foreground">I support the immediate implementation of this project.</p>
                        </div>
                      </Label>
                    </div>

                    <div className={cn(
                      "relative flex items-center space-x-2 border-2 rounded-2xl p-6 cursor-pointer transition-all duration-300",
                      voteValue === "no" ? "border-red-500 bg-red-500/[0.03] scale-[1.02]" : "border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700"
                    )}>
                      <RadioGroupItem value="no" id="no" className="sr-only" />
                      <Label htmlFor="no" className="flex flex-1 items-center gap-6 cursor-pointer">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                          voteValue === "no" ? "bg-red-500 text-white border-red-500 -rotate-6" : "bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-muted-foreground"
                        )}>
                          <AlertCircle className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-bold">Reject Proposal</p>
                          <p className="text-sm text-muted-foreground">I have concerns about the budget, feasibility, or impact.</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
               </CardContent>
               <CardFooter className="p-8 md:p-12 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800">
                  <Button 
                    className="w-full h-16 text-2xl font-black rounded-2xl" 
                    disabled={!voteValue || isSubmitting || !identity}
                    onClick={handleSubmitVote}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Broadcasting Signature...
                      </>
                    ) : (
                      <>
                        Confirm and Sign
                        <ShieldCheck className="ml-3 h-6 w-6" />
                      </>
                    )}
                  </Button>
               </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-none overflow-hidden rounded-[2rem]">
               <div className="h-2 bg-primary" />
               <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Your Voting Weight</CardTitle>
               </CardHeader>
               <CardContent className="p-8 pt-0 space-y-8">
                  <div className="flex items-center justify-between">
                     <span className="text-6xl font-black text-primary tracking-tighter">{totalWeightedPower.toFixed(0)}</span>
                     <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight text-right">Weighted<br />Power ($V_p$)</span>
                  </div>

                  <Separator />

                  <div className="space-y-5">
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                              <Award className="h-4 w-4 text-muted-foreground" />
                           </div>
                           <span className="font-bold">Base Reputation</span>
                        </div>
                        <span className="font-mono text-lg">{reputationScore}</span>
                     </div>

                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                           </div>
                           <span className="font-bold">Regional Multiplier</span>
                        </div>
                        <span className={cn(
                          "font-mono text-lg font-bold",
                          isEligibleRegion ? "text-green-500" : "text-amber-500"
                        )}>
                          {isEligibleRegion ? "2.5x" : "1.0x"}
                        </span>
                     </div>
                  </div>

                  {!isEligibleRegion ? (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                       <p className="font-black mb-2 flex items-center gap-2 uppercase tracking-widest">
                         <Globe className="h-4 w-4" />
                         External Voter
                       </p>
                       Your verified location is <strong>{user?.detected_location?.city || "Unknown"}</strong>. Voting on this project has a base weight.
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 text-xs text-green-700 dark:text-green-400 leading-relaxed">
                       <p className="font-black mb-2 flex items-center gap-2 uppercase tracking-widest">
                         <CheckCircle2 className="h-4 w-4" />
                         Verified Local
                       </p>
                       Your residency in <strong>{proposal.location.city}</strong> grants you maximum regional weighting.
                    </div>
                  )}
               </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
