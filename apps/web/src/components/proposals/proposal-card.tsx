import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import { SerializedProposal } from "@/lib/actions/proposals";
import { cn } from "@/lib/utils";

interface ProposalCardProps {
  proposal: SerializedProposal;
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const progress = proposal.funding_goal > 0 
    ? (proposal.current_funding / proposal.funding_goal) * 100 
    : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800 bg-card transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="relative h-60 bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
        {/* Abstract background for project */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Globe className="h-32 w-32" />
        </div>
        
        {/* Status and region badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-md border shadow-sm px-3 py-1 font-bold uppercase tracking-widest text-[9px]">
            {proposal.region_tag || "Global Domain"}
          </Badge>
          <Badge className="w-fit bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-tighter">
             {proposal.status}
          </Badge>
        </div>

        {/* AI Score Badge */}
        <div className="absolute top-6 right-6">
          <div className="flex items-center gap-2 rounded-full bg-primary/90 backdrop-blur-md px-4 py-2 shadow-lg">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-black text-primary-foreground tracking-tight">
              {proposal.fairness_score}% Integrity
            </span>
          </div>
        </div>

        {/* Categories if any */}
        <div className="absolute bottom-6 left-6 flex gap-2">
           <Badge className="bg-neutral-900/50 text-white border-none backdrop-blur-sm text-[9px] uppercase font-bold">
              {proposal.category}
           </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-8 md:p-10">
        <div className="mb-8 flex-1">
          <h3 className="mb-3 text-2xl md:text-3xl font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
            {proposal.title}
          </h3>
          <p className="text-muted-foreground text-lg line-clamp-2 leading-relaxed">
            {proposal.description}
          </p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              <span>Protocol Backing</span>
              <span className="text-foreground font-black">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-900 pt-8">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">
                  Budget
                </span>
                <span className="text-xl font-bold">
                  ${proposal.budget_amount.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col border-l border-neutral-100 dark:border-neutral-900 pl-8">
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">
                  Voters
                </span>
                <span className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {proposal.voter_count}
                </span>
              </div>
            </div>
            <Link
              href={`/proposals/${proposal.id}`}
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "icon",
                }),
                "h-14 w-14 rounded-3xl border-2 transition-all hover:bg-primary hover:text-white hover:border-primary active:scale-95 shadow-xl shadow-transparent hover:shadow-primary/20",
              )}
            >
              <ArrowRight className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
