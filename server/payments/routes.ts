import type { Express, Request } from "express";
import * as db from "../db";
import { verifyPaystackSignature } from "./paystack";
import { classifyStripeSession, isStripeSessionId, stripeTransactionId, verifyStripeSignature, type StripeCheckoutSession, type StripeEvent } from "./stripe";

const STRIPE_SESSION_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

type PaystackWebhook = {
  event?: unknown;
  data?: {
    reference?: unknown;
    amount?: unknown;
    currency?: unknown;
    status?: unknown;
    id?: unknown;
    metadata?: unknown;
  };
};

function readMetadata(value: unknown) {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  return candidate as Record<string, unknown>;
}

export function registerPaymentRoutes(app: Express) {
  app.post("/api/payments/stripe/webhook", async (req: Request, res) => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !verifyStripeSignature(rawBody, req.get("stripe-signature"))) {
      res.status(401).json({ error: "Invalid payment webhook signature." });
      return;
    }

    const event = req.body as StripeEvent;
    if (typeof event.type !== "string" || !STRIPE_SESSION_EVENTS.has(event.type)) {
      res.status(200).json({ received: true });
      return;
    }
    const session = event.data?.object as Partial<StripeCheckoutSession> | undefined;
    if (!session || typeof session !== "object" || !isStripeSessionId(session.id) || typeof session.client_reference_id !== "string") {
      res.status(400).json({ error: "Invalid payment event." });
      return;
    }

    try {
      const record = await db.getPaymentByReference(session.client_reference_id);
      if (!record || !record.stripe) {
        // Unknown or non-Stripe references are acknowledged so an authentic event cannot be retried forever.
        if (record) console.warn("[Stripe] Ignored an event for a payment that is not collected by Stripe:", session.client_reference_id);
        res.status(200).json({ received: true });
        return;
      }
      if (record.stripe.sessionId && record.stripe.sessionId !== session.id) {
        console.warn("[Stripe] Ignored an event for a different Checkout Session than the stored one:", session.client_reference_id);
        res.status(200).json({ received: true });
        return;
      }

      const outcome = event.type === "checkout.session.async_payment_failed"
        ? "failed"
        : classifyStripeSession(session as StripeCheckoutSession, record.payment.reference);
      if (outcome === "success") {
        const result = await db.markPaymentSucceeded({
          reference: record.payment.reference,
          amountKobo: session.amount_total as number,
          currency: (session.currency ?? "").toUpperCase(),
          providerTransactionId: stripeTransactionId(session as StripeCheckoutSession),
        });
        if (!result.success && result.reason !== "not_found") {
          console.warn("[Stripe] Ignored an authentic event not matching a pending order:", result.reason, record.payment.reference);
        }
      } else if (outcome === "failed") {
        await db.markPaymentFailed(record.payment.reference);
      } else if (outcome === "mismatch") {
        console.warn("[Stripe] Ignored an authentic event whose reference, amount or currency does not match:", record.payment.reference);
      }
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Stripe] Webhook processing failed:", error instanceof Error ? error.message : "unknown error");
      res.status(500).json({ error: "Payment event could not be processed." });
    }
  });

  app.post("/api/payments/paystack/webhook", async (req: Request, res) => {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !verifyPaystackSignature(rawBody, req.get("x-paystack-signature"))) {
      res.status(401).json({ error: "Invalid payment webhook signature." });
      return;
    }

    const event = req.body as PaystackWebhook;
    if (event.event !== "charge.success") {
      res.status(200).json({ received: true });
      return;
    }
    const data = event.data;
    if (
      !data
      || typeof data.reference !== "string"
      || !Number.isSafeInteger(data.amount)
      || typeof data.currency !== "string"
      || data.status !== "success"
      || (typeof data.id !== "string" && typeof data.id !== "number")
    ) {
      res.status(400).json({ error: "Invalid payment event." });
      return;
    }

    try {
      const record = await db.getPaymentByReference(data.reference);
      if (!record) {
        // Unknown references are acknowledged so an authentic event cannot be retried forever.
        res.status(200).json({ received: true });
        return;
      }
      const metadata = readMetadata(data.metadata);
      if (metadata && (
        (metadata.order_reference !== undefined && metadata.order_reference !== record.order.reference)
        || (metadata.payment_reference !== undefined && metadata.payment_reference !== record.payment.reference)
      )) {
        // The signed, unique transaction reference plus stored amount/currency are authoritative.
        // Metadata is useful for diagnostics but provider serialization/omission must not drop a real payment.
        console.warn("[Paystack] Payment metadata differed from the stored order; validating by reference and amount:", data.reference);
      }

      const result = await db.markPaymentSucceeded({
        reference: data.reference,
        amountKobo: data.amount as number,
        currency: data.currency,
        providerTransactionId: String(data.id),
      });
      if (!result.success && result.reason !== "not_found") {
        // An authentic event with a mismatched amount or non-pending record
        // is logged for reconciliation and is never applied as a payment.
        console.warn("[Paystack] Ignored an authentic event not matching a pending order:", result.reason, data.reference);
      }
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Paystack] Webhook processing failed:", error instanceof Error ? error.message : "unknown error");
      res.status(500).json({ error: "Payment event could not be processed." });
    }
  });
}
