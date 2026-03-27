import { ProposalExplorer } from "@/components/explorer/proposal-explorer";
import { buttonVariants } from "@/components/ui/button";
import {
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { fetchAllProposals } from "@/lib/actions/proposals";

export default async function PublicExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery = "" } = await searchParams;
  const result = await fetchAllProposals();
  
  const proposals = result.success && result.proposals ? result.proposals : [];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Mini Navigation */}
      <header className="z-50 border-b bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold tracking-tight hidden sm:inline-block">
                OpenFairTrip
              </span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <form action="/explore" className="relative w-64 hidden md:block">
               <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Search projects..."
                className="pl-3 h-9 w-full rounded-md bg-muted/50 border-none text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </form>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={buttonVariants({
                size: "sm",
                className: "h-8",
              })}
            >
              Sign In to Vote
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
         <ProposalExplorer 
           proposals={proposals} 
           mode="public" 
           searchQuery={searchQuery} 
         />
      </main>
    </div>
  );
}
