"use client";

import React, { useEffect, useState } from "react";
import {
  Gavel,
  Globe,
  MapPin,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Activity,
  ChevronDown,
  ChevronUp,
  User,
  DollarSign,
  AlertTriangle,
  Clock,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  fetchAllProposals,
  fetchConfig,
  SerializedProposal,
} from "@/lib/actions/proposals";
import type { Config } from "@/lib/types/api";
import {
  formatConfigPercent,
  formatPercent,
  getProposalVotingMetrics,
} from "@/lib/proposals/voting";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalDetailSheet } from "@/components/proposals/proposal-detail-sheet";
import { cn } from "@/lib/utils";

type GovernanceConfig = Omit<Config, "voting_period_ns"> & {
  voting_period_ns: number;
};

const ITEMS_PER_PAGE = 10;

export default function GovernancePage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<SerializedProposal[]>([]);
  const [config, setConfig] = useState<GovernanceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Sheet State
  const [selectedProposal, setSelectedProposal] = useState<SerializedProposal | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Accordion State
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAllProposals("Active"), fetchConfig()]).then(
      ([proposalsResult, configResult]) => {
        if (cancelled) return;

        setProposals(proposalsResult.success ? proposalsResult.proposals : []);
        setConfig(
          configResult.success && configResult.config
            ? configResult.config
            : null,
        );
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.ceil(proposals.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleProposals = proposals.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setExpandedRows({}); // Reset expanded rows on page change
    }
  };

  const openDetails = (proposal: SerializedProposal) => {
    setSelectedProposal(proposal);
    setIsSheetOpen(true);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background pb-20">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-8 md:px-12 shrink-0">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              Active Governance
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Participate in regional consensus. Your voting power is weighted
              by your reputation and residency proofs.
            </p>
          </div>

          {config && (
            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-xl bg-background border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  Global Quorum
                </p>
                <p className="text-sm font-black">
                  {formatConfigPercent(config.quorum_percent)}
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-background border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  Threshold
                </p>
                <p className="text-sm font-black">
                  {formatConfigPercent(config.majority_threshold)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-50/50 dark:bg-neutral-900/50">
                  <TableRow className="hover:bg-transparent border-b-neutral-200 dark:border-b-neutral-800">
                    <TableHead className="w-[350px] text-[10px] uppercase tracking-widest font-bold">Initiative</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold">Domain</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold">Consensus</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                    <TableHead className="text-right text-[10px] uppercase tracking-widest font-bold pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b-neutral-100 dark:border-b-neutral-900">
                        <TableCell><Skeleton className="h-5 w-64" /><Skeleton className="h-3 w-32 mt-2" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-40 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : proposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                          <Activity className="h-10 w-10 opacity-20" />
                          <p className="text-sm font-medium">No active voting rounds found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleProposals.map((proposal) => {
                      const endsAt = new Date(proposal.voting_ends_at / 1_000_000);
                      const isExpired = endsAt < new Date();
                      const votingMetrics = getProposalVotingMetrics(proposal);
                      const isExpanded = expandedRows[proposal.id];
                      const locationLabel = proposal.location.city ? `${proposal.location.city}, ${proposal.location.country}` : proposal.region_tag;

                      return (
                        <React.Fragment key={proposal.id}>
                          <TableRow className={cn("group transition-colors border-b-neutral-100 dark:border-b-neutral-900", isExpanded ? "bg-neutral-50/50 dark:bg-neutral-900/30" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50")}>
                            <TableCell className="py-4">
                              <div className="space-y-1.5 max-w-[350px]">
                                <p className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2 pr-4">
                                  {proposal.title}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                  <span>ID: {proposal.id}</span>
                                  {proposal.risk_flags && proposal.risk_flags.length > 0 && (
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                                      <AlertTriangle className="h-3 w-3" /> Flags
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold">{locationLabel}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-5 text-xs">
                                <div>
                                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Turnout</p>
                                  <p className="font-mono font-medium">{formatPercent(votingMetrics.turnoutPercent, 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Support</p>
                                  <p className={cn("font-mono font-medium", votingMetrics.supportPercent > 50 ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500")}>
                                    {formatPercent(votingMetrics.supportPercent, 0)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] uppercase tracking-widest px-2 py-0 font-bold">
                                  {proposal.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                  <Clock className="h-3 w-3" />
                                  {isExpired ? "Concluding..." : `Ends ${endsAt.toLocaleDateString()}`}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => toggleRow(proposal.id)}
                                  title={isExpanded ? "Collapse details" : "Expand details"}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => router.push(`/dashboard/explore?id=${proposal.id}`)}
                                  title="View on Map"
                                >
                                  <MapPin className="h-3.5 w-3.5 mr-1" /> Map
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => openDetails(proposal)}
                                  title="Quick Overview"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Peek
                                </Button>
                                <Link
                                  href={`/dashboard/proposals/detail?id=${proposal.id}`}
                                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 px-3 text-xs font-bold")}
                                >
                                  Vote
                                  <ArrowRight className="ml-1.5 h-3 w-3" />
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b-neutral-200 dark:border-b-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                              <TableCell colSpan={5} className="p-0">
                                <div className="px-8 py-6 flex flex-col lg:flex-row gap-8">
                                  {/* Left: Description */}
                                  <div className="flex-1 space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Proposal Overview</h4>
                                    <p className="text-sm text-foreground/80 leading-relaxed max-w-3xl">
                                      {proposal.description}
                                    </p>
                                    {proposal.risk_flags && proposal.risk_flags.length > 0 && (
                                      <div className="flex flex-wrap gap-2 pt-2">
                                        {proposal.risk_flags.map((flag: string) => (
                                          <Badge key={flag} variant="secondary" className="text-[10px] px-2 py-0 bg-neutral-200/50 dark:bg-neutral-800/50 text-muted-foreground">
                                            {flag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Right: Key Info Grid */}
                                  <div className="w-full lg:w-72 shrink-0 grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 bg-background border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Budget</span>
                                      </div>
                                      <p className="text-sm font-mono font-bold">
                                        ${proposal.budget_amount.toLocaleString()}
                                      </p>
                                    </div>
                                    <div className="space-y-1.5 bg-background border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl">
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <User className="h-3.5 w-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Submitter</span>
                                      </div>
                                      <p className="text-sm font-mono font-bold truncate">
                                        @{proposal.submitter.substring(0, 8)}...
                                      </p>
                                    </div>
                                    
                                    {proposal.risk_flags && proposal.risk_flags.length > 0 && (
                                      <div className="col-span-2 space-y-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl">
                                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          <span className="text-[10px] font-bold uppercase tracking-widest">AI Risk Flags</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-400 space-y-1">
                                          {proposal.risk_flags.map((flag, idx) => (
                                            <li key={idx} className="line-clamp-1" title={flag}>{flag}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-900/30">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{startIndex + 1}</span> to <span className="font-bold text-foreground">{Math.min(startIndex + ITEMS_PER_PAGE, proposals.length)}</span> of <span className="font-bold text-foreground">{proposals.length}</span> initiatives
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-xs font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProposalDetailSheet
        proposal={selectedProposal}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        mode="authenticated"
      />
    </div>
  );
}