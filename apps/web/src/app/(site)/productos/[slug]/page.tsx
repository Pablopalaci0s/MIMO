import { Clock, ShieldCheck, Star, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/catalog/add-to-cart";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { ProductCard } from "@/components/catalog/product-card";
import { ReportButton } from "@/components/reports/report-button";
import { ReviewList } from "@/components/reviews/review-list";
import { formatPreparationTime } from "@/lib/format";
import { getProductBySlug, listRelatedProducts } from "@/lib/services/product-service";
import { listApprovedReviews } from "@/lib/services/review-service";

export async function generateMetadata({
  params,
}: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado — MIMO" };
  return {
    title: `${product.name} — MIMO`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/productos/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    listRelatedProducts(product.id, product.categorySlug),
    listApprovedReviews({ productId: product.id }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
          {product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].altText ?? product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : null}
          <FavoriteButton targetType="PRODUCT" targetId={product.id} size="lg" className="absolute top-3 right-3" />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <Link
              href={`/negocios/${product.business.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              {product.business.name}
              {product.business.verified && <ShieldCheck className="size-3.5 text-brand" />}
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {product.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
            <span className="text-2xl font-semibold text-neutral-900">
              ${product.price.toFixed(2)}
            </span>
            {product.ratingCount > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {product.ratingAvg.toFixed(1)}
                <span className="text-neutral-400">({product.ratingCount})</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              Preparación: {formatPreparationTime(product.preparationTimeMinutes)}
            </span>
            {product.availableToday && (
              <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                <Zap className="size-3.5" />
                Disponible hoy
              </span>
            )}
          </div>

          <p className="text-neutral-600">{product.description}</p>

          <AddToCart product={product} />

          <div>
            <ReportButton targetType="PRODUCT" targetId={product.id} />
          </div>
        </div>
      </div>

      <div className="mt-16 max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">Reseñas</h2>
        <ReviewList reviews={reviews} ratingKey="productRating" />
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
