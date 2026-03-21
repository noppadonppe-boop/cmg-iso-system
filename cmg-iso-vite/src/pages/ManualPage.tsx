import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen, LayoutDashboard, Target, ShieldCheck, AlertTriangle, Users,
  GitMerge, FileText, Settings, Building2, UserCog,
  Eye, PenLine, Crown, Briefcase, ClipboardCheck, UserCheck, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── โมดูล ─────────────────────────────────────────────────────────────────────
const sections = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "ภาพรวมตัวชี้วัด ISO ทั้งหมด ได้แก่ ความคืบหน้าแผนการตรวจสอบ สถานะ CPAR อัตราการส่งรายงาน KPI และความคืบหน้า MOC แสดงผลด้วยกราฟแบบ Real-time",
  },
  {
    icon: Target,
    title: "KPI Management",
    desc: "กำหนดตัวชี้วัดรายแผนกในแต่ละปี ตั้งเป้าหมายและหน่วยวัด แต่ละ KPI ติดตามการส่งรายงานรายเดือนตลอดทั้งปี",
  },
  {
    icon: FileText,
    title: "KPI Reports",
    desc: "ส่งผลงาน KPI รายเดือน แผนผังสี (Heatmap) แสดงการส่งตรงเวลาเทียบกับล่าช้า หากส่งหลังวันที่ 5 ของเดือนถัดไปถือว่า 'ล่าช้า'",
  },
  {
    icon: ShieldCheck,
    title: "Master Plan",
    desc: "แสดงตารางการตรวจสอบประจำปีแบบรายเดือน กรองได้ตามประเภท Internal / External",
  },
  {
    icon: ShieldCheck,
    title: "Audit Plans",
    desc: "ติดตามสถานะแผนการตรวจสอบ: PLANNED → IN_PROGRESS → COMPLETED → CLOSED บังคับใช้กฎข้อที่ 2 (ห้ามตรวจสอบตัวเอง)",
  },
  {
    icon: AlertTriangle,
    title: "CPAR",
    desc: "กระบวนการ 4 ขั้นตอน: ISSUED → PLANNING → PENDING_VERIFICATION → CLOSED กรอกสาเหตุ แนวทางแก้ไข และผลการตรวจสอบในแต่ละขั้น",
  },
  {
    icon: Users,
    title: "Management Review",
    desc: "บันทึกการประชุมทบทวนฝ่ายบริหาร ระบุวันที่ วาระการประชุม และ URL รายงาน กำหนดสถานะ SCHEDULED หรือ COMPLETED",
  },
  {
    icon: GitMerge,
    title: "MOC (การจัดการการเปลี่ยนแปลง)",
    desc: "กระบวนการ 4 ขั้นตอน: MEETING_SETUP → PENDING_APPROVAL → ACTION_IN_PROGRESS → CLOSED ติดตามคำขอเปลี่ยนแปลงจากผู้ขอทุกฝ่าย",
  },
  {
    icon: FileText,
    title: "Document Control",
    desc: "รายการเอกสาร ISO ทั้งหมด ได้แก่ นโยบาย ขั้นตอน คำแนะนำการทำงาน แบบฟอร์ม และเอกสารภายนอก ติดตามสถานะ ฉบับแก้ไข และวันทบทวน",
  },
  {
    icon: ShieldCheck,
    title: "Auditor Management",
    desc: "จัดการโปรไฟล์ผู้ตรวจสอบ กฎข้อที่ 4: ต้องผ่านการทดสอบทั้ง ISO 9001 และ ISO 45001 พร้อมอัปโหลดใบรับรองจึงจะเปิดใช้งานได้",
  },
  {
    icon: Building2,
    title: "Departments",
    desc: "ดูรายชื่อแผนกและสมาชิกทั้งหมด ใช้ข้ามโมดูลสำหรับการกรองและมอบหมายงาน",
  },
  {
    icon: Settings,
    title: "Year Rollover",
    desc: "ปิดปีที่เสร็จสิ้น (ล็อกข้อมูลทั้งหมด) และส่ง URL รายงาน ISO ประจำปี ปีที่ active จะควบคุมมุมมองข้อมูลทั้งหมด",
  },
];

