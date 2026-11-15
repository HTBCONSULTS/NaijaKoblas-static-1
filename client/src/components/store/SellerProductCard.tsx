import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Clock3, PackageCheck, Pencil, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { money } from "@/store";
import { ProductImageUploader, type ProductGalleryImage } from "./ProductImageUploader";

export type SellerListingReview = {
  status: "pending" | "approved" | "rejected";
  note: string | null;
} | null;

export type SellerProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceKobo: number;
  inventoryCount: number;
  sizes: string[];
  status: "draft" | "published" | "archived";
  images?: ProductGalleryImage[];
  review: SellerListingReview;
};

export type ListingStage = "live" | "pending" | "rejected" | "draft" | "archived";

/** One plain-language stage per listing, combining the seller's status with the admin's decision. */
export function listingStage(product: Pick<SellerProduct, "status" | "review">): ListingStage {
  if (product.status === "archived") return "archived";
  if (product.status === "published") return product.review?.status === "approved" ? "live" : "pending";
  return product.review?.status === "rejected" ? "rejected" : "draft";
}

export const stageLabels: Record<ListingStage, string> = {
  live: "Live",
  pending: "Awaiting approval",
  rejected: "Needs changes",
  draft: "Draft",
  archived: "Archived",
};

export const SELLER_CATEGORIES = ["Shoes", "Bags", "Belts", "Accessories", "Wallets", "Clothing"];

