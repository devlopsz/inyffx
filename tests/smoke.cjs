const { chromium } = require("playwright");

const baseUrl = process.env.INYFFX_BASE_URL || "http://127.0.0.1:4173/";
const screenshotDir = process.env.INYFFX_SCREENSHOT_DIR || process.cwd();
const browserPath = process.env.INYFFX_BROWSER_PATH;

(async () => {
  const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const issues = [];

  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const title = await page.title();
  const homeH1 = await page.locator("h1").first().innerText();

  await page.locator("[data-route=roleplay]").first().click();
  await page.locator("#rpInput").fill("Estou pronto para assumir a responsabilidade.");
  await page.locator("#roleplayForm").evaluate((form) => form.requestSubmit());
  await page.getByText("Eu queria ouvir isso", { exact: false }).waitFor({ timeout: 3000 });
  const sent = await page.getByText("Estou pronto para assumir a responsabilidade.").count();
  const npcReply = await page.getByText("Eu queria ouvir isso", { exact: false }).count();
  await page.screenshot({ path: `${screenshotDir}/inyffx-roleplay.png`, fullPage: true });

  await page.locator("[data-route=postgame]").first().click();
  await page.locator("#postgameForm").evaluate((form) => form.requestSubmit());
  await page.waitForTimeout(150);
  const story = await page.locator(".story-pack").count();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshotDir}/inyffx-postgame.png`, fullPage: true });

  await page.locator("[data-route=canon]").first().click();
  const canonEvents = await page.locator(".canon-event").count();
  await page.screenshot({ path: `${screenshotDir}/inyffx-canon.png`, fullPage: true });

  await page.locator("[data-route=characters]").first().click();
  const characterCards = await page.locator(".character-card").count();
  const dossier = await page.locator(".character-dossier").count();

  await page.locator("[data-route=universe]").first().click();
  await page.locator("[data-action=roll-die]").first().click();
  const chanceEvent = await page.locator(".chance-copy strong").innerText();

  await page.locator("[data-action=new-career]").first().click();
  await page.locator("#wc-name").fill("Jogador Teste");
  await page.locator("#wc-club").fill("Clube Teste");
  await page.locator("#careerWizard").evaluate((form) => form.requestSubmit());
  const wizardStepTwo = await page.getByText("Etapa 2 de 4").count();
  await page.locator("[data-action=close-modal]").first().click();

  await page.evaluate(() => localStorage.clear());
  await page.goto(`${baseUrl}#/home`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${screenshotDir}/inyffx-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
  const activeElement = await page.evaluate(() => document.activeElement?.tagName || "");
  const skipTransform = await page.locator(".skip-link").evaluate((element) => getComputedStyle(element).transform);
  await page.screenshot({ path: `${screenshotDir}/inyffx-mobile.png`, fullPage: true });

  const result = { title, homeH1, sent, npcReply, story, canonEvents, characterCards, dossier, chanceEvent, wizardStepTwo, issues, bodyWidth, viewport: 390, activeElement, skipTransform };
  console.log(JSON.stringify(result));
  await browser.close();

  if (!title.includes("InyffX") || !sent || !npcReply || !story || !canonEvents || characterCards < 1 || !dossier || !chanceEvent || !wizardStepTwo || issues.length || bodyWidth > 390) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
