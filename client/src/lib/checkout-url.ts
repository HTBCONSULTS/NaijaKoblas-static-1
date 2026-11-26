/** Hosted checkout pages the server may redirect customers to. */
const HOSTED_CHECKOUT_HOSTS = new Set(["checkout.stripe.com", "checkout.paystack.com"]);

export function safeHostedCheckoutUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && HOSTED_CHECKOUT_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}
