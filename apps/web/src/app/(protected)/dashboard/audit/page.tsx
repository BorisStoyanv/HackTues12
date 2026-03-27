"use client";

import { fetchAuditLogs } from "@/lib/actions/proposals";
import { History } from "lucide-react";
import { AuditExplorer } from "@/components/dashboard/audit-explorer";
import { useEffect, useState } from "react";
import type { SerializedAuditLog } from "@/lib/actions/proposals";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<SerializedAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchAuditLogs(500, 0).then((result) => {
      if (cancelled) return;
      setLogs(result.success ? result.logs : []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Platform Transparency Ledger
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Real-time immutable audit trail of all governance and financial events on the Internet Computer.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="h-10 px-4 bg-background border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center gap-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Live Sync Active</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-6 py-8 md:px-12">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col min-h-0">
          <AuditExplorer initialLogs={logs} />
        </div>
      </div>
    </div>
  );
}