// ── กฎระบบ ────────────────────────────────────────────────────────────────────
const rules = [
  { code: "กฎข้อ 2", title: "ห้ามตรวจสอบตัวเอง", desc: "ผู้ตรวจสอบไม่สามารถตรวจสอบแผนกของตัวเองได้" },
  { code: "กฎข้อ 3", title: "กฎผู้สังเกตการณ์", desc: "ผู้ตรวจสอบต้องมีประวัติการสังเกตการณ์ในแผนกนั้นก่อน จึงจะตรวจสอบอย่างอิสระได้" },
  { code: "กฎข้อ 4", title: "ใบรับรอง", desc: "ผู้ตรวจสอบต้องผ่านการทดสอบทั้ง ISO 9001 และ ISO 45001 และอัปโหลดใบรับรองทั้งสองฉบับจึงจะถูกกำหนดเป็น Active ได้" },
  { code: "KPI ล่าช้า", title: "การส่งล่าช้า", desc: "รายงาน KPI จะถูกทำเครื่องหมาย LATE หากส่งหลังวันที่ 5 ของเดือนถัดไป" },
];

// ── ข้อมูล Role ───────────────────────────────────────────────────────────────
const roleData = [
  {
    icon: Crown,
    name: "MasterAdmin",
    badge: "bg-red-100 text-red-700 border-red-200",
    iconCls: "bg-red-50 text-red-600",
    title: "ผู้ดูแลระบบสูงสุด",
    desc: "มีสิทธิ์เต็มรูปแบบในทุกฟีเจอร์ของระบบ",
    abilities: [
      "อนุมัติ / ปฏิเสธ / ระงับสิทธิ์ผู้ใช้ทุกคน",
      "กำหนด Role ให้ผู้ใช้คนอื่น",
      "เข้าถึงหน้า 'จัดการผู้ใช้งาน' (/user-management)",
      "เข้าถึงทุกฟีเจอร์โดยไม่มีข้อจำกัด",
      "ผู้ใช้คนแรกที่ลงทะเบียนจะได้รับ Role นี้โดยอัตโนมัติ",
    ],
  },
  {
    icon: Briefcase,
    name: "QMR",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    iconCls: "bg-purple-50 text-purple-600",
    title: "ตัวแทนฝ่ายบริหารด้านคุณภาพ",
    desc: "Quality Management Representative — รับผิดชอบระบบ ISO โดยรวม",
    abilities: [
      "อนุมัติและทบทวนเอกสารระดับระบบ",
      "ดูแล Management Review, Audit Plans, CPAR",
      "สรุปผลและรายงานต่อผู้บริหาร",
      "เข้าถึงทุกโมดูลในฐานะผู้กำกับดูแล",
    ],
  },
  {
    icon: ClipboardCheck,
    name: "AUDITOR",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    iconCls: "bg-orange-50 text-orange-600",
    title: "ผู้ตรวจสอบภายใน",
    desc: "Internal Auditor — ดำเนินการตรวจสอบตามแผน",
    abilities: [
      "สร้างและจัดการ Audit Plans",
      "ดำเนินการตรวจสอบตาม Master Plan",
      "ออก CPAR เมื่อพบข้อบกพร่อง",
      "ต้องผ่านการทดสอบและมี Cert URL (กฎข้อ 4)",
      "ห้ามตรวจสอบแผนกตัวเอง (กฎข้อ 2)",
    ],
  },
  {
    icon: UserCheck,
    name: "AUDITEE",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    iconCls: "bg-yellow-50 text-yellow-600",
    title: "ผู้ถูกตรวจสอบ",
    desc: "หน่วยงานหรือบุคคลที่รับการตรวจสอบ",
    abilities: [
      "รับและตอบกลับ CPAR ที่ได้รับ",
      "ดูผลการตรวจสอบของฝ่ายตัวเอง",
      "ส่ง Corrective Action และ Root Cause Analysis",
      "ติดตามสถานะการแก้ไขปัญหา",
    ],
  },
  {
    icon: UserCog,
    name: "DEPT_HEAD",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    iconCls: "bg-blue-50 text-blue-600",
    title: "หัวหน้าแผนก / ผู้จัดการฝ่าย",
    desc: "Department Head — ดูแลข้อมูลและ KPI ของฝ่ายตัวเอง",
    abilities: [
      "กำหนดและอนุมัติ KPI ของฝ่ายตัวเอง",
      "รับรองรายงาน KPI รายเดือน",
      "อนุมัติ MOC ภายในฝ่าย",
      "เข้าถึงข้อมูลฝ่ายตัวเองได้ทั้งหมด",
    ],
  },
  {
    icon: Users,
    name: "Staff",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    iconCls: "bg-slate-50 text-slate-500",
    title: "พนักงานทั่วไป",
    desc: "Role เริ่มต้นสำหรับผู้ใช้ใหม่ทุกคน (รอการอนุมัติจาก MasterAdmin)",
    abilities: [
      "ดูข้อมูลและรายงานที่ได้รับอนุญาต",
      "กรอกรายงาน KPI ของตัวเอง",
      "ส่งคำขอ MOC",
      "ไม่สามารถสร้าง Audit Plans หรืออนุมัติเอกสารได้",
    ],
  },
  {
    icon: Eye,
    name: "Viewer",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    iconCls: "bg-teal-50 text-teal-600",
    title: "ผู้ดูข้อมูลอย่างเดียว",
    desc: "Read-only — เหมาะสำหรับผู้บริหาร ที่ปรึกษา หรือผู้ตรวจจาก CB",
    abilities: [
      "ดูข้อมูลทุกโมดูลได้แบบ Read-only",
      "ไม่สามารถสร้าง แก้ไข หรืออนุมัติอะไรได้",
      "เหมาะสำหรับ: ผู้บริหารระดับสูง ที่ปรึกษาภายนอก ผู้ตรวจ CB",
    ],
  },
  {
    icon: PenLine,
    name: "Creator",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    iconCls: "bg-indigo-50 text-indigo-600",
    title: "ผู้สร้างและแก้ไขเนื้อหา",
    desc: "สร้างและแก้ไขเนื้อหาได้ แต่ไม่มีสิทธิ์อนุมัติ",
    abilities: [
      "สร้างและแก้ไขเอกสาร (Document Control)",
      "สร้าง KPI, CPAR, MOC",
      "ไม่มีสิทธิ์อนุมัติ — ต้องส่งให้ผู้มีอำนาจอนุมัติต่อ",
      "เหมาะสำหรับเจ้าหน้าที่ ISO ที่ไม่ใช่ QMR",
    ],
  },
];

