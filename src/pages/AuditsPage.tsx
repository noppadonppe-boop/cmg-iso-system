import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYearCycle } from "@/context/YearCycleContext";
import { getAudits, updateAudit, getDepartments } from "@/lib/db";
import type { AuditPlan, Department } from "@/lib/types";
import { ShieldCheck, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_FLOW: Record<string, string> = {
  PLANNED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED", COMPLETED: "CLOSED",
};

const STATUS_COLOR: Record<string, string> = {
  PLANNED:     "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED:   "bg-green-100 text-green-700 border-green-200",
  CLOSED:      "bg-slate-100 text-slate-500 border-slate-200",
};

export default function AuditsPage() {
  const { selectedYear } = useYearCycle();
  const [audits,  setAudits]  = useState<AuditPlan[]>([]);
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType,   setFilterType]   = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [a, d] = await Promise.all([getAudits(selectedYear.id), getDepartments()]);
      setAudits(a); setDepts(d);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = audits.filter(a => {
    if (filterType   !== "ALL" && a.auditType !== filterType)   return false;
    if (filterStatus !== "ALL" && a.status    !== filterStatus) return false;
    return true;
  });

  async function advanceStatus(audit: AuditPlan) {
    const next = STATUS_FLOW[audit.status];
    if (!next) return;
    setUpdating(audit.id);
    try { await updateAudit(audit.id, { status: next }); fetchData(); }
    finally { setUpdating(null); }
  }

  return (
    <AppLayout title="Audit Plans">
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.keys(STATUS_COLOR).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <div className="ml-auto text-sm text-slate-500">{filtered.length} audit{filtered.length !== 1 ? "s" : ""}</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : (
        <Card className="border border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />Audit Plans — {selectedYear?.year}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No audit plans found</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(audit => {
                  const dept = depts.find(d => d.id === audit.departmentId);
                  const next = STATUS_FLOW[audit.status];
                  return (
                    <div key={audit.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 text-sm">
                      <div className="w-24 text-xs text-slate-500 font-mono shrink-0">
                        {format(new Date(audit.scheduledDate), "d MMM yyyy")}
                      </div>
                      <Badge className={cn("text-[10px] shrink-0", audit.auditType === "INTERNAL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                        {audit.auditType === "INTERNAL" ? "INT" : "EXT"} R{audit.roundNumber}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-800">{audit.auditee?.name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{audit.auditee?.department?.code ?? dept?.code}</span>
                      </div>
                      {audit.auditor && (
                        <span className="text-xs text-slate-500 hidden md:block">Auditor: {audit.auditor.name}</span>
                      )}
                      <Badge className={cn("text-[10px] shrink-0", STATUS_COLOR[audit.status])}>{audit.status}</Badge>
                      {audit.cpars.length > 0 && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />{audit.cpars.length}
                        </span>
                      )}
                      {next && (
                        <Button size="xs" variant="outline" disabled={!!updating} onClick={() => advanceStatus(audit)} className="shrink-0 text-xs">
                          {updating === audit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : `→ ${next}`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
