import { describe, expect, it } from "vitest";
import { changesReviewedContent, isListingPubliclyVisible, nextReviewStatus } from "./listing-review";

describe("listing review rules", () => {
  it("queues a first publish and a resubmission after rejection", () => {
    expect(nextReviewStatus({ current: null, publishing: true, contentChanged: false })).toBe("pending");
    expect(nextReviewStatus({ current: "rejected", publishing: true, contentChanged: false })).toBe("pending");
  });

  it("keeps an approved listing approved when it is only re-published or restocked", () => {
    expect(nextReviewStatus({ current: "approved", publishing: true, contentChanged: false })).toBeNull();
    expect(changesReviewedContent({ inventoryCount: 4 })).toBe(false);
  });

  it("re-reviews an approved listing when customer-facing content changes", () => {
    expect(changesReviewedContent({ priceKobo: 100 })).toBe(true);
    expect(nextReviewStatus({ current: "approved", publishing: false, contentChanged: true })).toBe("pending");
  });

  it("does not queue unsubmitted drafts being edited", () => {
    expect(nextReviewStatus({ current: null, publishing: false, contentChanged: true })).toBeNull();
  });

  it("only shows published and approved listings", () => {
    expect(isListingPubliclyVisible({ status: "published", review: "approved" })).toBe(true);
    expect(isListingPubliclyVisible({ status: "published", review: "pending" })).toBe(false);
    expect(isListingPubliclyVisible({ status: "draft", review: "approved" })).toBe(false);
    expect(isListingPubliclyVisible({ status: "published", review: null })).toBe(false);
  });
});
