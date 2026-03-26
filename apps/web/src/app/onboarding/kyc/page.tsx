"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileText,
  ShieldCheck
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
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

type Step = 'details' | 'upload' | 'processing' | 'complete';

export default function KYCPage() {
  const router = useRouter();
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState<Step>('details');
  const [isUploading, setIsUploading] = useState(false);
  
  // Guard: if no role or wrong role, redirect back
  useEffect(() => {
    if (!user || user.role !== 'funder') {
      router.push('/onboarding/role');
    }
  }, [user, router]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('upload');
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false);
      setStep('processing');
    }, 1500);
  };

  useEffect(() => {
    if (step === 'processing') {
      // Simulate verification processing
      const timer = setTimeout(() => {
        setKycStatus('verified');
        setStep('complete');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, setKycStatus]);

  if (!user) return null;

  return (
    <div className="w-full max-w-xl space-y-8">
      {step === 'details' && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Entity Details</CardTitle>
            <CardDescription>
              Provide information about your organization to begin the KYC process.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleDetailsSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input id="orgName" placeholder="e.g. Global Impact Fund" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regNum">Registration Number</Label>
                <Input id="regNum" placeholder="e.g. 12345678-A" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country of Operation</Label>
                <Input id="country" placeholder="e.g. United States" required />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="ghost" type="button" onClick={() => router.push('/onboarding/role')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 'upload' && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Document Upload</CardTitle>
            <CardDescription>
              Upload your tax-exempt status (e.g. 501(c)(3)) or organizational charter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer group">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">PDF, PNG, JPG (max. 10MB)</p>
              </div>
            </div>

            <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 flex items-center gap-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">charter_v2_final.pdf</p>
                <p className="text-xs text-muted-foreground">Uploaded 2 mins ago</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="ghost" onClick={() => setStep('details')} disabled={isUploading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Submit for Verification
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 'processing' && (
        <Card className="border-neutral-200 dark:border-neutral-800 py-12">
          <CardContent className="flex flex-col items-center text-center space-y-6">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold italic">Analyzing documents...</CardTitle>
              <CardDescription className="max-w-xs text-base">
                Our AI agents are cross-referencing your entity details against global regulatory databases.
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && (
        <Card className="border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardHeader className="text-center pt-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">Verification Successful</CardTitle>
            <CardDescription className="text-lg">
              Your entity has been verified. You can now start deploying capital.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 pb-12">
            <Button className="w-full h-12 text-lg font-bold" onClick={() => router.push('/dashboard')}>
              Go to Investor Dashboard
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A copy of your verification report has been sent to your email.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
