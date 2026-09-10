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
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900">{user.name}</p>
          {user.isSuspended && <Badge variant="destructive">Suspendido</Badge>}
          {isSelf && <Badge variant="outline">Vos</Badge>}
        </div>
        <p className="text-sm text-neutral-500">
          {user.email} · {user.businessCount > 0 ? `${user.businessCount} negocio(s) · ` : ""}
          {user.orderCount} pedido(s)
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
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
        <Button
          size="sm"
          variant={user.isSuspended ? "outline" : "destructive"}
          disabled={isSelf || loading}
          onClick={() => update({ isSuspended: !user.isSuspended })}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : user.isSuspended ? "Reactivar" : "Suspender"}
        </Button>
      </div>
    </div>
  );
}
