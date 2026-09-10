"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "@/lib/api-error-message";
import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessProductDTO, BusinessProductInput, CategoryDTO, ProductStatus } from "@mimo/types";

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "ACTIVE", label: "Activo — visible en el catálogo" },
  { value: "DRAFT", label: "Borrador — solo vos lo ves" },
  { value: "INACTIVE", label: "Inactivo — oculto temporalmente" },
];

export function ProductForm({
  categories,
  product,
  productId,
}: {
  categories: CategoryDTO[];
  product?: BusinessProductDTO;
  productId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice ? String(product.compareAtPrice) : "",
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [stock, setStock] = useState(product ? String(product.stock) : "1");
  const [isPersonalizable, setIsPersonalizable] = useState(product?.isPersonalizable ?? false);
  const [availableToday, setAvailableToday] = useState(product?.availableToday ?? true);
  const [preparationTimeMinutes, setPreparationTimeMinutes] = useState(
    product ? String(product.preparationTimeMinutes) : "60",
  );
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "ACTIVE");
  const [images, setImages] = useState<{ url: string; altText: string }[]>(
    product?.images.length ? product.images.map((image) => ({ url: image.url, altText: image.altText ?? "" })) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateImageUrl(index: number, url: string) {
    setImages((prev) => prev.map((image, i) => (i === index ? { ...image, url } : image)));
  }

  function updateImageAlt(index: number, altText: string) {
    setImages((prev) => prev.map((image, i) => (i === index ? { ...image, altText } : image)));
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (images.filter((image) => image.url.trim()).length === 0) {
      setError("Subí al menos una foto del producto.");
      return;
    }

    setLoading(true);

    const input: BusinessProductInput = {
      name,
      description,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      categoryId,
      stock: Number(stock),
      isPersonalizable,
      availableToday,
      preparationTimeMinutes: Number(preparationTimeMinutes),
      status,
      images: images.filter((image) => image.url.trim()).map((image) => ({ url: image.url.trim(), altText: image.altText.trim() || undefined })),
    };

    const response = await fetch(productId ? `/api/negocio/productos/${productId}` : "/api/negocio/productos", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json();

    if (!body.success) {
      setLoading(false);
      setError(apiErrorMessage(body, "No pudimos guardar el producto."));
      return;
    }

    router.push("/negocio/productos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Precio (USD)</Label>
          <Input id="price" type="number" min="0.01" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compare-price">Precio anterior (opcional)</Label>
          <Input
            id="compare-price"
            type="number"
            min="0.01"
            step="0.01"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder="Seleccioná una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock">Inventario</Label>
          <Input id="stock" type="number" min="0" step="1" required value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prep-time">Tiempo de preparación (min)</Label>
          <Input
            id="prep-time"
            type="number"
            min="5"
            step="5"
            required
            value={preparationTimeMinutes}
            onChange={(e) => setPreparationTimeMinutes(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-900">Personalizable</span>
          <Switch checked={isPersonalizable} onCheckedChange={setIsPersonalizable} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-900">Disponible hoy</span>
          <Switch checked={availableToday} onCheckedChange={setAvailableToday} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Fotos (hasta 8)</Label>
        <div className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <ImageUploadField
                value={image.url}
                onChange={(url) => updateImageUrl(index, url)}
                onRemove={() => removeImage(index)}
              />
              <Input
                placeholder="Texto alternativo (opcional)"
                className="w-28 text-xs"
                value={image.altText}
                onChange={(e) => updateImageAlt(index, e.target.value)}
              />
            </div>
          ))}
          {images.length < 8 && (
            <ImageUploadField
              value={null}
              onChange={(url) => setImages((prev) => [...prev, { url, altText: "" }])}
            />
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !categoryId} className="h-11 w-fit px-6">
        {loading ? <Loader2 className="size-4 animate-spin" /> : productId ? "Guardar cambios" : "Crear producto"}
      </Button>
    </form>
  );
}
