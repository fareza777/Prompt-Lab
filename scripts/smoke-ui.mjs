import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:4173/";
const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
const errors = [];
for (const target of [desktop, page]) {
  target.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  target.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
}

await desktop.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await desktop.waitForTimeout(2500);
const desktopRoot = await desktop.locator("#root");
const desktopText = await desktopRoot.innerText().catch(() => "");
if (await desktop.getByRole("button", { name: /Continue as Guest/i }).count()) {
  await desktop.getByRole("button", { name: /Continue as Guest/i }).click();
  await desktop.waitForLoadState("networkidle");
}
const desktopShellVisible = await desktop.locator(".v2-shell").isVisible().catch(() => false);
const localOnlyVisible = await desktop.getByText("Local only").first().isVisible().catch(() => false);

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
if (await page.getByRole("button", { name: /Continue as Guest/i }).count()) {
  await page.getByRole("button", { name: /Continue as Guest/i }).click();
  await page.waitForLoadState("networkidle");
}
await page.getByRole("button", { name: "Builder" }).click().catch(() => {});
await page.waitForTimeout(500);
const generateButton = page.getByRole("button", { name: /Generate Prompt/i });
await generateButton.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(300);

const splash = await page.locator("#app-splash").count();
const root = await page.locator("#root");
const childCount = await root.evaluate((el) => el.childElementCount);
const text = await root.innerText().catch(() => "");
const visible = await page.locator(".v2-onboarding, .v2-shell, .v2-auth-gate").first().isVisible().catch(() => false);
const navBox = await page.locator(".bottom-nav").boundingBox();
const ctaBox = await generateButton.boundingBox();
const ctaTopElement = ctaBox
  ? await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return element?.closest("button")?.textContent?.trim() || element?.className || "";
    }, { x: ctaBox.x + ctaBox.width / 2, y: ctaBox.y + ctaBox.height / 2 })
  : "";
const navDoesNotCoverCta = Boolean(navBox && ctaBox && /Generate Prompt/.test(String(ctaTopElement)));

console.log(
  JSON.stringify(
    {
      url,
      errors,
      desktopShellVisible,
      localOnlyVisible,
      desktopTextSample: desktopText.slice(0, 180),
      splashRemaining: splash,
      rootChildren: childCount,
      hasVisibleShell: visible,
      navDoesNotCoverCta,
      ctaTopElement,
      textSample: text.slice(0, 280),
    },
    null,
    2
  )
);

await browser.close();
process.exit(childCount > 0 && visible && desktopShellVisible && localOnlyVisible && navDoesNotCoverCta ? 0 : 1);
