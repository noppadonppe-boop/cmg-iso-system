import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYearCycle } from "@/context/YearCycleContext";
import { getAudits, getDepartments } from "@/lib/db";
import type { AuditPlan, Department } from "@/lib/types";
import { Printer, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_COLOR: Record<string, string> = {
  PLANNED:    "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS:"bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED:  "bg-green-100 text-green-700 border-green-200",
  CLOSED:     "bg-slate-100 text-slate-500 border-slate-200",
};

export default function MasterPlanPage() {
  const { selectedYear } = useYearCycle();
  const [audits, setAudits]   = useState<AuditPlan[]>([]);
  const [depts,  setDepts]    = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const [a, d] = await Promise.all([getAudits(selectedYear.id), getDepartments()]);
      setAudits(a); setDepts(d);
    } finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = audits.filter(a => filterType === "ALL" || a.auditType === filterType);

  // Group by dept
  const byDept = depts.map(dept => ({
    dept,
    rounds: filtered.filter(a => a.auditee?.department?.id === dept.id || a.departmentId === dept.id),
  })).filter(d => d.rounds.length > 0);

  // Group audits by month
  const auditsByMonth = MONTHS.map((_, i) =>
    filtered.filter(a => new Date(a.scheduledDate).getMonth() === i)
  );

  return (
    <AppLayout title="Master Audit Plan">
      <div className="no-print flex flex-wrap gap-3 mb-5">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9"><Loader2 className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9"><Printer className="h-4 w-4 mr-1.5" />Print Plan</Button>
        <div className="ml-auto flex gap-2 text-xs items-center">
          {Object.entries(STATUS_COLOR).map(([k,v]) => (
            <span key={k} className={cn("px-2 py-0.5 rounded border text-[10px] font-medium", v)}>{k}</span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Audit Master Plan — {selectedYear?.year} ({filtered.length} audits)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-32">Department</th>
                  {MONTHS.map(m => (
                    <th key={m} className="px-2 py-2.5 font-semibold text-slate-600 text-center min-w-[64px]">{m}</th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-slate-600 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {byDept.map(({ dept, rounds }) => (
                  <tr key={dept.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700">
                      <div>{dept.code}</div>
                      <div className="text-[10px] text-slate-400">{dept.name}</div>
                    </td>
                    {MONTHS.map((_, mi) => {
                      const monthAudits = rounds.filter(a => new Date(a.scheduledDate).getMonth() === mi);
                      return (
                        <td key={mi} className="px-1 py-1.5 text-center">
                          {monthAudits.map(a => (
                            <div key={a.id} title={`${a.auditType} R${a.roundNumber} — ${a.status}`}
                              className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border mb-0.5 cursor-default", STATUS_COLOR[a.status] ?? "bg-slate-100 text-slate-600")}>
                              {a.auditType === "INTERNAL" ? "INT" : "EXT"} R{a.roundNumber}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold text-slate-700">{rounds.length}</td>
                  </tr>
                ))}
                {/* Monthly totals row */}
                <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                  <td className="px-4 py-2 text-slate-600 text-xs">Monthly Total</td>
                  {auditsByMonth.map((monthAudits, mi) => (
                    <td key={mi} className="px-1 py-2 text-center text-slate-700 text-xs">
                      {monthAudits.length > 0 ? monthAudits.length : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-slate-700">{filtered.length}</td>
                </tr>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">No audit plans for {selectedYear?.year}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent audits list */}
      {!loading && filtered.length > 0 && (
        <Card className="border border-slate-200 mt-5">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">Audit Schedule Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {filtered.slice().sort((a,b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()).map(audit => (
                <div key={audit.id} className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-slate-50">
                  <div className="w-24 text-xs text-slate-500 font-mono shrink-0">
                    {format(new Date(audit.scheduledDate), "d MMM yyyy")}
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", audit.auditType === "INTERNAL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                    {audit.auditType} R{audit.roundNumber}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800">{audit.auditee?.name}</span>
                    <span className="text-slate-400 ml-2 text-xs">{audit.auditee?.department?.code}</span>
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", STATUS_COLOR[audit.status])}>{audit.status}</Badge>
                  {audit.cpars.length > 0 && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                      {audit.cpars.length} CPAR{audit.cpars.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
