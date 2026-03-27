"use client";

import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, User, Globe, ShieldCheck, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { updateMyProfileClient } from "@/lib/api/client-mutations";

export default function SettingsPage() {
  const { user, identity, initialize } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [homeRegion, setHomeRegion] = useState(user?.home_region || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setHomeRegion(user.home_region || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!identity) return;
    setIsSubmitting(true);
    try {
      await updateMyProfileClient(identity, displayName, homeRegion || null);
      await initialize(); // Refresh store
      alert("Profile updated on-chain.");
    } catch (error) {
      console.error(error);
      alert("Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-12 shrink-0">
        <div className="max-w-4xl mx-auto space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Account Settings
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Configure your public profile and regional anchoring preferences on the protocol.
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b bg-neutral-50/50 dark:bg-neutral-900/50 p-6 md:p-8">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                 <User className="h-4 w-4 text-primary" />
                 Public Profile
               </CardTitle>
               <CardDescription>This information is stored on the public ledger.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-6">
               <div className="space-y-2">
                  <Label htmlFor="display_name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</Label>
                  <Input 
                    id="display_name" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Satoshi Nakamoto"
                    className="h-11 rounded-xl"
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="home_region" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Home Region Tag</Label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="home_region" 
                      value={homeRegion} 
                      onChange={(e) => setHomeRegion(e.target.value)}
                      placeholder="e.g. sofia_urban"
                      className="h-11 pl-10 rounded-xl font-mono text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Your primary region for governance notifications and weighting.</p>
               </div>
            </CardContent>
            <CardFooter className="bg-neutral-50/50 dark:bg-neutral-900/50 border-t p-6 md:px-8">
               <Button 
                 onClick={handleSave} 
                 disabled={isSubmitting || !identity}
                 className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20 h-11 ml-auto"
               >
                 {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                 Save Profile to Ledger
               </Button>
            </CardFooter>
          </Card>

          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 md:p-8">
               <CardTitle className="text-lg font-bold flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4 text-primary" />
                 Protocol Security
               </CardTitle>
               <CardDescription>Cryptographic identity details provided by Internet Identity.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 md:px-8 pb-8 space-y-4">
               <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Principal ID</p>
                  <p className="text-xs font-mono break-all font-semibold">{user?.id || 'Initializing...'}</p>
               </div>
               <div className="flex items-center gap-3 p-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs font-medium text-muted-foreground italic">Authenticated via Secure Subnet</p>
               </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
