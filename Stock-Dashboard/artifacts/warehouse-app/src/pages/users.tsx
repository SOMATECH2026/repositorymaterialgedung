import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ExportMenu } from "@/components/export-menu";
import type { ExportColumn } from "@/lib/export";

const ROLE_LABELS: Record<string, string> = {
  technician: "Teknisi", chief_engineer: "Chief Engineer",
  warehouse_admin: "Warehouse Admin", manager: "Manager", super_admin: "Super Admin",
};
const ROLE_COLORS: Record<string, string> = {
  technician: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  chief_engineer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  warehouse_admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  manager: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Nama", key: "name", width: 22 },
  { header: "Email", key: "email", width: 28 },
  { header: "Departemen", key: "department", width: 18 },
  { header: "Role", key: "roleLabel", width: 18 },
  { header: "No. Telepon", key: "phone", width: 16 },
  { header: "Status", key: "statusLabel", width: 10 },
  { header: "Dibuat", key: "createdAtFmt", width: 14 },
];

type UserForm = { name: string; email: string; role: string; department: string; phone: string; };
const emptyForm: UserForm = { name: "", email: "", role: "technician", department: "", phone: "" };

export function Users() {
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ type: "create" | "edit"; userId?: number; form: UserForm } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const filtered = users?.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  const exportData = (filtered ?? []).map(u => ({
    ...u,
    roleLabel: ROLE_LABELS[u.role] ?? u.role,
    statusLabel: u.isActive ? "Aktif" : "Nonaktif",
    phone: u.phone ?? "-",
    createdAtFmt: new Date(u.createdAt).toLocaleDateString("id-ID"),
  })) as unknown as Record<string, unknown>[];

  function openCreate() { setDialog({ type: "create", form: { ...emptyForm } }); }
  function openEdit(u: NonNullable<typeof users>[0]) {
    setDialog({ type: "edit", userId: u.id, form: { name: u.name, email: u.email, role: u.role, department: u.department, phone: u.phone ?? "" } });
  }

  function handleSave() {
    if (!dialog) return;
    const { form } = dialog;
    if (dialog.type === "create") {
      createUser.mutate(
        { data: { name: form.name, email: form.email, role: form.role as "technician" | "chief_engineer" | "warehouse_admin" | "manager" | "super_admin", department: form.department, phone: form.phone || undefined } },
        {
          onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setDialog(null); toast({ title: "User berhasil ditambahkan" }); },
          onError: () => toast({ title: "Gagal menambahkan user", variant: "destructive" }),
        }
      );
    } else if (dialog.userId) {
      updateUser.mutate(
        { id: dialog.userId, data: { name: form.name, role: form.role as "technician" | "chief_engineer" | "warehouse_admin" | "manager" | "super_admin", department: form.department, phone: form.phone || undefined } },
        {
          onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setDialog(null); toast({ title: "User berhasil diperbarui" }); },
          onError: () => toast({ title: "Gagal memperbarui user", variant: "destructive" }),
        }
      );
    }
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`Hapus user "${name}"? Data tidak dapat dikembalikan.`)) return;
    deleteUser.mutate(
      { id },
      {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); toast({ title: "User berhasil dihapus" }); },
        onError: () => toast({ title: "Gagal menghapus user", variant: "destructive" }),
      }
    );
  }

  function updateForm(field: keyof UserForm, value: string) {
    setDialog(d => d ? { ...d, form: { ...d.form, [field]: value } } : null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola akun dan hak akses pengguna sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu data={exportData} columns={EXPORT_COLUMNS} title="Data Pengguna" filename="data-pengguna" />
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Tambah User</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, email, departemen..." className="pl-9 max-w-md" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nama</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Departemen</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered?.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Tidak ada user ditemukan</td></tr>
                  )}
                  {filtered?.map(u => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name}</div>
                        {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.department}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive
                          ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><UserCheck className="h-3 w-3" /> Aktif</span>
                          : <span className="flex items-center gap-1 text-xs text-muted-foreground"><UserX className="h-3 w-3" /> Nonaktif</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>Edit User</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(u.id, u.name)}>
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog?.type === "create" ? "Tambah User" : "Edit User"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input value={dialog?.form.name ?? ""} onChange={e => updateForm("name", e.target.value)} placeholder="Nama lengkap..." />
            </div>
            {dialog?.type === "create" && (
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={dialog?.form.email ?? ""} onChange={e => updateForm("email", e.target.value)} placeholder="email@company.com" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Departemen <span className="text-destructive">*</span></Label>
              <Input value={dialog?.form.department ?? ""} onChange={e => updateForm("department", e.target.value)} placeholder="Departemen..." />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={dialog?.form.role ?? "technician"} onValueChange={v => updateForm("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input value={dialog?.form.phone ?? ""} onChange={e => updateForm("phone", e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={createUser.isPending || updateUser.isPending}>
              {createUser.isPending || updateUser.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
