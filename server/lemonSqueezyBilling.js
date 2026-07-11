import crypto from "node:crypto";
import { getEntitlements } from "../src/planEntitlements.js";

const ACTIVE_STATUSES = new Set(["active", "on_trial", "past_due", "paused"]);

/** Extract variant UUID from a checkout URL or return the raw id string. */
export function normalizeLemonVariantRef(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const fromCheckout = raw.match(/checkout\/buy\/([a-f0-9-]{36})/i);
  if (fromCheckout) return fromCheckout[1].toLowerCase();
  return raw.toLowerCase();
}

function variantMatchesEnv(variantId, envKey) {
  const id = String(variantId || "").trim().toLowerCase();
  if (!id) return false;
  const envRaw = String(process.env[envKey] || "").trim();
  if (!envRaw) return false;
  const normalized = normalizeLemonVariantRef(envRaw);
  return id === normalized || id === envRaw.toLowerCase();
}

/**
 * Map Lemon Squeezy variant ID (numeric or checkout UUID) → PromptLab plan.
 * Env may be a numeric variant id or full checkout URL from Share link.
 */
export function getPlanForVariantId(variantId) {
  if (variantMatchesEnv(variantId, "LEMON_SQUEEZY_VARIANT_ID_PRO")) {
    return { plan: "Pro", quotaLimit: getEntitlements("Pro").quotaLimit };
  }
  if (variantMatchesEnv(variantId, "LEMON_SQUEEZY_VARIANT_ID_BUSINESS")) {
    return { plan: "Business", quotaLimit: getEntitlements("Business").quotaLimit };
  }
  return null;
}

/** Fallback when webhook sends numeric variant_id but env holds checkout UUID. */
export function getPlanForProductLabel(productName, variantName = "") {
  const label = `${productName} ${variantName}`.toLowerCase();
  if (/\bbusiness\b/.test(label)) {
    return { plan: "Business", quotaLimit: getEntitlements("Business").quotaLimit };
  }
  if (/\bpro\b/.test(label)) {
    return { plan: "Pro", quotaLimit: getEntitlements("Pro").quotaLimit };
  }
  return null;
}

export function resolvePlanFromSubscription(attributes = {}) {
  const variantId =
    attributes.variant_id ||
    attributes.first_subscription_item?.variant_id ||
    attributes.first_order_item?.variant_id;

  return (
    getPlanForVariantId(variantId) ||
    getPlanForProductLabel(attributes.product_name, attributes.variant_name)
  );
}

export function verifyLemonSqueezySignature(rawBody, signatureHeader, secret) {
  if (!secret?.trim()) {
    return { ok: false, error: "LEMON_SQUEEZY_WEBHOOK_SECRET is not configured." };
  }
  if (!signatureHeader?.trim() || !rawBody?.length) {
    return { ok: false, error: "Missing webhook body or X-Signature header." };
  }

  let signature;
  let digest;
  try {
    signature = Buffer.from(signatureHeader.trim(), "hex");
    digest = Buffer.from(
      crypto.createHmac("sha256", secret.trim()).update(rawBody).digest("hex"),
      "hex"
    );
  } catch {
    return { ok: false, error: "Invalid webhook signature format." };
  }

  if (signature.length !== digest.length || !crypto.timingSafeEqual(signature, digest)) {
    return { ok: false, error: "Webhook signature mismatch." };
  }

  return { ok: true };
}

export function parseLemonSqueezyWebhook(rawBody) {
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { ok: false, error: "Webhook body is not valid JSON." };
  }

  const eventName = String(payload?.meta?.event_name || "").trim();
  if (!eventName) {
    return { ok: false, error: "Missing meta.event_name." };
  }

  return { ok: true, payload, eventName };
}

export function resolveWebhookIdentity(payload) {
  const custom = payload?.meta?.custom_data || {};
  const userId = custom.user_id || custom.userId || "";
  const email = String(
    custom.email ||
      payload?.data?.attributes?.user_email ||
      payload?.data?.attributes?.customer_email ||
      ""
  ).trim().toLowerCase();

  return {
    userId: userId ? String(userId).trim() : "",
    email,
  };
}

/**
 * Decide plan change from a subscription webhook payload.
 * @returns {{ action: "activate"|"deactivate"|"ignore", planConfig?: { plan: string, quotaLimit: number }, reason?: string }}
 */
