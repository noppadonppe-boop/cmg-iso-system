import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getAuditors, updateAuditor } from "@/lib/db";
import type { AuditorProfile } from "@/lib/types";
import { ShieldCheck, Loader2, RefreshCw, CheckCircle, XCircle, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuditorsPage() {
  const [auditors, setAuditors] = useState<AuditorProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<AuditorProfile | null>(null);
  const [saving,   setSaving]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setAuditors(await getAuditors()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleActive(a: AuditorProfile) {
    const canActivate = a.iso9001ExamPassed && a.iso45001ExamPassed && a.iso9001CertUrl && a.iso45001CertUrl;
    if (!a.isActiveAuditor && !canActivate) {
      alert("Rule 4: Auditor must pass both exams and upload both certificates before activation.");
      return;
    }
    setSaving(true);
    try {
      await updateAuditor(a.id, { isActiveAuditor: !a.isActiveAuditor });
      fetchData();
    } finally { setSaving(false); }
  }

  const active   = auditors.filter(a => a.isActiveAuditor).length;
  const inactive = auditors.filter(a => !a.isActiveAuditor).length;

  return (
    <AppLayout title="Auditor Management">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <CheckCircle className="h-4 w-4" />Active: {active}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <XCircle className="h-4 w-4" />Inactive: {inactive}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auditors.map(a => (
            <Card key={a.id} className={cn("border transition-all", a.isActiveAuditor ? "border-green-200 bg-green-50/30" : "border-slate-200")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", a.isActiveAuditor ? "bg-green-600" : "bg-slate-400")}>
                      {a.user?.name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{a.user?.name}</p>
                      <p className="text-xs text-slate-500">{a.user?.email}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] border", a.isActiveAuditor ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                    {a.isActiveAuditor ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Certification status */}
                <div className="space-y-1.5 mb-3">
                  {[
                    { label: "ISO 9001 Exam",  passed: a.iso9001ExamPassed },
                    { label: "ISO 45001 Exam", passed: a.iso45001ExamPassed },
                    { label: "ISO 9001 Cert",  passed: !!a.iso9001CertUrl },
                    { label: "ISO 45001 Cert", passed: !!a.iso45001CertUrl },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{item.label}</span>
                      {item.passed
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setSelected(a)}>
                    <Award className="h-3.5 w-3.5 mr-1" />Details
                  </Button>
                  <Button size="sm" className={cn("flex-1 h-8 text-xs", a.isActiveAuditor ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700")}
                    onClick={() => toggleActive(a)} disabled={saving}>
                    {a.isActiveAuditor ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-600" />{selected?.user?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["ISO 9001 Exam",  selected?.iso9001ExamPassed  ? "✅ Passed" : "❌ Not passed"],
                ["ISO 45001 Exam", selected?.iso45001ExamPassed ? "✅ Passed" : "❌ Not passed"],
                ["ISO 9001 Cert",  selected?.iso9001CertUrl     ? "✅ Uploaded" : "❌ Missing"],
                ["ISO 45001 Cert", selected?.iso45001CertUrl    ? "✅ Uploaded" : "❌ Missing"],
              ].map(([l,v]) => (
                <div key={l as string} className="bg-slate-50 rounded p-2.5 border border-slate-100">
                  <p className="text-slate-400 text-[10px] uppercase font-semibold">{l}</p>
                  <p className="text-slate-700 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {selected?.iso9001CertUrl && <a href={selected.iso9001CertUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline">📎 ISO 9001 Certificate</a>}
            {selected?.iso45001CertUrl && <a href={selected.iso45001CertUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline">📎 ISO 45001 Certificate</a>}
          </div>
          <DialogFooter><Button onClick={() => setSelected(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
