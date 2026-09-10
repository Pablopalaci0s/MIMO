"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MunicipalityDTO } from "@mimo/types";

export function BusinessApplicationForm({ municipalities }: { municipalities: MunicipalityDTO[] }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/register-business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        ownerName,
        email,
        phone,
        whatsapp: whatsapp || undefined,
        municipalityId,
        addressLine,
        password,
      }),
    });
    const body = await response.json();

    if (!body.success) {
      setLoading(false);
      setError(body.error?.message ?? "No pudimos enviar tu solicitud.");
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/negocio");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-name">Nombre del negocio</Label>
        <Input id="business-name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner-name">Tu nombre</Label>
        <Input id="owner-name" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-email">Correo</Label>
          <Input
            id="business-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-phone">Teléfono</Label>
          <Input
            id="business-phone"
            required
            maxLength={8}
            placeholder="7000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-whatsapp">WhatsApp (opcional, si es distinto al teléfono)</Label>
        <Input
          id="business-whatsapp"
          placeholder="+503 7000-0000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-municipality">Municipio</Label>
        <Select value={municipalityId} onValueChange={setMunicipalityId} required>
          <SelectTrigger id="business-municipality" className="w-full">
            <SelectValue placeholder="Seleccioná un municipio" />
          </SelectTrigger>
          <SelectContent>
            {municipalities.map((municipality) => (
              <SelectItem key={municipality.id} value={municipality.id}>
                {municipality.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-address">Dirección</Label>
        <Input
          id="business-address"
          required
          placeholder="Colonia, calle, número"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-password">Contraseña</Label>
        <Input
          id="business-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="text-xs text-neutral-400">Mínimo 8 caracteres, con mayúscula y número.</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !municipalityId} className="h-11">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Enviar solicitud"}
      </Button>
      <p className="text-xs text-neutral-400">
        Tu negocio queda pendiente de aprobación — te avisamos apenas lo revisemos. Mientras tanto ya podés entrar a
        tu panel para conocerlo.
      </p>
      <p className="text-xs text-neutral-400">
        Al enviar la solicitud aceptás nuestros{" "}
        <Link href="/terminos" className="underline hover:text-neutral-600">
          Términos
        </Link>{" "}
        y nuestra{" "}
        <Link href="/privacidad" className="underline hover:text-neutral-600">
          Política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}
