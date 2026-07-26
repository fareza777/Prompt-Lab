import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:4173/app";
const browser = await chromium.launch({ channel: "chrome" });
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
if (await desktop.getByRole("button", { name: "English" }).count()) {
  await desktop.getByRole("button", { name: "English" }).click();
  await desktop.waitForTimeout(500);
}
if (await desktop.getByRole("button", { name: /Continue as Guest/i }).count()) {
  await desktop.getByRole("button", { name: /Continue as Guest/i }).click();
  await desktop.waitForLoadState("networkidle");
  await desktop.waitForTimeout(800);
}
const desktopShellVisible = await desktop.locator(".pl-shell").isVisible().catch(() => false);
const desktopShellText = await desktop.locator("body").innerText().catch(() => "");
const resultFirstCopyVisible = /finished work|create result/i.test(desktopShellText);
const oldBrandVisible = /PromptLab|Prompt Lab/.test(desktopShellText);

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
if (await page.getByRole("button", { name: "English" }).count()) {
  await page.getByRole("button", { name: "English" }).click();
  await page.waitForTimeout(500);
}
if (await page.getByRole("button", { name: /Continue as Guest/i }).count()) {
  await page.getByRole("button", { name: /Continue as Guest/i }).click();
  await page.waitForLoadState("networkidle");
}
const generateButton = page.getByRole("button", { name: /Create result|Buat hasil/i });
await generateButton.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(300);

const splash = await page.locator("#app-splash").count();
const root = await page.locator("#root");
const childCount = await root.evaluate((el) => el.childElementCount);
const text = await root.innerText().catch(() => "");
const visible = await page.locator(".pl-first-run, .pl-shell, .pl-auth-gate").first().isVisible().catch(() => false);
const ctaBox = await generateButton.boundingBox();
const ctaTopElement = ctaBox
  ? await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return element?.closest("button")?.textContent?.trim() || element?.className || "";
    }, { x: ctaBox.x + ctaBox.width / 2, y: ctaBox.y + ctaBox.height / 2 })
  : "";
const navDoesNotCoverCta = Boolean(ctaBox && /Create result|Buat hasil/i.test(String(ctaTopElement)));

console.log(
  JSON.stringify(
    {
      url,
      errors,
      desktopShellVisible,
      resultFirstCopyVisible,
      oldBrandVisible,
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
process.exit(
  childCount > 0 &&
  visible &&
  desktopShellVisible &&
  resultFirstCopyVisible &&
  !oldBrandVisible &&
  navDoesNotCoverCta
    ? 0
    : 1
);