export function resolveSubscriptionAction(payload, eventName) {
  const attributes = payload?.data?.attributes || {};
  const planConfig = resolvePlanFromSubscription(attributes);
  const status = String(attributes.status || "").toLowerCase();
  const endsAt = attributes.ends_at ? new Date(attributes.ends_at) : null;
  const now = new Date();

  if (eventName === "subscription_expired") {
    return { action: "deactivate", reason: "subscription_expired" };
  }

  if (eventName === "subscription_payment_failed") {
    return { action: "ignore", reason: "payment_failed_awaiting_retry" };
  }

  if (eventName === "subscription_cancelled") {
    if (endsAt && endsAt > now) {
      return planConfig
        ? { action: "activate", planConfig, reason: "cancelled_still_in_period" }
        : { action: "ignore", reason: "cancelled_unknown_variant" };
    }
    return { action: "deactivate", reason: "subscription_cancelled" };
  }

  if (ACTIVE_STATUSES.has(status) && planConfig) {
    return { action: "activate", planConfig, reason: status };
  }

  if (["unpaid", "expired"].includes(status)) {
    return { action: "deactivate", reason: status };
  }

  return { action: "ignore", reason: eventName || status || "no_op" };
}

export async function applyLemonSqueezyMembership(admin, { userId, planConfig, eventName, payload }) {
  if (!admin || !userId) {
    return { ok: false, error: "Missing Supabase admin client or user id." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      plan: planConfig.plan,
      quota_limit: planConfig.quotaLimit,
      play_billing: "Lemon Squeezy",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, error: "Failed to update membership profile." };
  }

  const subscriptionId = payload?.data?.id || "";
  const variantId =
    payload?.data?.attributes?.variant_id ||
    payload?.data?.attributes?.first_subscription_item?.variant_id ||
    "";

  const { error: eventError } = await admin.from("membership_events").insert({
    user_id: userId,
    event_type: eventName,
    plan: planConfig.plan,
    provider: "lemon_squeezy",
    metadata: {
      subscriptionId: String(subscriptionId),
      variantId: String(variantId),
      status: payload?.data?.attributes?.status || "",
      orderId: payload?.data?.attributes?.order_id || "",
    },
  });
  if (eventError) {
    return { ok: false, error: "Failed to record membership event." };
  }

  return { ok: true, plan: planConfig.plan };
}

export async function downgradeToFree(admin, userId, eventName, payload) {
  if (!admin || !userId) {
    return { ok: false, error: "Missing Supabase admin client or user id." };
  }

  const freeQuota = getEntitlements("Free").quotaLimit;
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      plan: "Free",
      quota_limit: freeQuota,
      play_billing: "Not linked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, error: "Failed to update membership profile." };
  }

  const { error: eventError } = await admin.from("membership_events").insert({
    user_id: userId,
    event_type: eventName,
    plan: "Free",
    provider: "lemon_squeezy",
    metadata: {
      subscriptionId: String(payload?.data?.id || ""),
      status: payload?.data?.attributes?.status || "",
      reason: "downgrade",
    },
  });
  if (eventError) {
    return { ok: false, error: "Failed to record membership event." };
  }

  return { ok: true, plan: "Free" };
}

export async function resolveUserIdByEmail(admin, email) {
  if (!admin || !email) return "";
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (error || !data?.id) return "";
  return data.id;
}

/**
 * Handle a verified Lemon Squeezy webhook payload.
 */
export async function handleLemonSqueezyWebhook(admin, payload, eventName) {
  const subscriptionEvents = new Set([
    "subscription_created",
    "subscription_updated",
    "subscription_cancelled",
    "subscription_expired",
    "subscription_payment_failed",
  ]);

  if (!subscriptionEvents.has(eventName)) {
    return { ok: true, ignored: true, reason: `Unhandled event: ${eventName}` };
  }

  const identity = resolveWebhookIdentity(payload);
  let userId = identity.userId;
  if (!userId && identity.email) {
    userId = await resolveUserIdByEmail(admin, identity.email);
  }
  if (!userId) {
    return { ok: false, error: "Could not match webhook to a PromptLab user (set checkout custom user_id)." };
  }

  const action = resolveSubscriptionAction(payload, eventName);

  if (action.action === "ignore") {
    return { ok: true, ignored: true, reason: action.reason, userId };
  }

  if (action.action === "deactivate") {
    const result = await downgradeToFree(admin, userId, eventName, payload);
    return { ...result, userId, reason: action.reason };
  }

  if (!action.planConfig) {
    return {
      ok: false,
      error: `Unknown variant. Set LEMON_SQUEEZY_VARIANT_ID_PRO / LEMON_SQUEEZY_VARIANT_ID_BUSINESS (got variant ${payload?.data?.attributes?.variant_id || "?"})`,
      userId,
    };
  }

  const result = await applyLemonSqueezyMembership(admin, {
    userId,
    planConfig: action.planConfig,
    eventName,
    payload,
  });
  return { ...result, userId, reason: action.reason };
}
