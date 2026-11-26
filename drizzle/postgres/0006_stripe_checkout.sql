CREATE TABLE "stripeCheckoutSessions" (
	"paymentTransactionId" integer PRIMARY KEY NOT NULL,
	"sessionId" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stripeCheckoutSessions" ADD CONSTRAINT "stripeCheckoutSessions_payment_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."paymentTransactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stripeCheckoutSessions_sessionId_unique" ON "stripeCheckoutSessions" USING btree ("sessionId") WHERE "stripeCheckoutSessions"."sessionId" IS NOT NULL;