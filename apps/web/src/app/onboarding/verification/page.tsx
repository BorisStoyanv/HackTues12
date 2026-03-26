"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  MapPin, 
  Map as MapIcon,
  Briefcase, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Globe,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

type Step = 'geo' | 'expertise' | 'complete';

export default function VerificationPage() {
  const router = useRouter();
  const setGeoVerified = useAuthStore((state) => state.setGeoVerified);
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState<Step>('geo');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Guard: if no role or wrong role, redirect back
  useEffect(() => {
    if (!user || user.role !== 'regional') {
      router.push('/onboarding/role');
    }
  }, [user, router]);

  const handleGeoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    // Simulate geo verification
    setTimeout(() => {
      setIsVerifying(false);
      setGeoVerified(true);
      setStep('expertise');
    }, 2000);
  };

  const handleExpertiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('complete');
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-xl space-y-8">
      {step === 'geo' && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Geographic Verification</CardTitle>
            <CardDescription>
              We need to verify your location to ensure you can participate in local governance.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleGeoSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="address">Residential Address</Label>
                <Input id="address" placeholder="123 Main St, Berlin, Germany" required />
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or use automated verification
                  </span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 gap-2"
                onClick={() => {
                  setIsVerifying(true);
                  setTimeout(() => {
                    setIsVerifying(false);
                    setGeoVerified(true);
                    setStep('expertise');
                  }, 2000);
                }}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                Verify via IP / Browser GPS
              </Button>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Your location data is processed locally and never stored on-chain. Only a zero-knowledge proof of residency is generated.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="ghost" type="button" onClick={() => router.push('/onboarding/role')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Next'}
                {!isVerifying && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 'expertise' && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Expertise Portfolio</CardTitle>
            <CardDescription>
              Linking your professional background increases your Reputation Attribute ($V_p$) in relevant categories.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleExpertiseSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Primary Area of Expertise</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infra">Infrastructure & Urban Planning</SelectItem>
                    <SelectItem value="edu">Education & Research</SelectItem>
                    <SelectItem value="env">Environmental Science</SelectItem>
                    <SelectItem value="tech">Technology & Software</SelectItem>
                    <SelectItem value="health">Healthcare & Wellness</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
                <Input id="linkedin" placeholder="https://linkedin.com/in/username" />
              </div>

              <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                <Briefcase className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Upload CV or Professional Certifications</p>
                <p className="text-xs text-muted-foreground">PDF (max 5MB)</p>
              </div>

              <div className="p-4 rounded-lg border bg-neutral-50 dark:bg-neutral-900 space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">Projected Voting Weight</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[65%]" />
                  </div>
                  <span className="text-sm font-bold text-primary">1.65x</span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  *This is an estimate based on your provided location and expertise.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="ghost" type="button" onClick={() => setStep('geo')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit">
                Complete Onboarding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 'complete' && (
        <Card className="border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="h-2 bg-primary" />
          <CardHeader className="text-center pt-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
              <Globe className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Welcome, Citizen</CardTitle>
            <CardDescription className="text-lg">
              Your regional profile is active. Your current reputation score is <span className="font-bold text-foreground">150 $V_p$</span>.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 pb-12">
            <Button className="w-full h-12 text-lg font-bold" onClick={() => router.push('/explore')}>
              Explore Local Projects
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You can increase your reputation by participating in debates and casting accurate votes.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
