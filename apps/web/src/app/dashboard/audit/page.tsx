import { fetchAuditLogs } from "@/lib/actions/proposals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, User, Terminal, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AuditLogPage() {
  const result = await fetchAuditLogs(100, 0);
  const logs = result.success ? result.logs : [];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-6 md:px-12 md:py-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Platform Transparency Ledger
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
              Real-time immutable audit trail of all governance and financial events on the Internet Computer.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-12">
        <div className="max-w-7xl mx-auto">
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-none rounded-2xl overflow-hidden">
            <CardHeader className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b p-6">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Live Event Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <div key={log.id} className="p-4 md:p-6 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border",
                            log.event_type.includes('Proposal') ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900" :
                            log.event_type.includes('Vote') ? "bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-950/30 dark:border-purple-900" :
                            "bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800"
                          )}>
                            <Clock className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter">
                                {log.event_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                ID: {log.id}
                              </span>
                            </div>
                            <p className="text-sm font-medium leading-tight">
                              {log.payload}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-widest pt-1">
                              <span className="flex items-center gap-1">
                                <User className="h-2.5 w-2.5" />
                                @{log.actor.substring(0, 8)}...
                              </span>
                              {log.proposal_id && (
                                <span className="flex items-center gap-1">
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  Prop #{log.proposal_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-muted-foreground">
                            {new Date(log.timestamp / 1000000).toLocaleTimeString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 uppercase font-black">
                            {new Date(log.timestamp / 1000000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center space-y-4">
                    <History className="h-12 w-12 mx-auto text-neutral-200 dark:text-neutral-800" />
                    <p className="text-sm text-muted-foreground">No audit entries found on the ledger yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
