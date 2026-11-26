import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "../_core/env";
import { appOrigin, cancelActionUrl } from "./paystack";

/** The subset of a Stripe Checkout Session this app relies on. Amounts are in kobo (NGN minor units). */
export type StripeCheckoutSession = {
  id: string;
  object?: string;
  url?: string | null;
  client_reference_id?: string | null;
  status?: string | null; // open | complete | expired
  payment_status?: string | null; // paid | unpaid | no_payment_required
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
};

export type StripeEvent = {
  id?: unknown;
  type?: unknown;
  data?: { object?: unknown };
};

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

function requiredSecret() {
  if (!ENV.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return ENV.stripeSecretKey;
}

function safeReference(reference: string) {
  if (!/^[A-Za-z0-9.=\-]{1,64}$/.test(reference)) throw new Error("Invalid payment reference.");
}

export function isStripeSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === "string" && /^cs_(test|live)_[A-Za-z0-9]{10,240}$/.test(sessionId);
}

function hostedCheckoutUrl(value: string | null | undefined) {
  if (!value) throw new Error("Stripe did not return a checkout URL.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Stripe returned an invalid checkout URL.");
  }
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Stripe returned an untrusted checkout URL.");
  return url.toString();
}

async function stripeRequest<T>(path: string, init: { method: "GET" | "POST"; form?: URLSearchParams; idempotencyKey?: string }) {
  const headers: Record<string, string> = { Authorization: `Bearer ${requiredSecret()}`, Accept: "application/json" };
  if (init.form) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  const response = await fetch(`${STRIPE_API}${path}`, { method: init.method, headers, body: init.form?.toString(), signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Stripe request failed (${response.status}).`);
  return await response.json() as T;
}

export async function createStripeCheckoutSession(input: {
  reference: string;
  orderReference: string;
  email: string;
  amountKobo: number;
  deliveryMethod: "standard" | "express";
}) {
  safeReference(input.reference);
  if (!input.email.trim() || !Number.isSafeInteger(input.amountKobo) || input.amountKobo < 1) {
    throw new Error("Stripe checkout requires a valid email and positive integer amount in kobo.");
  }
  const success = new URL("/order-confirmation", appOrigin());
  success.searchParams.set("reference", input.reference);
  const form = new URLSearchParams({
    mode: "payment",
    client_reference_id: input.reference,
    customer_email: input.email,
    success_url: success.toString(),
    cancel_url: cancelActionUrl(input.deliveryMethod),
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "ngn",
    "line_items[0][price_data][unit_amount]": String(input.amountKobo),
    "line_items[0][price_data][product_data][name]": `NaijaKoblas order ${input.orderReference}`,
    "metadata[order_reference]": input.orderReference,
    "metadata[payment_reference]": input.reference,
    "payment_intent_data[metadata][order_reference]": input.orderReference,
    "payment_intent_data[metadata][payment_reference]": input.reference,
  });
  // Same reference => same session on retry (within Stripe's 24h idempotency window),
  // so a timeout followed by a retry can never create two charges.
  const session = await stripeRequest<StripeCheckoutSession>("/checkout/sessions", { method: "POST", form, idempotencyKey: `checkout-${input.reference}` });
  if (session.client_reference_id !== input.reference) throw new Error("Stripe did not confirm the checkout request.");
  if (!isStripeSessionId(session.id)) throw new Error("Stripe returned an invalid Checkout Session id.");
  return { sessionId: session.id, authorizationUrl: hostedCheckoutUrl(session.url) };
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (!isStripeSessionId(sessionId)) throw new Error("Invalid Stripe Checkout Session id.");
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`, { method: "GET" });
}

export type StripeReconciliationOutcome = "success" | "failed" | "pending" | "mismatch";

export function classifyStripeSession(
  session: Pick<StripeCheckoutSession, "client_reference_id" | "status" | "payment_status" | "amount_total" | "currency">,
  expectedReference: string,
): StripeReconciliationOutcome {
  if (
    session.client_reference_id !== expectedReference
    || !Number.isSafeInteger(session.amount_total)
    || (session.amount_total as number) < 1
    || (session.currency ?? "").toUpperCase() !== "NGN"
  ) return "mismatch";
  if (session.payment_status === "paid") return "success";
  if (session.status === "expired") return "failed";
  return "pending";
}

/** Stable id recorded on success: the PaymentIntent when present (fits the 64-char column). */
export function stripeTransactionId(session: Pick<StripeCheckoutSession, "id" | "payment_intent">) {
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  return (intent || session.id).slice(0, 64);
}

/** Verifies a `Stripe-Signature` header (t=…,v1=…) against the raw request body. */
export function verifyStripeSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret = ENV.stripeWebhookSecret,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!secret || !header) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value ?? "";
    if (key === "v1" && value && /^[a-f0-9]{64}$/i.test(value)) signatures.push(value);
  }
  if (!/^\d{1,12}$/.test(timestamp) || !signatures.length) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest();
  return signatures.some(signature => {
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && timingSafeEqual(expected, supplied);
  });
}