// ── ตารางสิทธิ์ ───────────────────────────────────────────────────────────────
const permTable = [
  { role: "MasterAdmin", approveUser: true,  manageAudit: true,  cpar: "สร้าง/จัดการ", kpi: true,        moc: true,  document: true,  readOnly: false },
  { role: "QMR",         approveUser: false, manageAudit: true,  cpar: "สร้าง/จัดการ", kpi: true,        moc: true,  document: true,  readOnly: false },
  { role: "AUDITOR",     approveUser: false, manageAudit: true,  cpar: "สร้าง/จัดการ", kpi: false,       moc: false, document: false, readOnly: false },
  { role: "AUDITEE",     approveUser: false, manageAudit: false, cpar: "รับ/ตอบกลับ",  kpi: false,       moc: false, document: false, readOnly: false },
  { role: "DEPT_HEAD",   approveUser: false, manageAudit: false, cpar: "—",             kpi: "ฝ่ายตัวเอง", moc: true,  document: false, readOnly: false },
  { role: "Staff",       approveUser: false, manageAudit: false, cpar: "—",             kpi: "กรอกเท่านั้น", moc: "ส่งคำขอ", document: false, readOnly: false },
  { role: "Viewer",      approveUser: false, manageAudit: false, cpar: "—",             kpi: false,       moc: false, document: false, readOnly: true  },
  { role: "Creator",     approveUser: false, manageAudit: false, cpar: "สร้าง",         kpi: "สร้าง",     moc: "สร้าง", document: true,  readOnly: false },
];

