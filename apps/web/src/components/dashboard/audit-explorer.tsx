"use client";

import { useState, useMemo } from "react";
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Copy, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  ShieldAlert,
  TerminalSquare,
  FileSignature,
  Activity
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SerializedAuditLog } from "@/lib/actions/proposals";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuditExplorerProps {
  initialLogs: SerializedAuditLog[];
}

export function AuditExplorer({ initialLogs }: AuditExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const uniqueEventTypes = useMemo(() => {
    const types = new Set(initialLogs.map(log => log.event_type));
    return Array.from(types).sort();
  }, [initialLogs]);

  const filteredLogs = useMemo(() => {
    let result = [...initialLogs];

    if (eventTypeFilter !== "all") {
      result = result.filter(log => log.event_type === eventTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.payload.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q) ||
        (log.proposal_id && log.proposal_id.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortDirection === "desc") {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });

    return result;
  }, [initialLogs, searchQuery, eventTypeFilter, sortDirection]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const getEventIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("vote") || t.includes("consensus")) return <Activity className="w-4 h-4 text-purple-500" />;
    if (t.includes("proposal")) return <FileSignature className="w-4 h-4 text-blue-500" />;
    if (t.includes("contract") || t.includes("escrow") || t.includes("fund")) return <Database className="w-4 h-4 text-emerald-500" />;
    if (t.includes("admin") || t.includes("system")) return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    return <TerminalSquare className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col h-full space-y-6 min-h-0">
      {/* Filters & Controls */}
      <div className="shrink-0 flex flex-col sm:flex-row items-center gap-4 bg-background border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search payload, actor principal, or ID..." 
            className="pl-9 h-10 w-full bg-muted/50 border-none"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
          <Select value={eventTypeFilter} onValueChange={(val) => { setEventTypeFilter(val as string); setCurrentPage(1); }}>
            <SelectTrigger className="h-10 w-full sm:w-[180px] bg-muted/50 border-none">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Events" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {uniqueEventTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 shrink-0 border-none bg-muted/50"
            onClick={() => setSortDirection(prev => prev === "desc" ? "asc" : "desc")}
            title={`Sort ${sortDirection === "desc" ? "Oldest First" : "Newest First"}`}
          >
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="shrink-0 flex items-center gap-4 text-xs font-medium text-muted-foreground px-2">
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          {filteredLogs.length} Records Found
        </span>
      </div>

      {/* Ledger Table */}
      <Card className="flex-1 flex flex-col min-h-0 border-border shadow-sm rounded-2xl overflow-hidden bg-background">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest w-[180px]">Transaction ID</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest w-[140px]">Date & Time</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest w-[180px]">Event Type</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">Payload Data</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest w-[160px]">Initiator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-foreground/80">
                          {log.id.length > 12 ? `${log.id.substring(0, 12)}...` : log.id.padStart(8, '0')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(log.id)}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col">
                        <span className="text-foreground/90 font-medium">
                          {new Date(log.timestamp / 1000000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.timestamp / 1000000).toLocaleTimeString(undefined, { hour12: false })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-muted">
                          {getEventIcon(log.event_type)}
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] bg-background">
                          {log.event_type}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top max-w-sm">
                      <div className="flex flex-col space-y-1.5">
                        <p className="text-xs text-foreground/90 font-medium truncate" title={log.payload}>
                          {log.payload}
                        </p>
                        {log.proposal_id && (
                          <Link 
                            href={`/proposals/${log.proposal_id}`}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline w-fit"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Reference Prop #{log.proposal_id}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]" title={log.actor}>
                          @{log.actor.substring(0, 10)}...
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => copyToClipboard(log.actor)}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <History className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-foreground">No ledger entries found</p>
                    <p className="text-xs text-muted-foreground mt-1">Adjust your filters to see more results.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-medium text-foreground">{filteredLogs.length}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Logic to show a window of pages around current page
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                    }
                    if (currentPage > totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn("h-8 w-8 p-0", currentPage === pageNum && "pointer-events-none")}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
