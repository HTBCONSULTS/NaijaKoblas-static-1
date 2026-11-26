import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import express from "express";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as db from "../db";
import { extractPendingMigrationObjects } from "../migrations/pendingObjects";
import { activeCheckoutProvider, checkProviderPayment, isProviderConfigured } from "./provider";
import { registerPaymentRoutes } from "./routes";
import { classifyStripeSession, createStripeCheckoutSession, stripeTransactionId, verifyStripeSignature } from "./stripe";

vi.mock("../db", () => ({
  getPaymentByReference: vi.fn(),
  markPaymentSucceeded: vi.fn(),
  markPaymentFailed: vi.fn(),
}));

const webhookSecret = "whsec_stripe_route_test_secret";
const sessionId = "cs_test_a1B2c3D4e5F6g7H8";
let server: Server | undefined;

function stripeSignature(body: string, secret = webhookSecret, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

async function postStripe(body: string, signature: string) {
  const app = express();
  app.use(express.json({
    verify(req, _res, buffer) {
      if (req.url?.startsWith("/api/payments/stripe/webhook")) {
        (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      }
    },
  }));
  registerPaymentRoutes(app);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server!.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}/api/payments/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body,
  });
}

function sessionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_test_1",
    type,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        client_reference_id: "NKPAYMENT123",
        status: "complete",
        payment_status: "paid",
        amount_total: 520_000,
        currency: "ngn",
        payment_intent: "pi_test_123",
        ...overrides,
      },
    },
  };
}

const storedStripePayment = {
  payment: { reference: "NKPAYMENT123", status: "pending" },
  order: { reference: "NKORDER123", status: "pending_payment", totalKobo: 520_000 },
  stripe: { sessionId },
};

afterEach(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  server = undefined;
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Stripe signature verification", () => {
  const body = Buffer.from('{"id":"evt_1"}');

  it("accepts a valid v1 signature within the tolerance window", () => {
    expect(verifyStripeSignature(body, stripeSignature(body.toString()), webhookSecret)).toBe(true);
  });

  it("rejects tampered bodies, wrong secrets, stale timestamps and missing headers", () => {
    const header = stripeSignature(body.toString());
    expect(verifyStripeSignature(Buffer.from('{"id":"evt_2"}'), header, webhookSecret)).toBe(false);
    expect(verifyStripeSignature(body, stripeSignature(body.toString(), "whsec_other"), webhookSecret)).toBe(false);
    const old = Math.floor(Date.now() / 1000) - 3_600;
    expect(verifyStripeSignature(body, stripeSignature(body.toString(), webhookSecret, old), webhookSecret)).toBe(false);
    expect(verifyStripeSignature(body, undefined, webhookSecret)).toBe(false);
    expect(verifyStripeSignature(body, header, "")).toBe(false);
  });
});

describe("Stripe session classification", () => {
  const base = { client_reference_id: "NKPAY1", status: "complete", payment_status: "paid", amount_total: 1_000, currency: "ngn" };

  it("maps paid, expired and open sessions", () => {
    expect(classifyStripeSession(base, "NKPAY1")).toBe("success");
    expect(classifyStripeSession({ ...base, status: "expired", payment_status: "unpaid" }, "NKPAY1")).toBe("failed");
    expect(classifyStripeSession({ ...base, status: "open", payment_status: "unpaid" }, "NKPAY1")).toBe("pending");
  });

  it("treats a different reference, currency or invalid amount as a mismatch", () => {
    expect(classifyStripeSession(base, "NKPAY2")).toBe("mismatch");
    expect(classifyStripeSession({ ...base, currency: "usd" }, "NKPAY1")).toBe("mismatch");
    expect(classifyStripeSession({ ...base, amount_total: 0 }, "NKPAY1")).toBe("mismatch");
  });

  it("records the PaymentIntent id, falling back to the session id", () => {
    expect(stripeTransactionId({ id: sessionId, payment_intent: "pi_1" })).toBe("pi_1");
    expect(stripeTransactionId({ id: sessionId, payment_intent: { id: "pi_2" } })).toBe("pi_2");
    expect(stripeTransactionId({ id: sessionId, payment_intent: null })).toBe(sessionId);
  });
});

describe("Stripe Checkout Session creation", () => {
  it("sends an idempotent NGN session request and returns only a trusted checkout URL", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("APP_BASE_URL", "https://naijakoblas.example");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: sessionId,
      url: "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8",
      client_reference_id: "NKPAYMENT123",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createStripeCheckoutSession({
      reference: "NKPAYMENT123", orderReference: "NKPAYMENT123", email: "buyer@example.com", amountKobo: 520_000, deliveryMethod: "express",
    });
    expect(result).toEqual({ sessionId, authorizationUrl: "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(init.headers["Idempotency-Key"]).toBe("checkout-NKPAYMENT123");
    expect(init.headers.Authorization).toBe("Bearer sk_test_123");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("line_items[0][price_data][currency]")).toBe("ngn");
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("520000");
    expect(form.get("success_url")).toBe("https://naijakoblas.example/order-confirmation?reference=NKPAYMENT123");
    expect(form.get("cancel_url")).toBe("https://naijakoblas.example/checkout?delivery=express&cancelled=true");
  });

  it("rejects an untrusted checkout host", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("APP_BASE_URL", "https://naijakoblas.example");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: sessionId, url: "https://evil.example/pay", client_reference_id: "NKPAYMENT123",
    }), { status: 200 })));
    await expect(createStripeCheckoutSession({
      reference: "NKPAYMENT123", orderReference: "NKORDER123", email: "buyer@example.com", amountKobo: 100, deliveryMethod: "standard",
    })).rejects.toThrow(/untrusted/);
  });
});

