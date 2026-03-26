"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { investorAckContractClient, companyAckContractClient } from "@/lib/api/client-mutations";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export function ContractSigningInterface({ contractId }: { contractId: string }) {
  const { identity, user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSign = async () => {
    if (!identity) return;
    setIsSubmitting(true);
    try {
      // In a real app, we check the role to determine which ack to call.
      // For this hackathon version, we'll try to sign as investor if the role is 'funder'
      if (user?.role === 'funder') {
        await investorAckContractClient(identity, contractId);
      } else {
        await companyAckContractClient(identity, contractId);
      }
      alert("Cryptographic signature committed to the ledger.");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Signature failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button 
      className="w-full h-16 text-xl font-black rounded-2xl shadow-2xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] transition-all" 
      disabled={isSubmitting || !identity}
      onClick={handleSign}
    >
      {isSubmitting ? (
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          Signing...
        </div>
      ) : (
        <div className="flex items-center gap-3">
          Execute Protocol
          <ShieldCheck className="w-6 h-6" />
        </div>
      )}
    </Button>
  );
}
