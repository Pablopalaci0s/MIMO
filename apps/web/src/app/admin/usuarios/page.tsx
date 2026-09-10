import { auth } from "@mimo/auth";
import { UserRow } from "@/components/admin/user-row";
import { listAdminUsers } from "@/lib/services/admin-user-service";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([auth(), listAdminUsers()]);
  const currentUserId = session?.user?.id;

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
      ))}
    </div>
  );
}
