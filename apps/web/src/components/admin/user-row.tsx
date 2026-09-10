"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminUserDTO } from "@mimo/types";
import type { UserRole } from "@mimo/types";

const ROLE_LABEL: Record<UserRole, string> = {
  USER: "Cliente",
  BUSINESS: "Negocio",
  ADMIN: "Administrador",
};

export function UserRow({ user, isSelf }: { user: AdminUserDTO; isSelf: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(input: { role?: UserRole; isSuspended?: boolean }) {
    setLoading(true);
    await fetch(`/api/admin/usuarios/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="py-3 pl-4">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900">{user.name}</p>
          {user.isSuspended && <Badge variant="destructive">Suspendido</Badge>}
          {isSelf && <Badge variant="outline">Vos</Badge>}
        </div>
      </td>
      <td className="py-3 text-neutral-500">{user.email}</td>
      <td className="py-3 text-neutral-500">{user.businessCount > 0 ? user.businessCount : "—"}</td>
      <td className="py-3 text-neutral-500">{user.orderCount}</td>
      <td className="py-3">
        <Select
          value={user.role}
          disabled={isSelf || loading}
          onValueChange={(value) => update({ role: value as UserRole })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-3 pr-4">
        <div className="flex justify-end">
          <Button
            size="sm"
            variant={user.isSuspended ? "outline" : "destructive"}
            disabled={isSelf || loading}
            onClick={() => update({ isSuspended: !user.isSuspended })}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : user.isSuspended ? "Reactivar" : "Suspender"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
