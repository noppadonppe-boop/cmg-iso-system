export type DepartmentColor = {
  card: string;
  header: string;
  badge: string;
  cell: string;
  accent: string;
  foreground: string;
};

const palette: DepartmentColor[] = [
  { card: "border-blue-200 border-l-blue-500", header: "bg-blue-50/80 border-blue-100", badge: "border-blue-200 bg-blue-100 text-blue-700", cell: "bg-blue-50/60", accent: "bg-blue-500", foreground: "text-blue-700" },
  { card: "border-emerald-200 border-l-emerald-500", header: "bg-emerald-50/80 border-emerald-100", badge: "border-emerald-200 bg-emerald-100 text-emerald-700", cell: "bg-emerald-50/60", accent: "bg-emerald-500", foreground: "text-emerald-700" },
  { card: "border-violet-200 border-l-violet-500", header: "bg-violet-50/80 border-violet-100", badge: "border-violet-200 bg-violet-100 text-violet-700", cell: "bg-violet-50/60", accent: "bg-violet-500", foreground: "text-violet-700" },
  { card: "border-amber-200 border-l-amber-500", header: "bg-amber-50/80 border-amber-100", badge: "border-amber-200 bg-amber-100 text-amber-700", cell: "bg-amber-50/60", accent: "bg-amber-500", foreground: "text-amber-700" },
  { card: "border-rose-200 border-l-rose-500", header: "bg-rose-50/80 border-rose-100", badge: "border-rose-200 bg-rose-100 text-rose-700", cell: "bg-rose-50/60", accent: "bg-rose-500", foreground: "text-rose-700" },
  { card: "border-cyan-200 border-l-cyan-500", header: "bg-cyan-50/80 border-cyan-100", badge: "border-cyan-200 bg-cyan-100 text-cyan-700", cell: "bg-cyan-50/60", accent: "bg-cyan-500", foreground: "text-cyan-700" },
  { card: "border-orange-200 border-l-orange-500", header: "bg-orange-50/80 border-orange-100", badge: "border-orange-200 bg-orange-100 text-orange-700", cell: "bg-orange-50/60", accent: "bg-orange-500", foreground: "text-orange-700" },
  { card: "border-indigo-200 border-l-indigo-500", header: "bg-indigo-50/80 border-indigo-100", badge: "border-indigo-200 bg-indigo-100 text-indigo-700", cell: "bg-indigo-50/60", accent: "bg-indigo-500", foreground: "text-indigo-700" },
  { card: "border-teal-200 border-l-teal-500", header: "bg-teal-50/80 border-teal-100", badge: "border-teal-200 bg-teal-100 text-teal-700", cell: "bg-teal-50/60", accent: "bg-teal-500", foreground: "text-teal-700" },
  { card: "border-lime-200 border-l-lime-500", header: "bg-lime-50/80 border-lime-100", badge: "border-lime-200 bg-lime-100 text-lime-700", cell: "bg-lime-50/60", accent: "bg-lime-500", foreground: "text-lime-700" },
  { card: "border-pink-200 border-l-pink-500", header: "bg-pink-50/80 border-pink-100", badge: "border-pink-200 bg-pink-100 text-pink-700", cell: "bg-pink-50/60", accent: "bg-pink-500", foreground: "text-pink-700" },
  { card: "border-sky-200 border-l-sky-500", header: "bg-sky-50/80 border-sky-100", badge: "border-sky-200 bg-sky-100 text-sky-700", cell: "bg-sky-50/60", accent: "bg-sky-500", foreground: "text-sky-700" },
];

// Keep the same department on the same color across KPI Management and KPI Reports.
const colorsByCode: Record<string, DepartmentColor> = {
  MKT: palette[0], LOG: palette[1], DCC: palette[2], HR: palette[3],
  SHE: palette[4], QC: palette[5], MFG: palette[6], IT: palette[7],
  PCT: palette[8], PPE: palette[9], CON: palette[10], PP: palette[11],
};

export function getDepartmentColor(departmentId: string, departmentCode?: string): DepartmentColor {
  if (departmentCode && colorsByCode[departmentCode.toUpperCase()]) {
    return colorsByCode[departmentCode.toUpperCase()];
  }

  const hash = Array.from(departmentId).reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[hash % palette.length];
}
