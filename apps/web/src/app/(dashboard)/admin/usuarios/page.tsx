import { auth } from "@mimo/auth";
import { DataTable } from "@/components/dashboard/data-table";
import { UserRow } from "@/components/admin/user-row";
import { listAdminUsers } from "@/lib/services/admin-user-service";

const COLUMNS = [
  { label: "Usuario" },
  { label: "Correo" },
  { label: "Negocios" },
  { label: "Pedidos" },
  { label: "Rol" },
  { label: "", className: "text-right" },
];

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([auth(), listAdminUsers()]);
  const currentUserId = session?.user?.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Usuarios</h1>
        <p className="text-sm text-neutral-500">{users.length} cuentas registradas.</p>
      </div>

      <DataTable columns={COLUMNS} isEmpty={users.length === 0} emptyMessage="No hay usuarios todavía.">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
        ))}
      </DataTable>
    </div>
  );
}
