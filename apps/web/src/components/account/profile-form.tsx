"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserDTO } from "@mimo/types";

export function ProfileForm({ user }: { user: UserDTO }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(body.error?.message ?? "No pudimos guardar tus datos.");
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Nombre</Label>
        <Input id="profile-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">Correo</Label>
        <Input id="profile-email" value={user.email} disabled />
        <p className="text-xs text-neutral-400">Para cambiar tu correo, escribinos desde Ayuda.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-phone">Teléfono</Label>
        <Input
          id="profile-phone"
          placeholder="7000-0000"
          maxLength={8}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Guardado.</p>}

      <Button type="submit" disabled={loading} className="h-10 w-fit px-6">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar cambios"}
      </Button>
    </form>
  );
}