function Check({ v }: { v: boolean | string }) {
  if (v === false || v === "—") return <span className="text-slate-300">—</span>;
  if (v === true)  return <span className="text-green-500 font-bold">✓</span>;
  return <span className="text-blue-600 text-xs font-medium">{v}</span>;
}

export default function ManualPage() {
  return (
    <AppLayout title="คู่มือการใช้งาน">
      <div className="max-w-5xl space-y-6">

        {/* ── Header ── */}
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shrink-0">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">CMG ISO System — คู่มือการใช้งาน</h2>
              <p className="text-sm text-slate-600 mt-1">
                ระบบบริหารจัดการ ISO ภายในองค์กร สำหรับ ISO 9001 และ ISO 45001 ตามกรอบแนวคิด PDCA
                รวมศูนย์กิจกรรม ISO ทั้งหมด ได้แก่ การวางแผนตรวจสอบ การติดตาม CPAR การรายงาน KPI การจัดการการเปลี่ยนแปลง (MOC) และการควบคุมเอกสาร
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── กฎระบบ ── */}
        <Card className="border border-amber-200">
          <CardHeader className="pb-2 border-b border-amber-100">
            <CardTitle className="text-sm font-semibold text-amber-800">กฎระบบที่สำคัญ</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map(r => (
              <div key={r.code} className="flex gap-3 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 h-fit shrink-0 whitespace-nowrap">{r.code}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── คู่มือโมดูล ── */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">คู่มือการใช้งานแต่ละโมดูล</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="flex gap-3 rounded-lg p-3 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── วงจร PDCA ── */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700">วงจร PDCA</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { phase: "PLAN", months: "ม.ค.–มี.ค.", color: "bg-blue-50 border-blue-200 text-blue-700",     desc: "กำหนด KPI และวางแผนการตรวจสอบ" },
                { phase: "DO",   months: "เม.ย.–ธ.ค.", color: "bg-green-50 border-green-200 text-green-700",   desc: "ดำเนินการตรวจสอบและส่งรายงาน KPI" },
                { phase: "CHECK",months: "พ.ค.–ก.ค.",  color: "bg-amber-50 border-amber-200 text-amber-700",   desc: "ทบทวนผลลัพธ์และตรวจสอบ CPAR" },
                { phase: "ACT",  months: "พ.ย.",        color: "bg-purple-50 border-purple-200 text-purple-700", desc: "ดำเนิน MOC และทบทวนโดยฝ่ายบริหาร" },
              ].map(p => (
                <div key={p.phase} className={cn("rounded-lg border p-3", p.color)}>
                  <p className="font-bold text-base">{p.phase}</p>
                  <p className="text-xs font-medium opacity-70">{p.months}</p>
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════════
            คู่มือการใช้งานเมนู Sidebar
        ══════════════════════════════════════════════════════════════════════ */}
        <Card className="border border-green-200">
          <CardHeader className="pb-3 border-b border-green-100 bg-green-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-base font-bold text-green-800">คู่มือการใช้งานเมนู Sidebar โดยละเอียด</CardTitle>
            </div>
            <p className="text-xs text-green-600 mt-1.5">
              แนะนำการใช้งานแต่ละเมนูพร้อม Workflow ที่ชัดเจน เมนูที่แสดงจะขึ้นอยู่กับ Role ของคุณ
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-4">

            {/* OVERVIEW */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <LayoutDashboard className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">📊 OVERVIEW</h3>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Dashboard</p>
                <p className="text-xs text-slate-600 mb-2">ภาพรวมระบบ ISO ทั้งหมด แสดงสถิติและกราฟแบบ Real-time</p>
                <ul className="text-xs text-slate-600 space-y-0.5 ml-3">
                  <li>• จำนวนแผนการตรวจสอบ (Audit) แยกตามสถานะ</li>
                  <li>• CPAR ที่ยังค้างอยู่</li>
                  <li>• อัตราการส่ง KPI รายเดือน</li>
                  <li>• ความคืบหน้า MOC</li>
                </ul>
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 border border-blue-100">
                  💡 ใช้เป็นหน้าแรกหลัง Login เพื่อดูภาพรวมว่ามีงานค้างอะไรบ้าง
                </div>
              </div>
            </div>

            {/* PLAN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">📋 PLAN</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Master Plan</p>
                <p className="text-xs text-slate-600 mb-2">ตารางแผนการตรวจสอบประจำปี แสดงกริดรายเดือน (ม.ค.–ธ.ค.)</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow:</p>
                  <div className="flex items-center gap-1 flex-wrap text-slate-600">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">QMR วางแผน</span>
                    <span>→</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">สร้าง Audit Plans</span>
                    <span>→</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">ปรากฏในตาราง</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">KPI Management</p>
                <p className="text-xs text-slate-600 mb-2">กำหนดตัวชี้วัดรายแผนก</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow การตั้งค่า KPI:</p>
                  <ol className="text-slate-600 space-y-1 ml-4 list-decimal">
                    <li>เลือก Year Cycle (ปีที่ต้องการ)</li>
                    <li>กด "สร้าง KPI ใหม่"</li>
                    <li>เลือกแผนก → กรอกชื่อ KPI → ตั้งเป้าหมาย (Target) + หน่วย</li>
                    <li>บันทึก → KPI พร้อมรับรายงานรายเดือน</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* DO */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <FileText className="h-4 w-4 text-green-600" />
                <h3 className="font-bold text-sm text-slate-800">📝 DO</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">KPI Reports</p>
                <p className="text-xs text-slate-600 mb-2">ส่งรายงานผลงาน KPI รายเดือน</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs mb-2">
                  <p className="font-semibold text-slate-700 mb-1">Workflow:</p>
                  <ol className="text-slate-600 space-y-1 ml-4 list-decimal">
                    <li>เลือก Year Cycle</li>
                    <li>เลือก KPI ที่ต้องการรายงาน</li>
                    <li>กรอกค่าผลงาน (Actual Value) ของเดือนนั้น</li>
                    <li>บันทึก → ระบบคำนวณ % เทียบ Target อัตโนมัติ</li>
                  </ol>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-50 border border-green-200 rounded p-1.5 text-center">
                    <span className="font-bold text-green-700">🟢 เขียว</span>
                    <p className="text-green-600 text-[10px] mt-0.5">ส่งตรงเวลา</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-1.5 text-center">
                    <span className="font-bold text-red-700">🔴 แดง</span>
                    <p className="text-red-600 text-[10px] mt-0.5">ส่งล่าช้า</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-center">
                    <span className="font-bold text-slate-600">⬜ เทา</span>
                    <p className="text-slate-500 text-[10px] mt-0.5">ยังไม่ส่ง</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Document Control</p>
                <p className="text-xs text-slate-600 mb-2">ควบคุมเอกสาร ISO: Policy / Procedure / Work Instruction / Form / External</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow:</p>
                  <ol className="text-slate-600 space-y-1 ml-4 list-decimal">
                    <li>สร้างรายการเอกสารใหม่</li>
                    <li>กรอกชื่อ, ประเภท, เลขที่เอกสาร, ฉบับที่ (Revision)</li>
                    <li>ตั้งวันทบทวนต่อไป (Next Review Date)</li>
                    <li>อัปเดตสถานะ: Active / Obsolete</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* CHECK */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">✅ CHECK</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Audit Plans</p>
                <p className="text-xs text-slate-600 mb-2">จัดการแผนการตรวจสอบภายใน</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs mb-2">
                  <p className="font-semibold text-slate-700 mb-1">Workflow (4 ขั้นตอน):</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-center">
                      <p className="font-bold text-blue-700">PLANNED</p>
                      <p className="text-blue-600 text-[10px]">วางแผน</p>
                    </div>
                    <span className="text-slate-400">→</span>
                    <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center">
                      <p className="font-bold text-amber-700">IN_PROGRESS</p>
                      <p className="text-amber-600 text-[10px]">เริ่มตรวจ</p>
                    </div>
                    <span className="text-slate-400">→</span>
                    <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1 text-center">
                      <p className="font-bold text-purple-700">COMPLETED</p>
                      <p className="text-purple-600 text-[10px]">ตรวจเสร็จ</p>
                    </div>
                    <span className="text-slate-400">→</span>
                    <div className="bg-green-50 border border-green-200 rounded px-2 py-1 text-center">
                      <p className="font-bold text-green-700">CLOSED</p>
                      <p className="text-green-600 text-[10px]">ปิดแผน</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700">
                    ⛔ <strong>กฎข้อ 2:</strong> ผู้ตรวจสอบห้ามตรวจแผนกตัวเอง
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-700">
                    ⛔ <strong>กฎข้อ 3:</strong> ต้องมีประวัติ Observer ก่อนตรวจอิสระ
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">CPAR</p>
                <p className="text-xs text-slate-600 mb-2">Corrective and Preventive Action Report</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow (4 ขั้นตอน):</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold shrink-0">ISSUED</span>
                      <span className="text-slate-600">กรอกข้อบกพร่องที่พบ, ระบุแผนกที่รับผิดชอบ</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold shrink-0">PLANNING</span>
                      <span className="text-slate-600">AUDITEE กรอก Root Cause + แผนแก้ไข + กำหนดวัน</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold shrink-0">PENDING_VERIFICATION</span>
                      <span className="text-slate-600">AUDITOR ตรวจสอบว่าแก้ไขครบถ้วนหรือไม่</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold shrink-0">CLOSED</span>
                      <span className="text-slate-600">ปิด CPAR เมื่อยืนยันว่าแก้ไขสำเร็จ</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Management Review</p>
                <p className="text-xs text-slate-600 mb-2">บันทึกการประชุมทบทวนฝ่ายบริหาร</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow:</p>
                  <ol className="text-slate-600 space-y-1 ml-4 list-decimal">
                    <li>สร้างรายการประชุมใหม่</li>
                    <li>กรอกวันที่, วาระการประชุม, ผู้เข้าร่วม</li>
                    <li>สถานะ: SCHEDULED → COMPLETED</li>
                    <li>แนบ URL รายงานการประชุม (Minutes URL)</li>
                  </ol>
                </div>
                <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1 border border-purple-100">
                  💡 โดยปกติจัดปีละ 1–2 ครั้ง ช่วง ACT (พฤศจิกายน)
                </div>
              </div>
            </div>

            {/* ACT */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <GitMerge className="h-4 w-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800">🔄 ACT</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">MOC (Management of Change)</p>
                <p className="text-xs text-slate-600 mb-2">การจัดการการเปลี่ยนแปลง</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow (4 ขั้นตอน):</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold shrink-0">MEETING_SETUP</span>
                      <span className="text-slate-600">ผู้ขอยื่นคำขอเปลี่ยนแปลง กรอกชื่อ, เหตุผล, แผนก</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold shrink-0">PENDING_APPROVAL</span>
                      <span className="text-slate-600">DEPT_HEAD / QMR พิจารณาและอนุมัติ/ปฏิเสธ</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold shrink-0">ACTION_IN_PROGRESS</span>
                      <span className="text-slate-600">ดำเนินการตามแผนที่อนุมัติ บันทึกความคืบหน้า</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold shrink-0">CLOSED</span>
                      <span className="text-slate-600">ยืนยันการเปลี่ยนแปลงสำเร็จ ปิด MOC</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Year Rollover</p>
                <p className="text-xs text-slate-600 mb-2">ปิดปีและเริ่มปีใหม่</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow:</p>
                  <ol className="text-slate-600 space-y-1 ml-4 list-decimal">
                    <li>ตรวจสอบว่าปีปัจจุบัน Complete แล้ว</li>
                    <li>อัปโหลด URL รายงาน ISO ประจำปี</li>
                    <li>กด "ปิดปี" → ข้อมูลปีนั้นถูกล็อก (Read-only)</li>
                    <li>กด "เพิ่มปีถัดไป" → สร้าง Year Cycle ใหม่</li>
                    <li>ปีใหม่กลายเป็น Active → เมนูทั้งหมดทำงานบนปีใหม่</li>
                  </ol>
                </div>
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 border border-blue-100">
                  💡 การเลือก Year Cycle ที่ Header (มุมบนขวา) ใช้ดูข้อมูลย้อนหลังปีที่ปิดแล้วได้
                </div>
              </div>
            </div>

            {/* ADMIN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Settings className="h-4 w-4 text-slate-600" />
                <h3 className="font-bold text-sm text-slate-800">⚙️ ADMIN</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Auditor Management</p>
                <p className="text-xs text-slate-600 mb-2">จัดการโปรไฟล์ผู้ตรวจสอบ</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">กฎข้อ 4 — เงื่อนไขเปิดใช้งาน Auditor:</p>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>ผ่านการทดสอบ ISO 9001 (กรอกคะแนน + วันที่)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>ผ่านการทดสอบ ISO 45001 (กรอกคะแนน + วันที่)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>อัปโหลด Certificate ISO 9001 (URL)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>อัปโหลด Certificate ISO 45001 (URL)</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2">
                      <span className="text-slate-400">→</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Status: ACTIVE ✅</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">Departments</p>
                <p className="text-xs text-slate-600 mb-2">ข้อมูลแผนกในองค์กร</p>
                <p className="text-xs text-slate-600">แสดงรายชื่อแผนกทั้งหมดพร้อมสมาชิก ใช้เป็นฐานข้อมูลกลางสำหรับ:</p>
                <ul className="text-xs text-slate-600 space-y-0.5 ml-3 mt-1">
                  <li>• มอบหมาย Auditor</li>
                  <li>• กำหนด KPI รายแผนก</li>
                  <li>• ระบุแผนก CPAR/MOC</li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
                  <UserCog className="h-4 w-4 text-red-600" />
                  จัดการผู้ใช้งาน
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200">MasterAdmin เท่านั้น</span>
                </p>
                <p className="text-xs text-slate-600 mb-2">อนุมัติ/ปฏิเสธผู้ใช้ใหม่ และกำหนด Role</p>
                <div className="bg-white rounded border border-slate-200 p-2 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Workflow การอนุมัติผู้ใช้ใหม่:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">ผู้ใช้ใหม่ Register</span>
                      <span className="text-slate-400">→</span>
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">สถานะ: PENDING</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">→</span>
                      <span className="bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded">badge แดงขึ้นที่ปุ่ม Sidebar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">→</span>
                      <span className="text-slate-600">MasterAdmin กดเมนู "จัดการผู้ใช้งาน"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">→</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">อนุมัติ + กำหนด Role</span>
                      <span className="text-slate-400">/</span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">ปฏิเสธ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">→</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">ผู้ใช้เข้าระบบได้ทันที</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HELP */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <BookOpen className="h-4 w-4 text-slate-600" />
                <h3 className="font-bold text-sm text-slate-800">📚 HELP</h3>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-sm text-slate-800 mb-1">คู่มือการใช้งาน</p>
                <p className="text-xs text-slate-600">หน้านี้ — แสดงคู่มือโมดูลทั้งหมด, กฎระบบสำคัญ, สิทธิ์การเข้าถึง (Roles & Permissions), และวงจร PDCA</p>
              </div>
            </div>

            {/* Note */}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4">
              <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                <span className="text-lg">💡</span>
                เคล็ดลับ
              </p>
              <p className="text-xs text-blue-700">
                เมนูที่แสดงจะขึ้นอยู่กับ <strong>Role</strong> ของคุณ หากไม่เห็นเมนูบางส่วน ให้ติดต่อ <strong>MasterAdmin</strong> เพื่อขอเพิ่ม Role
              </p>
            </div>

          </CardContent>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════════
            สิทธิ์การเข้าถึง
        ══════════════════════════════════════════════════════════════════════ */}
        <Card className="border border-blue-200">
          <CardHeader className="pb-3 border-b border-blue-100 bg-blue-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <UserCog className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-base font-bold text-blue-800">สิทธิ์การเข้าถึง (Roles & Permissions)</CardTitle>
            </div>
            <p className="text-xs text-blue-600 mt-1.5">
              ระบบใช้ <strong>Multi-Role</strong> — ผู้ใช้ 1 คนสามารถมีได้หลาย Role พร้อมกัน
              ผู้ใช้ใหม่ทุกคนจะได้รับ Role <strong>Staff</strong> และสถานะ <strong>รออนุมัติ</strong> โดยอัตโนมัติ ยกเว้นผู้ใช้คนแรกที่จะได้รับ <strong>MasterAdmin</strong> ทันที
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">

            {/* Role cards */}
            {roleData.map(role => {
              const Icon = role.icon;
              return (
                <div key={role.name}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", role.iconCls)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border", role.badge)}>
                        {role.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{role.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{role.desc}</p>
                    <ul className="space-y-0.5">
                      {role.abilities.map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}

            {/* Permission table */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">ตารางสรุปสิทธิ์การใช้งาน</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">Role</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">อนุมัติ User</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">จัดการ Audit</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">CPAR</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">KPI</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">MOC</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">Document</th>
                      <th className="text-center px-2 py-2 font-semibold text-slate-600 whitespace-nowrap">Read-only</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permTable.map((row, i) => (
                      <tr key={row.role}
                        className={cn("border-b border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{row.role}</td>
                        <td className="text-center px-2 py-2"><Check v={row.approveUser} /></td>
                        <td className="text-center px-2 py-2"><Check v={row.manageAudit} /></td>
                        <td className="text-center px-2 py-2"><Check v={row.cpar} /></td>
                        <td className="text-center px-2 py-2"><Check v={row.kpi} /></td>
                        <td className="text-center px-2 py-2"><Check v={row.moc} /></td>
                        <td className="text-center px-2 py-2"><Check v={row.document} /></td>
                        <td className="text-center px-2 py-2"><Check v={row.readOnly} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Registration flow */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mt-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">ขั้นตอนการลงทะเบียน</p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {[
                  { step: "1", label: "สมัครสมาชิก", sub: "/register หรือ Google" },
                  { step: "→", label: null, sub: null },
                  { step: "2", label: "รออนุมัติ", sub: "สถานะ: pending" },
                  { step: "→", label: null, sub: null },
                  { step: "3", label: "MasterAdmin อนุมัติ", sub: "กำหนด Role ได้" },
                  { step: "→", label: null, sub: null },
                  { step: "4", label: "เข้าใช้งานได้", sub: "สถานะ: approved" },
                ].map((s, i) => s.label ? (
                  <div key={i} className="flex flex-col items-center rounded-lg bg-white border border-slate-200 px-3 py-2 min-w-[90px]">
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mb-1">{s.step}</span>
                    <span className="font-medium text-slate-700 text-center leading-tight">{s.label}</span>
                    <span className="text-slate-400 text-[10px] text-center leading-tight mt-0.5">{s.sub}</span>
                  </div>
                ) : (
                  <span key={i} className="text-slate-300 font-bold text-lg">→</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tech Stack ── */}
        <Card className="border border-slate-200 bg-slate-50">
          <CardContent className="p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-1">เทคโนโลยีที่ใช้</p>
            <p>React + Vite 8 · TypeScript · TailwindCSS v4 · shadcn/ui · Firebase Firestore · Firebase Auth · React Router v7 · Recharts</p>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
