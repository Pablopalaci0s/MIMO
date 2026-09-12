import Image from "next/image";
import { StarRating } from "@/components/ui/star-rating";
import { ReportButton } from "@/components/reports/report-button";
import type { ReviewDTO } from "@mimo/types";

export function ReviewList({
  reviews,
  ratingKey,
}: {
  reviews: ReviewDTO[];
  ratingKey: "productRating" | "businessRating";
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-neutral-500">Todavía no hay reseñas.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => {
        const rating = review[ratingKey];
        if (rating === null) return null;
        return (
          <div key={review.id} className="flex flex-col gap-1.5 border-b border-neutral-100 pb-4 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{review.userName}</span>
                <StarRating value={rating} readOnly size="sm" />
              </div>
              <ReportButton targetType="REVIEW" targetId={review.id} />
            </div>
            {review.comment && <p className="text-sm text-neutral-600">{review.comment}</p>}
            {review.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {review.images.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative size-16 overflow-hidden rounded-lg bg-neutral-100 transition-opacity hover:opacity-90"
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-neutral-400">
              {new Date(review.createdAt).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
