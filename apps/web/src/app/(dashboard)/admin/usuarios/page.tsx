import { Suspense } from "react";
import { auth } from "@mimo/auth";
import { DataTable } from "@/components/dashboard/data-table";
import { UserFilters } from "@/components/admin/user-filters";
import { UserRow } from "@/components/admin/user-row";
import { listAdminUsers } from "@/lib/services/admin-user-service";
import type { UserRole } from "@mimo/types";

const COLUMNS = [
  { label: "Usuario" },
  { label: "Correo" },
  { label: "Negocios" },
  { label: "Pedidos" },
  { label: "Rol" },
  { label: "", className: "text-right" },
];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const rawParams = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const role = flat.role && ["USER", "BUSINESS", "ADMIN"].includes(flat.role) ? (flat.role as UserRole) : undefined;
  const isSuspended = flat.estado === "suspended" ? true : flat.estado === "active" ? false : undefined;

  const [session, users] = await Promise.all([
    auth(),
    listAdminUsers({ q: flat.q, role, isSuspended }),
  ]);
  const currentUserId = session?.user?.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Usuarios</h1>
        <p className="text-sm text-neutral-500">{users.length} cuentas.</p>
      </div>

      <Suspense fallback={null}>
        <UserFilters />
      </Suspense>

      <DataTable columns={COLUMNS} isEmpty={users.length === 0} emptyMessage="No encontramos usuarios con esos filtros.">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </DataTable>
    </div>
  );
}
