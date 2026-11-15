import type { ListingReviewStatus } from "../../drizzle/schema";

/** Fields a customer relies on when deciding to buy. Changing any of them needs fresh admin approval. */
export const REVIEWED_LISTING_FIELDS = ["name", "description", "category", "priceKobo", "sizes"] as const;

export function changesReviewedContent(changes: Record<string, unknown>): boolean {
  return REVIEWED_LISTING_FIELDS.some(field => changes[field] !== undefined);
}

/**
 * Decide whether a seller action sends the listing back to the approval queue.
 * `current` is null when the listing was never submitted.
 */
export function nextReviewStatus(input: {
  current: ListingReviewStatus | null;
  publishing: boolean;
  contentChanged: boolean;
}): "pending" | null {
  if (input.publishing && input.current !== "approved") return "pending";
  if (input.contentChanged && input.current === "approved") return "pending";
  return null;
}

/** Public catalog and checkout eligibility: published by the seller AND approved by an admin. */
export function isListingPubliclyVisible(input: { status: string; review: ListingReviewStatus | null }): boolean {
  return input.status === "published" && input.review === "approved";
}
