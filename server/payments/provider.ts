import { ENV } from "../_core/env";
import { initializePaystackCheckout, verifyPaystackTransaction } from "./paystack";
import { classifyPaystackTransaction } from "./reconciliation";
import { classifyStripeSession, createStripeCheckoutSession, retrieveStripeCheckoutSession, stripeTransactionId } from "./stripe";

export type PaymentProvider = "stripe" | "paystack";
export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = { stripe: "Stripe", paystack: "Paystack" };

/** Provider for new checkouts: PAYMENT_PROVIDER when set, otherwise Stripe once its key exists. */
export function activeCheckoutProvider(): PaymentProvider {
  const configured = ENV.paymentProvider;
  if (configured === "stripe" || configured === "paystack") return configured;
  return ENV.stripeSecretKey ? "stripe" : "paystack";
}

export function isProviderConfigured(provider: PaymentProvider) {
  if (!ENV.appBaseUrl) return false;
  return provider === "stripe" ? Boolean(ENV.stripeSecretKey) : Boolean(ENV.paystackSecretKey);
}

export async function startHostedCheckout(provider: PaymentProvider, input: {
  reference: string;
  orderReference: string;
  email: string;
  amountKobo: number;
  deliveryMethod: "standard" | "express";
}): Promise<{ authorizationUrl: string; stripeSessionId?: string }> {
  if (provider === "stripe") {
    const session = await createStripeCheckoutSession(input);
    return { authorizationUrl: session.authorizationUrl, stripeSessionId: session.sessionId };
  }
  const initialized = await initializePaystackCheckout({ ...input, channels: ["card", "bank_transfer", "ussd"] });
  return { authorizationUrl: initialized.authorizationUrl };
}

export type ProviderPaymentCheck =
  | { outcome: "success"; amountKobo: number; currency: string; providerTransactionId: string }
  | { outcome: "failed" | "pending" | "mismatch" };

/**
 * Asks the payment's own provider for its current state. Throws when the provider
 * cannot be reached so callers can leave payment and inventory state untouched.
 */
export async function checkProviderPayment(payment: {
  reference: string;
  provider: PaymentProvider;
  stripeSessionId: string | null;
}): Promise<ProviderPaymentCheck> {
  if (payment.provider === "stripe") {
    // Without a stored session the hosted page was never confirmed; a retry of the
    // same checkout recreates it idempotently, so nothing can be concluded yet.
    if (!payment.stripeSessionId) return { outcome: "pending" };
    const session = await retrieveStripeCheckoutSession(payment.stripeSessionId);
    const outcome = classifyStripeSession(session, payment.reference);
    if (outcome !== "success") return { outcome };
    return {
      outcome,
      amountKobo: session.amount_total as number,
      currency: (session.currency ?? "").toUpperCase(),
      providerTransactionId: stripeTransactionId(session),
    };
  }
  const transaction = await verifyPaystackTransaction(payment.reference);
  const outcome = classifyPaystackTransaction(transaction, payment.reference);
  if (outcome !== "success") return { outcome };
  return { outcome, amountKobo: transaction.amount, currency: transaction.currency, providerTransactionId: String(transaction.id) };
}
