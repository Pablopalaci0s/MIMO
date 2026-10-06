"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { apiErrorMessage } from "@/lib/api-error-message";
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
  SUPPORT_AGENT: "Agente de soporte",
  SUPPORT_MANAGER: "Supervisor de soporte",
};

export function UserRow({ user, isSelf }: { user: AdminUserDTO; isSelf: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(input: { role?: UserRole; isSuspended?: boolean; canReviewDocuments?: boolean }) {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setLoading(false);
    if (!response.ok) {
      setError(apiErrorMessage(await response.json().catch(() => null), "No se pudo guardar el cambio."));
      return;
    }
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
        {user.role === "ADMIN" && (
          <label className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
            <Switch
              checked={user.canReviewDocuments}
              disabled={loading}
              onCheckedChange={(checked) => update({ canReviewDocuments: checked })}
            />
            Puede ver documentos de identidad
          </label>
        )}
        {error && <p className="mt-1 max-w-56 text-xs text-destructive">{error}</p>}
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