describe("payment provider selection", () => {
  it("uses PAYMENT_PROVIDER when set, otherwise Stripe once its key exists", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(activeCheckoutProvider()).toBe("paystack");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(activeCheckoutProvider()).toBe("stripe");
    vi.stubEnv("PAYMENT_PROVIDER", "Paystack");
    expect(activeCheckoutProvider()).toBe("paystack");
  });

  it("requires the provider key and APP_BASE_URL", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("APP_BASE_URL", "");
    expect(isProviderConfigured("stripe")).toBe(false);
    vi.stubEnv("APP_BASE_URL", "https://naijakoblas.example");
    expect(isProviderConfigured("stripe")).toBe(true);
  });

  it("reports a Stripe payment without a stored session as pending without calling Stripe", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(checkProviderPayment({ reference: "NKPAY1", provider: "stripe", stripeSessionId: null })).resolves.toEqual({ outcome: "pending" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook route", () => {
  it("marks the matching pending payment successful from a signed completed session", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
    vi.mocked(db.getPaymentByReference).mockResolvedValue(storedStripePayment as never);
    vi.mocked(db.markPaymentSucceeded).mockResolvedValue({ success: true, alreadyProcessed: false });
    const body = JSON.stringify(sessionEvent("checkout.session.completed"));

    const response = await postStripe(body, stripeSignature(body));
    expect(response.status).toBe(200);
    expect(db.markPaymentSucceeded).toHaveBeenCalledWith({
      reference: "NKPAYMENT123",
      amountKobo: 520_000,
      currency: "NGN",
      providerTransactionId: "pi_test_123",
    });
  });

  it("waits on a completed but unpaid (delayed) session and releases stock when it expires", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
    vi.mocked(db.getPaymentByReference).mockResolvedValue(storedStripePayment as never);
    const unpaid = JSON.stringify(sessionEvent("checkout.session.completed", { payment_status: "unpaid" }));
    expect((await postStripe(unpaid, stripeSignature(unpaid))).status).toBe(200);
    expect(db.markPaymentSucceeded).not.toHaveBeenCalled();
    expect(db.markPaymentFailed).not.toHaveBeenCalled();
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;

    const expired = JSON.stringify(sessionEvent("checkout.session.expired", { status: "expired", payment_status: "unpaid" }));
    expect((await postStripe(expired, stripeSignature(expired))).status).toBe(200);
    expect(db.markPaymentFailed).toHaveBeenCalledWith("NKPAYMENT123");
  });

  it("rejects a bad signature without reading payment state", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
    const body = JSON.stringify(sessionEvent("checkout.session.completed"));
    const response = await postStripe(body, stripeSignature(body, "whsec_wrong"));
    expect(response.status).toBe(401);
    expect(db.getPaymentByReference).not.toHaveBeenCalled();
  });

  it("ignores events for a different session or a Paystack payment", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
    vi.mocked(db.getPaymentByReference).mockResolvedValue({ ...storedStripePayment, stripe: { sessionId: "cs_test_zzzzzzzzzzzzzz" } } as never);
    const body = JSON.stringify(sessionEvent("checkout.session.completed"));
    expect((await postStripe(body, stripeSignature(body))).status).toBe(200);
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;

    vi.mocked(db.getPaymentByReference).mockResolvedValue({ ...storedStripePayment, stripe: null } as never);
    expect((await postStripe(body, stripeSignature(body))).status).toBe(200);
    expect(db.markPaymentSucceeded).not.toHaveBeenCalled();
  });
});

describe("Stripe migration", () => {
  it("only creates new objects the migration runner can pre-check", () => {
    const migrations = readMigrationFiles({ migrationsFolder: path.resolve(__dirname, "../../drizzle/postgres") });
    const stripe = migrations.at(-1)!;
    const objects = extractPendingMigrationObjects([stripe]);
    expect(objects.tableNames).toEqual(["stripeCheckoutSessions"]);
    expect(objects.indexNames).toEqual(["stripeCheckoutSessions_sessionId_unique"]);
    expect(objects.constraints).toEqual([{ tableName: "stripeCheckoutSessions", name: "stripeCheckoutSessions_payment_fk" }]);
    expect(objects.enumNames).toEqual([]);
  });
});