export function SellerProductCard({
  product,
  storeActive,
  onChanged,
}: {
  product: SellerProduct;
  storeActive: boolean;
  onChanged: (message?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const stage = listingStage(product);
  // Listings that still need work open expanded; live and pending ones stay compact.
  const [expanded, setExpanded] = useState(stage === "draft" || stage === "rejected");
  const updateProduct = trpc.seller.updateProduct.useMutation({
    onSuccess: (_product, input) => {
      setEditing(false);
      onChanged(input.changes.status === "published"
        ? "Submitted for approval. You'll get a notification once an admin reviews it."
        : "Listing updated.");
    },
  });
  const hasPrimaryPhoto = Boolean(product.images?.some(image => image.isPrimary));
  const canSubmit = storeActive && product.inventoryCount > 0 && hasPrimaryPhoto;
  const missingRequirements = [
    !hasPrimaryPhoto ? "Add and select a primary photo" : null,
    product.inventoryCount < 1 ? "Add available stock" : null,
    !storeActive ? "Contact support about your inactive store" : null,
  ].filter(Boolean) as string[];
  const reReviewWarning = stage === "live" ? "Changing this sends your live listing back for approval." : null;

  const submitStockEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const priceNaira = Number(data.get("priceNaira"));
    const inventoryCount = Number(data.get("inventoryCount"));
    updateProduct.mutate({
      productId: product.id,
      changes: {
        ...(priceNaira !== product.priceKobo / 100 ? { priceNaira } : {}),
        inventoryCount,
      },
    });
  };

  const submitDetailsEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateProduct.mutate({
      productId: product.id,
      changes: {
        name: String(data.get("name") ?? "").trim(),
        category: String(data.get("category") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        sizes: String(data.get("sizes") ?? "").split(",").map(size => size.trim()).filter(Boolean),
      },
    });
  };

  return <article className="seller-product-card" id={`listing-${product.id}`}>
    <div className="seller-product-card-head">
      <div className="seller-product-card-title">
        {product.images?.find(image => image.isPrimary) && <img src={product.images.find(image => image.isPrimary)!.url} alt="" />}
        <div>
          <span className={`stage-pill stage-pill--${stage}`}>{stageLabels[stage]}</span>
          <h3>{product.name}</h3>
          <p>{product.category} · {product.sizes.join(", ")} · {product.inventoryCount} in stock</p>
        </div>
      </div>
      <div className="seller-product-card-actions">
        <span className="seller-product-card-price">{money(product.priceKobo / 100)}</span>
        <button type="button" className="button button--outline" onClick={() => setEditing(value => !value)} aria-expanded={editing}>
          {editing ? <><X size={15} /> Close</> : <><Pencil size={15} /> Edit details</>}
        </button>
      </div>
    </div>

    {stage === "rejected" && product.review?.note && <div className="seller-review-note seller-review-note--rejected" role="status">
      <AlertTriangle size={18} /><div><strong>Admin feedback</strong><p>{product.review.note}</p><small>Make the changes, then submit again.</small></div>
    </div>}
    {stage === "pending" && <div className="seller-review-note" role="status">
      <Clock3 size={18} /><div><strong>Waiting for admin approval</strong><p>Shoppers can't see this listing yet. You'll get a notification when it's reviewed.</p></div>
    </div>}

    {editing && <form className="seller-details-form" onSubmit={submitDetailsEdit}>
      <div className="form-grid">
        <label className="form-field"><span>PRODUCT NAME</span><input name="name" defaultValue={product.name} minLength={2} maxLength={180} required /></label>
        <label className="form-field"><span>CATEGORY</span><input name="category" list="seller-category-options" defaultValue={product.category} minLength={2} maxLength={80} required /></label>
        <label className="form-field form-field--wide"><span>DESCRIPTION</span><textarea name="description" defaultValue={product.description} minLength={20} maxLength={5000} rows={4} required /></label>
        <label className="form-field form-field--wide"><span>SIZES / STYLES (comma-separated)</span><input name="sizes" defaultValue={product.sizes.join(", ")} required /></label>
      </div>
      {reReviewWarning && <p className="seller-form-hint"><AlertTriangle size={14} /> {reReviewWarning}</p>}
      <div className="seller-form-actions">
        <button className="button button--dark" type="submit" disabled={updateProduct.isPending}>{updateProduct.isPending ? "Saving…" : "Save details"}</button>
        <button className="button button--outline" type="button" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>}

    <button type="button" className="seller-card-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? "Hide price, stock & photos" : "Manage price, stock & photos"}<ChevronDown size={16} aria-hidden="true" />
    </button>
    {expanded && <div className="seller-product-card-body">
      <div className="seller-product-card-details">
        <div className="seller-product-step"><span>1</span><div><strong>Price and stock</strong><small>Customers can only buy what you have available.{stage === "live" ? " Price changes need re-approval; stock changes don't." : ""}</small></div></div>
        <form className="seller-stock-form" onSubmit={submitStockEdit}>
          <label>Price in ₦ <input aria-label={`${product.name} price`} name="priceNaira" type="number" min="1" max="21000000" step="1" defaultValue={product.priceKobo / 100} required /></label>
          <label>Available stock <input aria-label={`${product.name} stock`} name="inventoryCount" type="number" min="0" max="1000000" step="1" defaultValue={product.inventoryCount} required /></label>
          <button className="button button--outline" type="submit" disabled={updateProduct.isPending}>Save</button>
        </form>
        <div className="seller-product-step"><span>2</span><div><strong>Product photos</strong><small>Clear JPEG, PNG or WebP photos. The primary photo is what shoppers see first.</small></div></div>
        <ProductImageUploader productId={product.id} initialImages={product.images ?? []} canSetPrimary onUploaded={() => onChanged()} />
      </div>
      <aside className={`seller-publish-checklist ${canSubmit ? "is-ready" : ""}`} aria-live="polite">
        {stage === "live" ? <><Check size={22} /><strong>Live in the shop</strong><p>Approved by NaijaKoblas and visible to shoppers{product.inventoryCount < 1 ? " once you add stock" : ""}.</p></>
          : stage === "pending" ? <><Clock3 size={22} /><strong>Under review</strong><p>An admin checks the photos, description and price before the listing goes live.</p></>
          : canSubmit ? <><Check size={22} /><strong>Ready to submit</strong><p>Your listing has a primary photo and stock. Submit it for admin approval.</p></>
          : <><PackageCheck size={22} /><strong>Almost ready</strong><p>Complete these before submitting:</p><ul>{missingRequirements.map(item => <li key={item}>{item}</li>)}</ul></>}
        {stage === "live" || stage === "pending"
          ? <button className="button button--outline" disabled={updateProduct.isPending} onClick={() => updateProduct.mutate({ productId: product.id, changes: { status: "archived" } })}>{stage === "pending" ? "Withdraw & archive" : "Archive listing"}</button>
          : <button className="button button--dark" disabled={updateProduct.isPending || !canSubmit} onClick={() => updateProduct.mutate({ productId: product.id, changes: { status: "published" } })}>{updateProduct.isPending ? "Saving…" : stage === "rejected" ? "Resubmit for approval" : stage === "archived" ? "Relist" : "Submit for approval"}<ArrowRight size={16} /></button>}
      </aside>
    </div>}
    {updateProduct.error && <p className="portal-error" role="alert">{updateProduct.error.message}</p>}
  </article>;
}
