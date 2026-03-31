import { useEffect, useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileText, Search, Plus, Printer, ExternalLink, RefreshCw, Loader2,
  BookOpen, ClipboardList, FileCheck, Globe, Archive,
  AlertCircle, CheckCircle, Clock, Eye, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDocuments, getDepartments, getUsers, createDocument } from "@/lib/db";
import type { Document, Department } from "@/lib/types";

const CATEGORIES = [
  { key: "POLICY",           label: "Policy",           short: "POL", icon: BookOpen,     color: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "PROCEDURE",        label: "Procedure",        short: "QP",  icon: ClipboardList, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "WORK_INSTRUCTION", label: "Work Instruction", short: "WI",  icon: FileCheck,    color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { key: "FORM",             label: "Form",             short: "FM",  icon: FileText,     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "EXTERNAL",         label: "External",         short: "EXT", icon: Globe,        color: "bg-amber-100 text-amber-700 border-amber-200" },
];

const STATUSES = [
  { key: "ACTIVE",       label: "Active",       icon: CheckCircle, color: "bg-green-100 text-green-700 border-green-200" },
  { key: "DRAFT",        label: "Draft",        icon: Clock,       color: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "UNDER_REVIEW", label: "Under Review", icon: AlertCircle, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "OBSOLETE",     label: "Obsolete",     icon: Archive,     color: "bg-red-100 text-red-600 border-red-200" },
];

function getCatMeta(k: string) { return CATEGORIES.find(c => c.key === k) ?? CATEGORIES[1]; }
function getStatMeta(k: string) { return STATUSES.find(s => s.key === k) ?? STATUSES[0]; }
function isOverdue(d: string) { return new Date(d) < new Date(); }

const deptColors: Record<string, string> = {
  MKT:"bg-pink-100 text-pink-700",  LOG:"bg-amber-100 text-amber-700",
  DCC:"bg-indigo-100 text-indigo-700", HR:"bg-violet-100 text-violet-700",
  SHE:"bg-red-100 text-red-700", QC:"bg-blue-100 text-blue-700",
};

export default function DocumentsPage() {
  const [docs,       setDocs]       = useState<Document[]>([]);
  const [depts,      setDepts]      = useState<Department[]>([]);
  const [users,      setUsers]      = useState<{id:string;name:string}[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterStat, setFilterStat] = useState("ALL");
  const [selected,   setSelected]   = useState<Document | null>(null);
  const [showNew,    setShowNew]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [formErr,    setFormErr]    = useState("");
  const [form, setForm] = useState({
    docNo:"", title:"", category:"PROCEDURE", departmentId:"", ownerId:"",
    revision:"Rev.1", status:"DRAFT", issuedDate:"", nextReviewDate:"", fileUrl:"", description:"",
  });
  const printRef = useRef<HTMLDivElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const [d, de, u] = await Promise.all([getDocuments(), getDepartments(), getUsers()]);
      setDocs(d); setDepts(de); setUsers(u);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const filtered = docs.filter(d => {
    if (filterCat  !== "ALL" && d.category    !== filterCat)   return false;
    if (filterDept !== "ALL" && d.departmentId !== filterDept) return false;
    if (filterStat !== "ALL" && d.status       !== filterStat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.docNo.toLowerCase().includes(q) && !d.title.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total       = docs.filter(d => d.status !== "OBSOLETE").length;
  const active      = docs.filter(d => d.status === "ACTIVE").length;
  const underReview = docs.filter(d => d.status === "UNDER_REVIEW").length;
  const overdueRev  = docs.filter(d => d.status === "ACTIVE" && isOverdue(d.nextReviewDate)).length;

  const handleCreate = async () => {
    setFormErr("");
    if (!form.docNo || !form.title || !form.departmentId || !form.ownerId) { setFormErr("กรุณากรอกข้อมูลที่จำเป็น"); return; }
    setSaving(true);
    try {
      await createDocument({
        ...form,
        fileUrl: form.fileUrl || null,
        relatedCparId: null, relatedMocId: null,
        issuedDate: form.issuedDate || new Date().toISOString(),
        nextReviewDate: form.nextReviewDate || new Date(Date.now() + 3 * 365 * 86400000).toISOString(),
      });
      setShowNew(false);
      setForm({ docNo:"", title:"", category:"PROCEDURE", departmentId:"", ownerId:"", revision:"Rev.1", status:"DRAFT", issuedDate:"", nextReviewDate:"", fileUrl:"", description:"" });
      fetchDocs();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : "Failed to create");
    } finally { setSaving(false); }
  };

  return (
    <AppLayout title="Document Control">
      <style>{`@media print { body * { visibility:hidden; } #doc-print-area, #doc-print-area * { visibility:visible; } #doc-print-area { position:absolute;inset:0;padding:24px; } .no-print { display:none !important; } }`}</style>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 no-print">
        {[["Total Documents", total, "text-slate-700", "bg-slate-50"], ["Active", active, "text-green-700", "bg-green-50"], ["Under Review", underReview, "text-amber-700", "bg-amber-50"], ["Overdue Review", overdueRev, "text-red-700", "bg-red-50"]].map(([lbl, val, clr, bg]) => (
          <Card key={lbl as string} className={cn("border border-slate-200", bg as string)}>
            <CardContent className="p-2 md:p-4 text-center md:text-left overflow-hidden">
              <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-0.5 md:mb-1 truncate">{lbl as string}</p>
              <p className={cn("text-xl md:text-3xl font-bold truncate", clr as string)}>{val as number}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-5 no-print">
        <button onClick={() => setFilterCat("ALL")} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border", filterCat==="ALL"?"bg-slate-700 text-white border-slate-700":"bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
          All ({docs.filter(d=>d.status!=="OBSOLETE").length})
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setFilterCat(filterCat===cat.key?"ALL":cat.key)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border", filterCat===cat.key?"bg-slate-700 text-white border-slate-700":"bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            {cat.short} — {cat.label} ({docs.filter(d=>d.category===cat.key&&d.status!=="OBSOLETE").length})
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="ค้นหา Doc No, ชื่อเอกสาร..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="แผนก" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกแผนก</SelectItem>
            {depts.map(d=><SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStat} onValueChange={setFilterStat}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกสถานะ</SelectItem>
            {STATUSES.map(s=><SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchDocs} className="h-9"><RefreshCw className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={()=>window.print()} className="h-9"><Printer className="h-4 w-4 mr-1.5" />Print</Button>
        <Button size="sm" onClick={()=>setShowNew(true)} className="h-9"><Plus className="h-4 w-4 mr-1.5" />Add Document</Button>
      </div>

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0" id="doc-print-area" ref={printRef}>
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold">Master Document List</h1>
            <p className="text-sm text-slate-500">Printed: {format(new Date(), "d MMMM yyyy")}</p>
            <hr className="mt-2" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400"><FileText className="h-10 w-10 mb-3 text-slate-200" /><p className="text-sm">ไม่พบเอกสาร</p></div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[160px_1fr_100px_80px_70px_100px] gap-3 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 rounded-lg border border-slate-100">
                <span>Doc No</span><span>Title / Description</span><span>Dept / Owner</span><span>Revision</span><span>Status</span><span>Next Review</span>
              </div>
              {filtered.map(doc => {
                const cat = getCatMeta(doc.category);
                const stat = getStatMeta(doc.status);
                const SI = stat.icon;
                const dClr = deptColors[doc.department?.code ?? ""] ?? "bg-slate-100 text-slate-600";
                const overdue = doc.status === "ACTIVE" && isOverdue(doc.nextReviewDate);
                const isSel = selected?.id === doc.id;
                return (
                  <div key={doc.id} onClick={() => setSelected(isSel ? null : doc)}
                    className={cn("grid grid-cols-[160px_1fr_100px_80px_70px_100px] gap-3 items-center px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm",
                      isSel ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                      doc.status === "OBSOLETE" && "opacity-50")}>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-mono font-semibold text-slate-800 text-xs truncate">{doc.docNo}</span>
                      <Badge className={cn("text-[10px] px-1.5 py-0 border w-fit", cat.color)}>{cat.short}</Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate text-xs">{doc.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.description}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge className={cn("text-[10px] px-1.5 py-0 border w-fit", dClr)}>{doc.department?.code}</Badge>
                      <span className="text-[11px] text-slate-500 truncate">{doc.owner?.name}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-600">{doc.revision}</span>
                    <div className="flex items-center gap-1">
                      <SI className={cn("h-3.5 w-3.5 flex-shrink-0", stat.color.split(" ")[1])} />
                      <span className={cn("text-[11px] font-medium", stat.color.split(" ")[1])}>{stat.label}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className={overdue ? "text-red-600 font-semibold" : "text-slate-500"}>
                        {format(new Date(doc.nextReviewDate), "d MMM yyyy")}
                      </span>
                      {overdue && <span className="block text-red-500 font-medium">⚠ Overdue</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 no-print">
            <Card className="border border-slate-200 shadow-sm sticky top-0">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-800 leading-tight">{selected.title}</CardTitle>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>
                <p className="text-[11px] font-mono text-slate-500 mt-1">{selected.docNo} · {selected.revision}</p>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Description</p>
                  <p className="text-slate-700 leading-relaxed">{selected.description || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {[["Category", getCatMeta(selected.category).label], ["Department", selected.department?.code], ["Owner", selected.owner?.name], ["Issued", format(new Date(selected.issuedDate), "d MMM yyyy")]].map(([l,v]) => (
                    <div key={l as string}><p className="text-[10px] font-semibold text-slate-400 uppercase">{l}</p><p className="text-slate-700 mt-0.5">{v || "—"}</p></div>
                  ))}
                </div>
                {(selected.relatedCparId || selected.relatedMocId) && (
                  <div className="space-y-1.5">
                    {selected.relatedCparId && <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200"><Link2 className="h-3.5 w-3.5" />CPAR: <span className="font-mono font-semibold">{selected.relatedCparId}</span></div>}
                    {selected.relatedMocId && <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-200"><Link2 className="h-3.5 w-3.5" />MOC: <span className="font-mono font-semibold">{selected.relatedMocId}</span></div>}
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                  {selected.fileUrl ? (
                    <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="w-full h-8 text-xs"><Eye className="h-3.5 w-3.5 mr-1.5" />View Document<ExternalLink className="h-3 w-3 ml-auto opacity-60" /></Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="w-full h-8 text-xs"><FileText className="h-3.5 w-3.5 mr-1.5" />No File Attached</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* New Document Dialog */}
      <Dialog open={showNew} onOpenChange={v => { setShowNew(v); setFormErr(""); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />New Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Doc No *</Label><Input value={form.docNo} onChange={e=>setForm(f=>({...f,docNo:e.target.value}))} placeholder="e.g. QP-QMS-005" className="mt-1 h-9 text-sm font-mono" /></div>
              <div><Label className="text-xs">Category *</Label>
                <Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c=><SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Document title" className="mt-1 h-9 text-sm" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} className="mt-1 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Department *</Label>
                <Select value={form.departmentId} onValueChange={v=>setForm(f=>({...f,departmentId:v}))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select dept" /></SelectTrigger>
                  <SelectContent>{depts.map(d=><SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Owner *</Label>
                <Select value={form.ownerId} onValueChange={v=>setForm(f=>({...f,ownerId:v}))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>{users.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Revision</Label><Input value={form.revision} onChange={e=>setForm(f=>({...f,revision:e.target.value}))} placeholder="Rev.1" className="mt-1 h-9 text-sm font-mono" /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v}))}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.filter(s=>s.key!=="OBSOLETE").map(s=><SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Issued Date</Label><Input type="date" value={form.issuedDate.substring(0,10)} onChange={e=>setForm(f=>({...f,issuedDate:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
              <div><Label className="text-xs">Next Review</Label><Input type="date" value={form.nextReviewDate.substring(0,10)} onChange={e=>setForm(f=>({...f,nextReviewDate:e.target.value}))} className="mt-1 h-9 text-sm" /></div>
            </div>
            <div><Label className="text-xs">File URL (optional)</Label><Input value={form.fileUrl} onChange={e=>setForm(f=>({...f,fileUrl:e.target.value}))} placeholder="https://..." className="mt-1 h-9 text-sm" /></div>
            {formErr && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{formErr}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:<Plus className="h-4 w-4 mr-1"/>}Create Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
