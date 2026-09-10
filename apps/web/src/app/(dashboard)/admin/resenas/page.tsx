import { ReviewRow } from "@/components/admin/review-row";
import { listAdminReviews } from "@/lib/services/admin-review-service";

export default async function AdminReviewsPage() {
  const reviews = await listAdminReviews();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Reseñas</h1>
        <p className="text-sm text-neutral-500">{reviews.length} reseñas en total.</p>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-500">
            Todavía no hay reseñas.
          </p>
        ) : (
          reviews.map((review) => <ReviewRow key={review.id} review={review} />)
        )}
      </div>
    </div>
  );
}
