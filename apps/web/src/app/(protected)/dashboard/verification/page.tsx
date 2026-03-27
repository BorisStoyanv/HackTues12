"use client";

import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCheck, MapPin, Award, AlertCircle, Loader2, CheckCircle2, Globe, ArrowRight } from "lucide-react";
import { useState } from "react";
import { requestVerificationClient } from "@/lib/api/client-mutations";
import { cn } from "@/lib/utils";

export default function VerificationPage() {
  const router = useRouter();
  const { user, identity } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestVerification = async () => {
    if (!identity) return;
    setIsSubmitting(true);
    try {
      await requestVerificationClient(identity);
      alert("Verification request submitted to the ledger.");
      // In a real app, we'd trigger a profile refresh here
    } catch (error) {
      console.error(error);
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-12 shrink-0">
        <div className="max-w-4xl mx-auto space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Identity & Reputation
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Manage your cryptographic standing and regional verification status on the OpenFairTrip protocol.
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Status Overview */}
          <div className="grid gap-6 md:grid-cols-2">
             <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-[10px] uppercase font-black tracking-widest">Protocol Status</CardDescription>
                   <CardTitle className="text-xl font-bold flex items-center justify-between">
                      {user?.kyc_status === 'verified' ? 'Verified Participant' : 'Basic Identity'}
                      <Badge className={cn(
                        "rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest",
                        user?.kyc_status === 'verified' ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                      )}>
                         {user?.kyc_status || 'Unverified'}
                      </Badge>
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-900 mt-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                           <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-0.5">
                           <p className="text-sm font-bold tracking-tight">Trust Level 1</p>
                           <p className="text-xs text-muted-foreground">Standard voting & submission rights enabled.</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full rounded-xl font-bold"
                        onClick={() => router.push('/dashboard/verification/status')}
                      >
                        Track Veriff Session
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20">
                <CardHeader className="pb-2">
                   <CardDescription className="text-[10px] uppercase font-black tracking-widest opacity-70 text-primary-foreground">Network Weight</CardDescription>
                   <CardTitle className="text-4xl font-black tracking-tighter">
                      {typeof user?.reputation === "number" ? user.reputation.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"} <span className="text-sm font-bold opacity-60 uppercase tracking-widest ml-1">Reputation</span>
                   </CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-xs font-medium leading-relaxed opacity-80 pt-2">
                      Base trust score stored on-chain and used in voting power calculations.
                   </p>
                </CardContent>
             </Card>
          </div>

          {/* Regional Verification */}
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-none rounded-2xl overflow-hidden border-dashed">
             <CardHeader className="p-8">
                <div className="flex items-start justify-between gap-4">
                   <div className="space-y-1">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                         <MapPin className="h-5 w-5 text-primary" />
                         Regional Anchor
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed max-w-2xl">
                         Linking your identity to a physical region increases your voting power multiplier by up to 2.5x for local proposals.
                      </CardDescription>
                   </div>
                   {user?.geo_verified && (
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                         <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </div>
                   )}
                </div>
             </CardHeader>
             <CardContent className="px-8 pb-8 space-y-6">
                <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-background border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shadow-sm">
                         <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5">
                         <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Anchor</p>
                         <p className="text-lg font-bold tracking-tight">{user?.detected_location?.city || 'Not Anchored'}</p>
                      </div>
                   </div>
                   {!user?.geo_verified ? (
                      <Button 
                        onClick={handleRequestVerification} 
                        disabled={isSubmitting}
                        className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20 h-11"
                      >
                         {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Geo-Verification'}
                      </Button>
                   ) : (
                      <Badge variant="secondary" className="px-4 py-1 rounded-full font-black uppercase text-[10px] tracking-widest">
                         Location Verified
                      </Badge>
                   )}
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
                   <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                   <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                      Verification requires signing a cryptographic proof of residency. This is handled via the OpenFairTrip mobile app or verified regional nodes.
                   </p>
                </div>
             </CardContent>
          </Card>

          {/* Expert Standing */}
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden grayscale opacity-60">
             <CardHeader className="p-8">
                <div className="flex items-start justify-between">
                   <div className="space-y-1">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-neutral-400">
                         <Award className="h-5 w-5" />
                         Expert Domain Standing
                      </CardTitle>
                      <CardDescription className="text-sm">
                         (Coming Soon) Provide proof of expertise in Infrastructure, Education, or Environment to increase influence in specialized governance rounds.
                      </CardDescription>
                   </div>
                   <Badge variant="outline" className="rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-widest">Locked</Badge>
                </div>
             </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
