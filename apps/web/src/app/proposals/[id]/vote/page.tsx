"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Info, 
  CheckCircle2,
  AlertCircle,
  Scale,
  Award,
  Globe,
  MapPin
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

export default function VotePage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [voteValue, setVoteValue] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const proposal = useMemo(
    () => MOCK_FEATURED_PROPOSALS.find((p) => p.id === id),
    [id]
  );

  // Guard: if not logged in, redirect to login
  if (!user) {
    router.push("/login");
    return null;
  }

  if (!proposal) return null;

  // Mock regional eligibility check
  const isEligibleRegion = user.detected_location?.city === proposal.location.city;
  const reputationScore = 150; // Mocked base reputation
  
  // Calculate weighted power
  // In a real app, this would be a complex backend formula
  const regionalMultiplier = isEligibleRegion ? 2.5 : 1.0;
  const expertiseMultiplier = 1.25; // Mocked from CV upload
  const totalWeightedPower = reputationScore * regionalMultiplier * expertiseMultiplier;

  const handleSubmitVote = () => {
    if (!voteValue) return;
    setIsSubmitting(true);
    // Simulate on-chain signature and vote recording
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-neutral-200 dark:border-neutral-800 text-center">
          <CardHeader className="pt-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">Vote Recorded</CardTitle>
            <CardDescription className="text-lg">
              Your cryptographic signature has been verified and added to the regional consensus pool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Transaction ID</span>
                   <code className="text-[10px] font-mono">0x4a...e92f</code>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Weighted Power Used</span>
                   <span className="font-bold text-primary">{totalWeightedPower.toFixed(0)} $V_p$</span>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-12">
            <Button className="w-full h-12 text-lg font-bold" onClick={() => router.push(`/proposals/${id}`)}>
              Return to Proposal
            </Button>
            <p className="text-xs text-muted-foreground">
              You earned <span className="font-bold text-foreground">+5 $V_p$</span> for participating in community governance.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center px-4 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">Cast Your Vote</h1>
        </div>
      </header>

      <main className="container mx-auto mt-8 max-w-4xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side: Vote Options */}
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{proposal.title}</h2>
              <p className="text-muted-foreground line-clamp-2">
                {proposal.short_description}
              </p>
            </div>

            <Card className="border-neutral-200 dark:border-neutral-800">
               <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Consensus Selection
                  </CardTitle>
                  <CardDescription>
                    Choose your stance on this regional proposal.
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  <RadioGroup onValueChange={setVoteValue} className="grid grid-cols-1 gap-4">
                    <div className={cn(
                      "relative flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all",
                      voteValue === "yes" ? "border-primary bg-primary/[0.02]" : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}>
                      <RadioGroupItem value="yes" id="yes" className="sr-only" />
                      <Label htmlFor="yes" className="flex flex-1 items-center gap-4 cursor-pointer">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border",
                          voteValue === "yes" ? "bg-primary text-primary-foreground border-primary" : "bg-neutral-100 dark:bg-neutral-800"
                        )}>
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">Approve</p>
                          <p className="text-xs text-muted-foreground italic">I support the implementation of this project.</p>
                        </div>
                        {voteValue === "yes" && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </Label>
                    </div>

                    <div className={cn(
                      "relative flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all",
                      voteValue === "no" ? "border-red-500 bg-red-500/[0.02]" : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}>
                      <RadioGroupItem value="no" id="no" className="sr-only" />
                      <Label htmlFor="no" className="flex flex-1 items-center gap-4 cursor-pointer">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border",
                          voteValue === "no" ? "bg-red-500 text-white border-red-500" : "bg-neutral-100 dark:bg-neutral-800"
                        )}>
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">Reject</p>
                          <p className="text-xs text-muted-foreground italic">I have concerns about the budget or impact.</p>
                        </div>
                        {voteValue === "no" && <div className="h-2 w-2 rounded-full bg-red-500" />}
                      </Label>
                    </div>

                    <div className={cn(
                      "relative flex items-center space-x-2 border rounded-xl p-4 cursor-pointer transition-all",
                      voteValue === "abstain" ? "border-neutral-400 bg-neutral-400/[0.02]" : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}>
                      <RadioGroupItem value="abstain" id="abstain" className="sr-only" />
                      <Label htmlFor="abstain" className="flex flex-1 items-center gap-4 cursor-pointer">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border",
                          voteValue === "abstain" ? "bg-neutral-400 text-white border-neutral-400" : "bg-neutral-100 dark:bg-neutral-800"
                        )}>
                          <Info className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">Abstain</p>
                          <p className="text-xs text-muted-foreground italic">I am not taking a stance on this proposal.</p>
                        </div>
                        {voteValue === "abstain" && <div className="h-2 w-2 rounded-full bg-neutral-400" />}
                      </Label>
                    </div>
                  </RadioGroup>
               </CardContent>
               <CardFooter>
                  <Button 
                    className="w-full h-12 text-lg font-bold" 
                    disabled={!voteValue || isSubmitting}
                    onClick={handleSubmitVote}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Signing Transaction...
                      </>
                    ) : (
                      "Confirm and Sign"
                    )}
                  </Button>
               </CardFooter>
            </Card>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 flex gap-3">
               <Info className="h-5 w-5 text-blue-500 shrink-0" />
               <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                 Once signed, your vote cannot be changed. Your vote is cryptographic and verifiable on the transparency ledger.
               </p>
            </div>
          </div>

          {/* Right Side: Reputation & Weight Breakdown */}
          <div className="space-y-6">
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-none overflow-hidden">
               <div className="h-1 bg-primary" />
               <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your Voting Weight</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                     <span className="text-4xl font-black text-primary">{totalWeightedPower.toFixed(0)}</span>
                     <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Weighted $V_p$</span>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           <Award className="h-4 w-4 text-muted-foreground" />
                           <span>Base Reputation</span>
                        </div>
                        <span className="font-medium">{reputationScore}</span>
                     </div>

                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           <MapPin className="h-4 w-4 text-muted-foreground" />
                           <span>Regional Residency</span>
                        </div>
                        <span className={cn(
                          "font-bold",
                          isEligibleRegion ? "text-green-500" : "text-amber-500"
                        )}>
                          {isEligibleRegion ? "2.5x Multiplier" : "1.0x (External)"}
                        </span>
                     </div>

                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                           <span>Domain Expertise</span>
                        </div>
                        <span className="font-bold text-blue-500">1.25x Multiplier</span>
                     </div>
                  </div>

                  {!isEligibleRegion && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-[10px] text-amber-700 dark:text-amber-400">
                       <p className="font-bold mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                         <Globe className="h-3 w-3" />
                         External Voter Detected
                       </p>
                       Your current verified location is <strong>{user.detected_location?.city || "Unknown"}</strong>. Your vote on this {proposal.location.city} project will have a reduced weight.
                    </div>
                  )}

                  {isEligibleRegion && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-[10px] text-green-700 dark:text-green-400">
                       <p className="font-bold mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                         <CheckCircle2 className="h-3 w-3" />
                         Local Resident Verified
                       </p>
                       Your residency in <strong>{proposal.location.city}</strong> gives you maximum voting power on this community initiative.
                    </div>
                  )}
               </CardContent>
            </Card>

            <Card className="border-neutral-200 dark:border-neutral-800 shadow-none">
              <CardHeader className="pb-2">
                 <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Regional Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <span>Current Approval</span>
                       <span className="font-bold">{proposal.voting_metrics.approval_percentage}%</span>
                    </div>
                    <Progress value={proposal.voting_metrics.approval_percentage} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                       <span>Required: 51%</span>
                       <span>Status: {proposal.voting_metrics.approval_percentage >= 51 ? "Passing" : "Failing"}</span>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
