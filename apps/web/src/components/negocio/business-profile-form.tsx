"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessProfileDTO, BusinessProfileInput } from "@mimo/types";

export function BusinessProfileForm({ profile }: { profile: BusinessProfileDTO }) {
  const [description, setDescription] = useState(profile.description ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(profile.logoUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.coverUrl);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [instagram, setInstagram] = useState(profile.instagram ?? "");
  const [facebook, setFacebook] = useState(profile.facebook ?? "");
  const [tiktok, setTiktok] = useState(profile.tiktok ?? "");
  const [addressLine, setAddressLine] = useState(profile.addressLine ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const input: BusinessProfileInput = {
      description,
      logoUrl,
      coverUrl,
      phone,
      whatsapp,
      instagram,
      facebook,
      tiktok,
      addressLine,
    };

    const response = await fetch("/api/negocio/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json();
    setLoading(false);

    if (!body.success) {
      setError(apiErrorMessage(body, "No pudimos guardar tu perfil."));
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label>Banner (se ve arriba en tu página pública)</Label>
        <ImageUploadField
          value={coverUrl}
          onChange={setCoverUrl}
          onRemove={() => setCoverUrl(null)}
          aspect="wide"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Logo</Label>
        <ImageUploadField value={logoUrl} onChange={setLogoUrl} onRemove={() => setLogoUrl(null)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-description">Descripción</Label>
        <Textarea
          id="business-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-phone">Teléfono</Label>
          <Input
            id="business-phone"
            maxLength={8}
            placeholder="7000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-whatsapp">WhatsApp</Label>
          <Input
            id="business-whatsapp"
            placeholder="+503 7000-0000"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="business-address">Dirección</Label>
        <Input
          id="business-address"
          placeholder="Colonia, calle, número"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-instagram">Instagram</Label>
          <Input
            id="business-instagram"
            placeholder="@tunegocio"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-facebook">Facebook</Label>
          <Input
            id="business-facebook"
            placeholder="facebook.com/tunegocio"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="business-tiktok">TikTok</Label>
          <Input
            id="business-tiktok"
            placeholder="@tunegocio"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Guardado.</p>}

      <Button type="submit" disabled={loading} className="h-11 w-fit px-6">
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar cambios"}
      </Button>
    </form>
  );
}
