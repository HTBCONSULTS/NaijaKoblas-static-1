CREATE TYPE "public"."listing_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "sellerDashboardSettings" (
	"userId" integer PRIMARY KEY NOT NULL,
	"dashboardName" varchar(60),
	"accentColor" varchar(7) DEFAULT '#22a35a' NOT NULL,
	"theme" varchar(8) DEFAULT 'dark' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sellerDashboardSettings_hex_accent" CHECK ("sellerDashboardSettings"."accentColor" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "sellerDashboardSettings_theme" CHECK ("sellerDashboardSettings"."theme" IN ('light', 'dark'))
);
--> statement-breakpoint
CREATE TABLE "sellerProductReviews" (
	"productId" varchar(64) PRIMARY KEY NOT NULL,
	"status" "listing_review_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp with time zone,
	"submittedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sellerDashboardSettings" ADD CONSTRAINT "sellerDashboardSettings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellerProductReviews" ADD CONSTRAINT "sellerProductReviews_productId_sellerProducts_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."sellerProducts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellerProductReviews" ADD CONSTRAINT "sellerProductReviews_reviewedByUserId_users_id_fk" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sellerProductReviews_status_submittedAt_idx" ON "sellerProductReviews" USING btree ("status","submittedAt");--> statement-breakpoint
INSERT INTO "sellerProductReviews" ("productId", "status", "submittedAt") SELECT "id", 'pending', now() FROM "sellerProducts" WHERE "status" = 'published';
