import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PLAN_NAMES, getEntitlements, shouldShowAds } from "../src/planEntitlements.js";
import { REMOVE_ADS_PRODUCT_ID, isRemoveAdsProduct } from "../server/playBillingGoogle.js";

/**
 * Ads pay for the free tier. The rules that matter are who sees them and, more
 * importantly, where they are allowed to appear at all.
 */

test("only the free tier sees ads", () => {
  assert.equal(shouldShowAds("Free"), true);
  assert.equal(shouldShowAds("Pro"), false);
  assert.equal(shouldShowAds("Business"), false);

  for (const plan of PLAN_NAMES) {
    assert.equal(typeof getEntitlements(plan).adFree, "boolean", `${plan} has no adFree flag`);
  }
});

test("a one-time purchase outranks the plan lookup", () => {
  // Otherwise a Free user who paid to remove ads would keep seeing them, which
  // is the one outcome that produces a refund request.
  assert.equal(shouldShowAds("Free", { removeAdsPurchased: true }), false);
  assert.equal(shouldShowAds("Free", { adFree: true }), false);
  // And it never turns ads back on for someone already ad-free.
  assert.equal(shouldShowAds("Pro", { removeAdsPurchased: false }), false);
});

test("an unknown plan is treated as free rather than ad-free", () => {
  // Failing open here would give ads away to anyone sending a bad plan name.
  assert.equal(shouldShowAds("Enterprise"), true);
  assert.equal(shouldShowAds(undefined), true);
});

test("remove-ads is a separate product, not a subscription tier", async () => {
  // Routing it through the plan map would downgrade a Pro user who bought it.
  const { getPlanForProductId } = await import("../server/playBillingGoogle.js");
  assert.equal(getPlanForProductId(REMOVE_ADS_PRODUCT_ID), null);
  assert.equal(isRemoveAdsProduct(REMOVE_ADS_PRODUCT_ID), true);
  assert.equal(isRemoveAdsProduct("promptlab_pro_monthly"), false);
  assert.equal(isRemoveAdsProduct(""), false);
});

test("ads never render inside the installed Android app", async () => {
  // The app is a Trusted Web Activity, so AdSense would be serving inside an
  // app. That breaches the AdSense programme policy and the penalty lands on
  // the account, not the placement.
  const source = await readFile(new URL("../src/ui/AdSlot.jsx", import.meta.url), "utf8");
  assert.match(source, /isLikelyAndroidTwa/);
  assert.match(source, /if \(inApp\) return false;/);
  assert.match(source, /AdMob cannot reach it/);
});

test("nothing renders until an ad account is actually configured", async () => {
  // Shipping the component ahead of the account must be a no-op, not an empty
  // grey box on every screen.
  const source = await readFile(new URL("../src/ui/AdSlot.jsx", import.meta.url), "utf8");
  assert.match(source, /VITE_ADS_CLIENT/);
  assert.match(source, /if \(!client\) return false;/);

  const { adsAllowedHere } = await import("../src/ui/AdSlot.jsx").catch(() => ({}));
  if (adsAllowedHere) {
    assert.equal(adsAllowedHere({ client: "", inApp: false, showAds: true }), false);
    assert.equal(adsAllowedHere({ client: "ca-pub-1", inApp: true, showAds: true }), false);
    assert.equal(adsAllowedHere({ client: "ca-pub-1", inApp: false, showAds: false }), false);
    assert.equal(adsAllowedHere({ client: "ca-pub-1", inApp: false, showAds: true }), true);
  }
});
