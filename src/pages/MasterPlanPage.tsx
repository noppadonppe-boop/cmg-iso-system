import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useYearCycle } from "@/context/YearCycleContext";
import { getAudits, getCpars, getDepartments } from "@/lib/db";
import type { AuditPlan, CPAR, Department } from "@/lib/types";
import { getDepartmentColor } from "@/lib/department-colors";
import { AlertTriangle, Calendar, CheckCircle2, Clock3, Loader2, Minus, Plus, Printer, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRINT_ZOOM_MIN = 50;
const PRINT_ZOOM_MAX = 150;
const PRINT_MARGIN_PX = 38;
const PREVIEW_PAPER_SCALE = 0.75;

type PrintOrientation = "portrait" | "landscape";
type PrintPaper = "A3" | "A4";

const PAPER_DIMENSIONS: Record<PrintPaper, { width: number; height: number }> = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1587 },
};

type DepartmentRow = {
  dept: Department;
  audits: AuditPlan[];
};

type LinkedCpar = {
  id: string;
  status: string;
};

function auditDepartmentId(audit: AuditPlan) {
  // The department is determined by the auditee selected in Audit schedule.
  return audit.auditee?.department?.id || audit.departmentId || "unassigned";
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "d MMM yyyy");
}

export default function MasterPlanPage() {
  const { selectedYear } = useYearCycle();
  const [audits, setAudits] = useState<AuditPlan[]>([]);
  const [cpars, setCpars] = useState<CPAR[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>("landscape");
  const [printPaper, setPrintPaper] = useState<PrintPaper>("A4");
  const [printZoom, setPrintZoom] = useState(100);
  const [fitScale, setFitScale] = useState(1);
  const printMeasureRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      // Master Audit Plan is a read-only view of the Audit schedule records.
      const [auditSchedule, departments, auditCpars] = await Promise.all([
        getAudits(selectedYear.id),
        getDepartments(),
        getCpars(selectedYear.id),
      ]);
      setAudits(auditSchedule);
      setDepts(departments);
      setCpars(auditCpars);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = audits.filter(audit => filterType === "ALL" || audit.auditType === filterType);
  const cparById = new Map(cpars.map(cpar => [cpar.id, cpar]));

  function getLinkedCpars(audit: AuditPlan): LinkedCpar[] {
    const linked = new Map<string, LinkedCpar>();

    // Keep the reference on the Audit schedule as the source of truth. If a
    // referenced CPAR is not available yet, treat it as open so it remains visible.
    for (const reference of audit.cpars ?? []) {
      linked.set(reference.id, {
        id: reference.id,
        status: cparById.get(reference.id)?.status ?? "OPEN",
      });
    }

    // Also support CPAR records linked by auditId, including older records whose
    // audit schedule entry has not yet been backfilled with a cpars reference.
    for (const cpar of cpars.filter(item => item.auditId === audit.id)) {
      linked.set(cpar.id, { id: cpar.id, status: cpar.status });
    }

    return Array.from(linked.values());
  }

  const departmentsById = new Map(depts.map(dept => [dept.id, dept]));
  for (const audit of filtered) {
    const department = audit.auditee?.department;
    const id = auditDepartmentId(audit);
    if (!departmentsById.has(id)) {
      departmentsById.set(id, department ?? { id, code: "—", name: "Department not set" });
    }
  }

  const byDept: DepartmentRow[] = Array.from(departmentsById.values())
    .map(dept => ({
      dept,
      audits: filtered.filter(audit => auditDepartmentId(audit) === dept.id),
    }))
    .filter(row => row.audits.length > 0);

  const auditsByMonth = MONTHS.map((_, monthIndex) =>
    filtered.filter(audit => new Date(audit.scheduledDate).getMonth() === monthIndex),
  );

  function renderPlanTable(printMode = false) {
    return (
      <table className={cn("w-full border-collapse text-xs", printMode && "master-plan-print-table")}>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-36 px-4 py-2.5 text-left font-semibold text-slate-600">Department</th>
            {MONTHS.map(month => (
              <th key={month} className={cn("px-2 py-2.5 text-center font-semibold text-slate-600", printMode ? "min-w-0" : "min-w-[100px]")}>{month}</th>
            ))}
            <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {byDept.map(({ dept, audits: departmentAudits }) => {
            const departmentColor = getDepartmentColor(dept.id, dept.code);
            return (
              <tr key={dept.id} className="border-b border-slate-100 align-top hover:bg-slate-50/50">
                <td className={cn("border-r px-4 py-2.5", departmentColor.header)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", departmentColor.accent)} />
                    <span className={cn("font-semibold", departmentColor.foreground)}>{dept.code}</span>
                  </div>
                  {!printMode && <div className="mt-0.5 text-[10px] text-slate-500">{dept.name}</div>}
                </td>
                {MONTHS.map((_, monthIndex) => {
                  const monthAudits = departmentAudits.filter(audit => new Date(audit.scheduledDate).getMonth() === monthIndex);
                  return (
                    <td key={monthIndex} className={cn(printMode ? "px-0.5 py-0.5 text-center" : "px-1 py-1.5 text-center", departmentColor.cell)}>
                      {monthAudits.length > 0 ? (
                        <div className="space-y-1">
                          {monthAudits.map(audit => {
                            const linkedCpars = getLinkedCpars(audit);
                            const hasOpenCpar = linkedCpars.some(cpar => cpar.status !== "CLOSED");
                            const isClosed = audit.status === "CLOSED";
                            return (
                              <div
                                key={audit.id}
                                title={`${audit.auditee?.name ?? "Unnamed auditee"} — ${audit.auditType} R${audit.roundNumber} — ${formatAuditDate(audit.scheduledDate)} — ${audit.status}`}
                                className={cn(
                                  printMode ? "master-plan-print-audit rounded border px-1 py-0.5 text-left" : "rounded border px-1.5 py-1 text-left shadow-sm",
                                  departmentColor.badge,
                                  isClosed && "opacity-80",
                                )}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate text-[10px] font-bold">
                                    {audit.auditType === "INTERNAL" ? "INT" : "EXT"} R{audit.roundNumber}
                                  </span>
                                  {isClosed && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Closed" />}
                                </div>
                                <div className="mt-0.5 truncate text-[10px] font-medium text-slate-700">
                                  {audit.auditee?.name ?? "Unnamed auditee"}
                                </div>
                                <div className={cn("flex flex-wrap gap-1", printMode ? "mt-0.5" : "mt-1 min-h-3.5")}>
                                  {isClosed && (
                                    <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[9px] font-semibold text-emerald-700">
                                      Closed
                                    </span>
                                  )}
                                  {!isClosed && (
                                    <span className="inline-flex items-center gap-0.5 rounded border border-blue-200 bg-blue-50 px-1 py-0.5 text-[9px] font-semibold text-blue-700">
                                      <Clock3 className="h-2.5 w-2.5" /> In Process
                                    </span>
                                  )}
                                  {linkedCpars.length > 0 && (
                                    <Badge className={cn(
                                      "h-4 gap-0.5 rounded px-1 py-0 text-[9px] font-semibold",
                                      hasOpenCpar
                                        ? "border border-amber-200 bg-amber-100 text-amber-800"
                                        : "border border-emerald-200 bg-emerald-100 text-emerald-800",
                                    )}>
                                      {hasOpenCpar ? <AlertTriangle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                                      CPAR {linkedCpars.length}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{departmentAudits.length}</td>
              </tr>
            );
          })}
          <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
            <td className="px-4 py-2 text-xs text-slate-600">Monthly Total</td>
            {auditsByMonth.map((monthAudits, monthIndex) => (
              <td key={monthIndex} className="px-1 py-2 text-center text-xs text-slate-700">
                {monthAudits.length > 0 ? monthAudits.length : <span className="text-slate-300">—</span>}
              </td>
            ))}
            <td className="px-3 py-2 text-center text-slate-700">{filtered.length}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  const paperDimensions = PAPER_DIMENSIONS[printPaper];
  const sheetWidth = printOrientation === "landscape" ? paperDimensions.height : paperDimensions.width;
  const sheetHeight = printOrientation === "landscape" ? paperDimensions.width : paperDimensions.height;
  const printableWidth = sheetWidth - PRINT_MARGIN_PX * 2;
  const printableHeight = sheetHeight - PRINT_MARGIN_PX * 2;
  const layoutScale = Math.min(printZoom / 100, fitScale);

  useLayoutEffect(() => {
    if (!printPreviewOpen || !printMeasureRef.current) return;
    const content = printMeasureRef.current;
    const measure = () => {
      const width = Math.max(content.scrollWidth, content.offsetWidth);
      const height = Math.max(content.scrollHeight, content.offsetHeight);
      if (width === 0 || height === 0) return;
      // Leave a little space for browser rounding at the page edge.
      setFitScale(Math.min(1, printableWidth / width, printableHeight / height) * 0.97);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [printPreviewOpen, printableWidth, printableHeight, audits, cpars, depts, filterType]);

  function renderPrintContent() {
    return (
      <>
        <div className="mb-4 border-b border-slate-200 pb-3">
          <h1 className="text-xl font-bold text-slate-900">Audit Master Plan — {selectedYear?.year}</h1>
          <p className="mt-1 text-xs text-slate-500">Audit schedule overview · {filtered.length} audits</p>
        </div>
        {renderPlanTable(true)}
      </>
    );
  }

  return (
    <AppLayout title="Master Audit Plan">
      <div className="no-print mb-5 flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-9" aria-label="Refresh master audit plan">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPrintPreviewOpen(true)} className="h-9">
          <Printer className="mr-1.5 h-4 w-4" />Print Plan
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Closed
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
            <AlertTriangle className="h-3 w-3" /> CPAR open
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> CPAR closed
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />Loading...
        </div>
      ) : (
        <Card className="border border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-blue-600" />
              Audit Master Plan — {selectedYear?.year} ({filtered.length} audits)
            </CardTitle>
            <p className="ml-6 text-[11px] text-slate-400">
              เชื่อมข้อมูลจาก Audit schedule เท่านั้น • แผนกอ้างอิงจาก Auditee • รอบตรวจอ้างอิงจาก Round No.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {renderPlanTable()}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">No audit schedule records for {selectedYear?.year}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-[min(1400px,calc(100vw-2rem))] max-h-[calc(100dvh-1rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden p-4 sm:p-5">
          <DialogHeader className="no-print">
            <DialogTitle>Print Plan Preview</DialogTitle>
            <p className="text-xs text-slate-500">เลือกแนวกระดาษ ขนาดกระดาษ และปรับสัดส่วนก่อนพิมพ์ภาพรวม</p>
          </DialogHeader>

          <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Orientation</label>
              <Select value={printOrientation} onValueChange={value => setPrintOrientation(value as PrintOrientation)}>
                <SelectTrigger className="h-9 w-36 bg-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Paper</label>
              <Select value={printPaper} onValueChange={value => setPrintPaper(value as PrintPaper)}>
                <SelectTrigger className="h-9 w-28 bg-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Preview scale (layout)</label>
              <div className="flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPrintZoom(value => Math.max(PRINT_ZOOM_MIN, value - 10))} aria-label="Zoom out">
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-12 text-center text-xs font-semibold text-slate-700">{printZoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPrintZoom(value => Math.min(PRINT_ZOOM_MAX, value + 10))} aria-label="Zoom in">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setPrintZoom(100)}>
                  <RotateCcw className="mr-1 h-3 w-3" />Reset
                </Button>
              </div>
            </div>
            <div className="ml-auto text-[11px] text-slate-500">
              {printPaper} · {printOrientation === "landscape" ? "Landscape" : "Portrait"} · Layout {Math.round(layoutScale * 100)}% · {filtered.length} audits
            </div>
          </div>

          <div className="master-plan-print-viewport min-h-0 overflow-auto rounded-xl border border-slate-200 bg-slate-200/70">
            <div className="master-plan-print-stage flex min-h-full min-w-max justify-center p-6">
              <div
                className="master-plan-print-canvas shrink-0"
                style={{ width: `${sheetWidth * PREVIEW_PAPER_SCALE}px`, height: `${sheetHeight * PREVIEW_PAPER_SCALE}px` }}
              >
                <div
                  className="master-plan-print-sheet overflow-hidden bg-white shadow-xl"
                  style={{
                    width: `${sheetWidth}px`,
                    height: `${sheetHeight}px`,
                    padding: `${PRINT_MARGIN_PX}px`,
                    transform: `scale(${PREVIEW_PAPER_SCALE})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div className="flex justify-center">
                    <div className="master-plan-print-layout shrink-0" style={{ width: `${printableWidth}px`, transform: `scale(${layoutScale})`, transformOrigin: "top center" }}>
                      {renderPrintContent()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>Cancel</Button>
            <Button onClick={() => window.print()} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
              <Printer className="h-4 w-4" /> Print Plan
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
      {printPreviewOpen && createPortal(
        <div className="master-plan-print-output">
          <div ref={printMeasureRef} className="master-plan-print-measure" style={{ width: `${printableWidth}px` }}>
            {renderPrintContent()}
          </div>
          <div
            className="master-plan-print-sheet overflow-hidden bg-white"
            style={{ width: `${sheetWidth}px`, height: `${sheetHeight}px`, padding: `${PRINT_MARGIN_PX}px` }}
          >
            <div className="flex justify-center">
              <div
                className="master-plan-print-layout shrink-0"
                style={{ width: `${printableWidth}px`, transform: `scale(${layoutScale})`, transformOrigin: "top center" }}
              >
                {renderPrintContent()}
              </div>
            </div>
          </div>
          <style>{`
            .master-plan-print-output {
              position: absolute;
              left: -10000px;
              top: 0;
              visibility: hidden;
              pointer-events: none;
            }
            .master-plan-print-measure { position: absolute; left: 0; top: 0; }
            .master-plan-print-sheet { box-sizing: border-box; }
            .master-plan-print-table { width: 100%; table-layout: fixed; font-size: 9px; }
            .master-plan-print-table th,
            .master-plan-print-table td {
              min-width: 0;
              padding: 2px 1px;
              font-size: 9px;
              overflow-wrap: anywhere;
            }
            .master-plan-print-table th:first-child { width: 75px; }
            .master-plan-print-table th:last-child { width: 34px; }
            .master-plan-print-audit { padding: 2px; line-height: 1.1; }
            .master-plan-print-audit > div { margin-top: 0; }
            .master-plan-print-audit .text-\\[10px\\] { font-size: 9px; line-height: 1.1; }
            .master-plan-print-audit span.inline-flex { padding: 0 2px; font-size: 8px; line-height: 1.1; }
            .master-plan-print-audit svg { width: 8px; height: 8px; }
            .master-plan-print-table .truncate {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            @media print {
              @page { size: ${printPaper} ${printOrientation}; margin: 0; }
              html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
              body > *:not(.master-plan-print-output) { display: none !important; }
              .master-plan-print-measure { display: none !important; }
              .master-plan-print-output {
                position: static !important;
                display: block !important;
                width: ${printOrientation === "landscape" ? (printPaper === "A3" ? 420 : 297) : (printPaper === "A3" ? 297 : 210)}mm !important;
                height: ${printOrientation === "landscape" ? (printPaper === "A3" ? 297 : 210) : (printPaper === "A3" ? 420 : 297)}mm !important;
                left: auto !important;
                top: auto !important;
                visibility: visible !important;
                pointer-events: auto !important;
                overflow: hidden !important;
              }
              .master-plan-print-output .master-plan-print-sheet {
                width: 100% !important;
                height: 100% !important;
                padding: 10mm !important;
                overflow: hidden !important;
                box-shadow: none !important;
              }
              .master-plan-print-table { width: 100% !important; table-layout: fixed !important; font-size: 9px !important; }
              .master-plan-print-table th,
              .master-plan-print-table td { min-width: 0 !important; padding: 2px 1px !important; font-size: 9px !important; }
              .master-plan-print-table .shadow-sm { box-shadow: none !important; }
            }
          `}</style>
        </div>,
        document.body,
      )}
    </AppLayout>
  );
}
