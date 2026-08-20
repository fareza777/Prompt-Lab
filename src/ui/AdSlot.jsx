import { useEffect, useRef } from "react";
import { isLikelyAndroidTwa } from "../playBilling.js";

/**
 * A single advertising placement.
 *
 * The important thing this component does is refuse to render in the installed
 * Android app.
 *
 * The app is a Trusted Web Activity: the whole screen is this web page, drawn
 * by Chrome. AdMob cannot reach it — that is a native SDK with no native
 * surface to draw on here. AdSense can technically render, but Google's AdSense
 * programme policy prohibits serving AdSense inside an app, and the penalty is
 * a ban on the AdSense account itself rather than on one placement. So ads run
 * on the website and stop at the app boundary, and paid users never see them
 * anywhere.
 *
 * Nothing renders at all until VITE_ADS_CLIENT is configured, so shipping this
 * ahead of an ad account is safe.
 */

const AD_CLIENT = import.meta.env.VITE_ADS_CLIENT || "";

/** Every reason a placement must stay empty, in one place so it can be tested. */
export function adsAllowedHere({ client = AD_CLIENT, inApp = false, showAds = true } = {}) {
  if (!client) return false;
  if (inApp) return false;
  return showAds;
}

export default function AdSlot({ slot, showAds, label }) {
  const ref = useRef(null);
  const filled = useRef(false);
  const allowed = adsAllowedHere({ inApp: isLikelyAndroidTwa(), showAds });

  useEffect(() => {
    if (!allowed || filled.current || !ref.current) return;
    try {
      // AdSense reads the <ins> element that is already in the DOM, so this can
      // only run after paint, and only once per element.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      filled.current = true;
    } catch {
      /* a blocked or missing ad script must never break the page */
    }
  }, [allowed]);

  if (!allowed) return null;

  return (
    <aside className="pl-ad" aria-label={label}>
      <ins
        ref={ref}
        className="adsbygoogle pl-ad-unit"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
