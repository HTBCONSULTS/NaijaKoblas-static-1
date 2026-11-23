ALTER TABLE "sellerDashboardSettings" ADD COLUMN IF NOT EXISTS "backgroundImageUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "sellerDashboardSettings" ADD COLUMN IF NOT EXISTS "backgroundPublicId" varchar(255);
