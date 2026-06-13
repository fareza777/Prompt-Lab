import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import {
  getPlanForProductLabel,
  getPlanForVariantId,
  normalizeLemonVariantRef,
  parseLemonSqueezyWebhook,
  resolvePlanFromSubscription,
  resolveSubscriptionAction,
  resolveWebhookIdentity,
  verifyLemonSqueezySignature,
} from "../server/lemonSqueezyBilling.js";

const ORIGINAL_ENV = { ...process.env };

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("getPlanForVariantId maps env variant ids", () => {
  process.env.LEMON_SQUEEZY_VARIANT_ID_PRO = "111";
  process.env.LEMON_SQUEEZY_VARIANT_ID_BUSINESS = "222";
  assert.equal(getPlanForVariantId("111")?.plan, "Pro");
  assert.equal(getPlanForVariantId("222")?.plan, "Business");
  assert.equal(getPlanForVariantId("999"), null);
});

test("normalizeLemonVariantRef extracts uuid from checkout url", () => {
  const url = "https://prom.lemonsqueezy.com/checkout/buy/ab217d1d-0715-4223-b741-ab06a2fd1068";
  assert.equal(normalizeLemonVariantRef(url), "ab217d1d-0715-4223-b741-ab06a2fd1068");
});

test("getPlanForProductLabel maps PromptLab product names", () => {
  assert.equal(getPlanForProductLabel("PromptLab Business — Monthly")?.plan, "Business");
  assert.equal(getPlanForProductLabel("PromptLab Pro — Monthly")?.plan, "Pro");
});

test("resolvePlanFromSubscription falls back to product name", () => {
  process.env.LEMON_SQUEEZY_VARIANT_ID_PRO = "https://prom.lemonsqueezy.com/checkout/buy/ab217d1d-0715-4223-b741-ab06a2fd1068";
  const plan = resolvePlanFromSubscription({
    variant_id: 999999,
    product_name: "PromptLab Pro — Monthly",
  });
  assert.equal(plan?.plan, "Pro");
});

test("verifyLemonSqueezySignature accepts valid HMAC", () => {
  const secret = "test-secret-123";
  const body = Buffer.from(JSON.stringify({ meta: { event_name: "subscription_created" } }));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const result = verifyLemonSqueezySignature(body, sig, secret);
  assert.equal(result.ok, true);
});

test("verifyLemonSqueezySignature rejects tampered body", () => {
  const secret = "test-secret-123";
  const body = Buffer.from('{"meta":{"event_name":"subscription_created"}}');
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const tampered = Buffer.from('{"meta":{"event_name":"subscription_expired"}}');
  const result = verifyLemonSqueezySignature(tampered, sig, secret);
  assert.equal(result.ok, false);
});

test("resolveWebhookIdentity reads custom user_id and email", () => {
  const identity = resolveWebhookIdentity({
    meta: { custom_data: { user_id: "uuid-1" } },
    data: { attributes: { user_email: "user@example.com" } },
  });
  assert.equal(identity.userId, "uuid-1");
  assert.equal(identity.email, "user@example.com");
});

test("resolveSubscriptionAction activates active subscription", () => {
  process.env.LEMON_SQUEEZY_VARIANT_ID_PRO = "42";
  const action = resolveSubscriptionAction(
    {
      data: {
        attributes: { status: "active", variant_id: 42 },
      },
    },
    "subscription_created"
  );
  assert.equal(action.action, "activate");
  assert.equal(action.planConfig?.plan, "Pro");
});

test("resolveSubscriptionAction deactivates on expired", () => {
  const action = resolveSubscriptionAction(
    { data: { attributes: { status: "expired", variant_id: 1 } } },
    "subscription_expired"
  );
  assert.equal(action.action, "deactivate");
});

test("parseLemonSqueezyWebhook requires event name", () => {
  const bad = parseLemonSqueezyWebhook(Buffer.from("{}"));
  assert.equal(bad.ok, false);
  const good = parseLemonSqueezyWebhook(
    Buffer.from(JSON.stringify({ meta: { event_name: "subscription_created" } }))
  );
  assert.equal(good.ok, true);
  assert.equal(good.eventName, "subscription_created");
});
