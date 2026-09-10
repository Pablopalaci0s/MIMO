import { MapPin, MessageCircle, ShieldCheck, Star, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/product-card";
import { ReportButton } from "@/components/reports/report-button";
import { ReviewList } from "@/components/reviews/review-list";
import { getBusinessBySlug } from "@/lib/services/business-service";
import { listApprovedReviews } from "@/lib/services/review-service";

export async function generateMetadata({
  params,
}: PageProps<"/negocios/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return { title: "Negocio no encontrado — MIMO" };
  return {
    title: `${business.name} — MIMO`,
    description: business.description ?? undefined,
  };
}

function whatsappHref(whatsapp: string): string {
  const digits = whatsapp.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

export default async function BusinessPage({ params }: PageProps<"/negocios/[slug]">) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const reviews = await listApprovedReviews({ businessId: business.id });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-32 w-full rounded-2xl bg-gradient-to-br from-brand-soft to-neutral-100 sm:h-48" />

      <div className="-mt-10 flex flex-col gap-4 px-2 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-neutral-900 text-2xl font-semibold text-white shadow-sm sm:size-24">
            {business.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                {business.name}
              </h1>
              {business.verified && <ShieldCheck className="size-5 text-brand" />}
            </div>
            {business.municipalityName && (
              <p className="flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="size-3.5" />
                {business.municipalityName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {business.whatsapp && (
            <a
              href={whatsappHref(business.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              <MessageCircle className="size-4" />
              Escribir por WhatsApp
            </a>
          )}
          <ReportButton targetType="BUSINESS" targetId={business.id} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 px-2 text-sm text-neutral-600">
        {business.ratingCount > 0 && (
          <span className="flex items-center gap-1">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {business.ratingAvg.toFixed(1)}
            <span className="text-neutral-400">({business.ratingCount} reseñas)</span>
          </span>
        )}
        {business.deliveryZoneNames.length > 0 && (
          <span className="flex items-center gap-1">
            <Truck className="size-4" />
            Entrega a {business.deliveryZoneNames.join(", ")}
          </span>
        )}
      </div>

      {business.description && (
        <p className="mt-4 max-w-2xl px-2 text-neutral-600">{business.description}</p>
      )}

      <div className="mt-10 px-2">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">
          Productos ({business.products.length})
        </h2>
        {business.products.length === 0 ? (
          <p className="text-sm text-neutral-500">Este negocio todavía no tiene productos activos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {business.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 max-w-2xl px-2">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-neutral-900">Reseñas</h2>
        <ReviewList reviews={reviews} ratingKey="businessRating" />
      </div>
    </div>
  );
}
