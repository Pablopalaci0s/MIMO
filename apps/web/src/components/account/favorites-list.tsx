"use client";

import { Heart, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FavoritesListDTO } from "@mimo/types";
import { BusinessSummaryCard } from "@/components/catalog/business-summary-card";
import { ProductCard } from "@/components/catalog/product-card";
import { useFavorites } from "@/lib/favorites/favorites-context";

export function FavoritesList() {
  const [data, setData] = useState<FavoritesListDTO | null>(null);
  const { isFavorite } = useFavorites();

  useEffect(() => {
    fetch("/api/favoritos")
      .then((response) => response.json())
      .then((body) => {
        if (body.success) setData(body.data);
      });
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-16 text-neutral-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  // Se filtra contra el estado en memoria (no la respuesta original) para
  // que sacar un favorito lo quite de la lista al toque, sin recargar.
  const products = data.products.filter((product) => isFavorite("PRODUCT", product.id));
  const businesses = data.businesses.filter((business) => isFavorite("BUSINESS", business.id));

  if (products.length === 0 && businesses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <Heart className="size-8 text-neutral-300" />
        <p className="text-neutral-600">Todavía no tenés favoritos.</p>
        <p className="text-sm text-neutral-400">
          Tocá el corazón en cualquier producto o negocio para guardarlo acá.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {businesses.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">
            Negocios ({businesses.length})
          </h2>
          <div className="flex flex-col gap-3">
            {businesses.map((business) => (
              <BusinessSummaryCard key={business.id} business={business} />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">
            Productos ({products.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
