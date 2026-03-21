import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { createYearCycle, updateYearCycle } from "@/lib/db";
import type { YearCycle } from "@/lib/types";
import { Settings, Calendar, CheckCircle, Lock, Loader2, ExternalLink, PlusCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type ConfirmAction = "close" | "submit" | "rollover";

export default function YearRolloverPage() {
  const { yearCycles, refresh } = useYearCycle();
  const [confirm,   setConfirm]   = useState<{ action: ConfirmAction; yc: YearCycle } | null>(null);
  const [reportUrl, setReportUrl] = useState("");
  const [saving,    setSaving]    = useState(false);

  // The highest year currently in the system
  const maxYear = yearCycles.length > 0 ? Math.max(...yearCycles.map(y => y.year)) : new Date().getFullYear();
  const nextYear = maxYear + 1;
  // Only show Add Next Year if no year cycle for nextYear exists yet
  const hasNextYear = yearCycles.some(y => y.year === nextYear);
  // Active year cycle
  const activeYc = yearCycles.find(y => y.isActive && !y.isClosed) ?? null;

  async function handleClose(yc: YearCycle) {
    setSaving(true);
    try {
      await updateYearCycle(yc.id, { isClosed: true, isActive: false });
      refresh();
      setConfirm(null);
    } finally { setSaving(false); }
  }

  async function handleSubmitReport(yc: YearCycle) {
    if (!reportUrl) return;
    setSaving(true);
    try {
      await updateYearCycle(yc.id, {
        annualReportUrl:   reportUrl,
        reportSubmittedAt: new Date().toISOString(),
        reportSubmittedBy: "Admin",
      });
      refresh();
      setConfirm(null);
      setReportUrl("");
    } finally { setSaving(false); }
  }

  async function handleRollover(currentYc: YearCycle) {
    setSaving(true);
    try {
      // 1. Close + deactivate current active year
      await updateYearCycle(currentYc.id, { isClosed: true, isActive: false });
      // 2. Create new year cycle
      await createYearCycle({
        year:              nextYear,
        isActive:          true,
        isClosed:          false,
        annualReportUrl:   null,
        reportSubmittedAt: null,
        reportSubmittedBy: null,
      });
      refresh();
      setConfirm(null);
    } finally { setSaving(false); }
  }

  return (
    <AppLayout title="Year Rollover">
      <div className="max-w-3xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Settings className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Year Cycle Management</p>
              <p className="text-xs text-slate-500">Manage ISO year cycles — close completed years and roll over to the next</p>
            </div>
          </div>

          {/* Add Next Year button — shown only when no future year exists */}
          {!hasNextYear && (
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => activeYc
                ? setConfirm({ action: "rollover", yc: activeYc })
                : handleRollover({ id: "", year: maxYear, isActive: false, isClosed: true, annualReportUrl: null, reportSubmittedAt: null, reportSubmittedBy: null })
              }
            >
              <PlusCircle className="h-4 w-4" />
              Add Year {nextYear}
            </Button>
          )}
        </div>

        {/* Year cards */}
        {yearCycles.map(yc => (
          <Card key={yc.id} className={cn(
            "border transition-all",
            yc.isActive && !yc.isClosed ? "border-blue-200 bg-blue-50/30"
              : yc.isClosed ? "border-slate-200 opacity-75"
              : "border-slate-200"
          )}>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Year {yc.year}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {yc.isActive && !yc.isClosed && (
                    <Badge className="text-xs bg-green-100 text-green-700 border-green-200 border">Active</Badge>
                  )}
                  {yc.isClosed && (
                    <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200 border flex items-center gap-1">
                      <Lock className="h-3 w-3" />Closed
                    </Badge>
                  )}
                  {!yc.isActive && !yc.isClosed && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Annual Report row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Annual Report</p>
                  {yc.annualReportUrl ? (
                    <a href={yc.annualReportUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" />View Report
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">Not submitted</p>
                  )}
                  {yc.reportSubmittedAt && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted {format(new Date(yc.reportSubmittedAt), "d MMM yyyy")}
                      {yc.reportSubmittedBy && ` by ${yc.reportSubmittedBy}`}
                    </p>
                  )}
                </div>
                {!yc.isClosed && (
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => { setReportUrl(yc.annualReportUrl ?? ""); setConfirm({ action: "submit", yc }); }}>
                    {yc.annualReportUrl ? "Update Report" : "Submit Report"}
                  </Button>
                )}
              </div>

              {/* Action buttons */}
              {!yc.isClosed && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                  {/* Rollover button — only for the active year & only if next year doesn't exist */}
                  {yc.isActive && !hasNextYear && (
                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setConfirm({ action: "rollover", yc })}>
                      <ArrowRight className="h-3.5 w-3.5" />
                      Rollover to Year {nextYear}
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" className="h-8 text-xs"
                    onClick={() => setConfirm({ action: "close", yc })}>
                    <Lock className="h-3.5 w-3.5 mr-1.5" />Close Year {yc.year}
                  </Button>
                  <p className="w-full text-[11px] text-slate-400">
                    "Close Year" locks data without creating a new year. "Rollover" closes this year and opens Year {nextYear}.
                  </p>
                </div>
              )}
              {yc.isClosed && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                  <CheckCircle className="h-4 w-4" />Year {yc.year} is closed and locked
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Rollover Confirm Dialog ── */}
      <Dialog open={confirm?.action === "rollover"} onOpenChange={v => !v && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-blue-700 flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Rollover to Year {nextYear}?
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600 space-y-2">
            <p>This will:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Close and lock <strong>Year {confirm?.yc.year}</strong></li>
              <li>Create a new active <strong>Year {nextYear}</strong></li>
            </ul>
            <p className="text-xs text-slate-400 pt-1">Existing data for Year {confirm?.yc.year} will be preserved and read-only.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving}
              onClick={() => confirm && handleRollover(confirm.yc)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />}
              Confirm Rollover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Year Confirm Dialog ── */}
      <Dialog open={confirm?.action === "close"} onOpenChange={v => !v && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <Lock className="h-5 w-5" />Close Year {confirm?.yc.year}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently close Year <strong>{confirm?.yc.year}</strong> and lock all its data. This does <strong>not</strong> create a new year cycle.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={() => confirm && handleClose(confirm.yc)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
              Close Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Report Dialog ── */}
      <Dialog open={confirm?.action === "submit"} onOpenChange={v => !v && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit Annual Report — {confirm?.yc.year}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">Report URL *</Label>
            <Input value={reportUrl} onChange={e => setReportUrl(e.target.value)}
              placeholder="https://drive.google.com/..." className="mt-1 h-9 text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button disabled={saving || !reportUrl} onClick={() => confirm && handleSubmitReport(confirm.yc)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
