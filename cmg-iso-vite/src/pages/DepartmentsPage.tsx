import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { getDepartments, getUsers } from "@/lib/db";
import type { Department, User } from "@/lib/types";
import { Building2, Loader2, Users } from "lucide-react";

export default function DepartmentsPage() {
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, u] = await Promise.all([getDepartments(), getUsers()]);
      setDepts(d); setUsers(u);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AppLayout title="Departments">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(dept => {
            const deptUsers = users.filter(u => u.departmentId === dept.id);
            return (
              <Card key={dept.id} className="border border-slate-200 hover:border-slate-300 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{dept.name}</p>
                      <p className="text-xs font-mono text-blue-600 font-bold mt-0.5">{dept.code}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{deptUsers.length} member{deptUsers.length !== 1 ? "s" : ""}</span>
                    </div>
                    {deptUsers.slice(0, 3).map(u => (
                      <div key={u.id} className="flex items-center gap-2 text-xs text-slate-600 pl-5">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        <span>{u.name}</span>
                        <span className="text-slate-400 text-[10px] ml-auto">{u.role}</span>
                      </div>
                    ))}
                    {deptUsers.length > 3 && (
                      <p className="text-xs text-slate-400 pl-5">+{deptUsers.length - 3} more</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
