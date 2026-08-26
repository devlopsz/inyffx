const { chromium } = require("playwright");
const path = require("path");

const baseUrl = process.env.INYFFX_BASE_URL || "http://127.0.0.1:4173/";
const screenshotDir = process.env.INYFFX_SCREENSHOT_DIR || process.cwd();
const browserPath = process.env.INYFFX_BROWSER_PATH;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(browserPath ? { executablePath: browserPath } : {})
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const issues = [];

  page.on("pageerror", (error) => issues.push("pageerror: " + error.message));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push("console: " + message.text());
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });

  const title = await page.title();
  const onboardingTitle = await page.locator("#authTitle").innerText();
  const firstCreateStepVisible = await page.locator('[data-form-step="1"].is-active').count();
  await page.screenshot({
    path: path.join(screenshotDir, "inyffx-v2-onboarding.png"),
    fullPage: true
  });

  await page.locator('[data-form-step="1"] [name="careerName"]').fill("Carreira QA");
  await page.locator('[data-form-step="1"] [name="playerName"]').fill("Jogador QA");
  await page.locator("#nextStep").click();

  await page.locator('[data-form-step="2"] [name="currentClub"]').fill("Clube QA");
  await page.locator('[data-form-step="2"] [name="season"]').fill("2026/27");
  await page.locator("#nextStep").click();
  await page.locator("#nextStep").click();

  await page.locator('[data-form-step="4"] [name="email"]').fill("qa@inyffx.local");
  await page.locator('[data-form-step="4"] [name="passcode"]').fill("1234");
  await page.locator('[data-form-step="4"] [name="localConsent"]').check();
  await page.locator("#createCareer").click();
  await page.locator("#appShell:not([hidden])").waitFor();

  const navCount = await page.locator("[data-route]").count();
  const emptyChat = await page.getByText("Seu universo começa na primeira mensagem.", { exact: true }).count();
  const statusLocal = await page.getByText("INTERFACE LOCAL", { exact: true }).count();

  await page.locator('[data-open-tool="dice"]').click();
  await page.locator('[data-die="20"]').click();
  await page.locator("#rollDice").click();
  const diceValue = Number(await page.locator("#diceResult strong").innerText());
  await page.locator("#closeTools").click();

  await page.locator('[data-open-tool="match"]').click();
  const matchForm = page.locator("#matchTemplateForm");
  await matchForm.locator('[name="date"]').fill("2026-08-26");
  await matchForm.locator('[name="season"]').fill("2026/27");
  await matchForm.locator('[name="competition"]').fill("Liga de Teste");
  await matchForm.locator('[name="homeTeam"]').fill("Clube QA");
  await matchForm.locator('[name="homeScore"]').fill("3");
  await matchForm.locator('[name="awayTeam"]').fill("Rival QA");
  await matchForm.locator('[name="awayScore"]').fill("2");
  await matchForm.locator('[name="minutes"]').fill("90");
  await matchForm.locator('[name="rating"]').fill("9.1");
  await matchForm.locator('[name="goals"]').fill("2");
  await matchForm.locator('[name="assists"]').fill("1");
  await matchForm.locator('[name="highlights"]').fill("Gol decisivo aos 90 minutos.");
  await page.locator("#insertMatchTemplate").click();
  await page.locator("#chatForm").evaluate((form) => form.requestSubmit());
  await page.getByText("Mensagem salva localmente.", { exact: false }).waitFor();

  const sentMatch = await page.getByText("[PARTIDA OFICIAL]", { exact: false }).count();

  await page.locator('[data-route="seasons"]').click();
  await page.locator(".match-row").first().waitFor();
  const matchRows = await page.locator(".match-row").count();
  const score = await page.locator(".match-row__score").first().innerText();
  const seasonStats = await page.locator(".stat-cell").allInnerTexts();

  await page.locator('[data-route="fyx-news"]').click();
  await page.locator(".news-feature").waitFor();
  const headline = await page.locator(".news-feature h2").innerText();
  const newsSource = await page.locator(".news-feature footer").innerText();

  await page.locator('[data-route="relationships"]').click();
  const relationshipEmpty = await page.getByText("Nenhum personagem registrado.", { exact: true }).count();

  await page.locator('[data-route="player-career"]').click();
  const financeEmpty = await page.getByText("FYX Pay ainda não foi iniciado.", { exact: true }).count();

  await page.locator('[data-route="off-the-pitch"]').click();
  const offPitchTitle = await page.getByText("Use o The Sims 4 como simulador da vida fora de campo.", { exact: true }).count();

  await page.locator('[data-route="kick-off"]').click();
  await page.waitForTimeout(300);
  await page.locator(".toast").evaluateAll((items) => items.forEach((item) => item.remove()));
  await page.screenshot({
    path: path.join(screenshotDir, "inyffx-v2-desktop.png"),
    fullPage: true
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#appShell:not([hidden])").waitFor();
  const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
  await page.locator("#mobileMenu").click();
  await page.waitForTimeout(300);
  const mobileSidebarVisible = await page.locator("body.is-nav-open").count();
  const mobileSidebarBox = await page.locator("#hubSidebar").boundingBox();
  const mobileWordmarkBox = await page.locator("#hubSidebar .wordmark").boundingBox();
  await page.locator('#hubSidebar [data-route="fyx-news"]').click();
  await page.locator("#page-fyx-news.is-active").waitFor();
  const mobileNavigationWorked = await page.locator("body:not(.is-nav-open)").count();
  await page.locator("#mobileMenu").click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(screenshotDir, "inyffx-v2-mobile.png"),
    fullPage: true
  });

  const result = {
    title,
    onboardingTitle,
    firstCreateStepVisible,
    navCount,
    emptyChat,
    statusLocal,
    diceValue,
    sentMatch,
    matchRows,
    score,
    seasonStats,
    headline,
    newsSource,
    relationshipEmpty,
    financeEmpty,
    offPitchTitle,
    issues,
    bodyWidth,
    viewport: 390,
    mobileSidebarVisible,
    mobileNavigationWorked,
    mobileSidebarBox,
    mobileWordmarkBox
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  const failed =
    !title.includes("InyffX") ||
    !onboardingTitle.toLocaleLowerCase("pt-BR").includes("a vida acontece aqui") ||
    !firstCreateStepVisible ||
    navCount !== 6 ||
    !emptyChat ||
    !statusLocal ||
    diceValue < 1 ||
    diceValue > 20 ||
    !sentMatch ||
    matchRows !== 1 ||
    score !== "3 — 2" ||
    !headline.toLocaleLowerCase("pt-BR").includes("clube qa 3 x 2 rival qa") ||
    !newsSource.includes("RELATO DO JOGADOR") ||
    !relationshipEmpty ||
    !financeEmpty ||
    !offPitchTitle ||
    issues.length ||
    bodyWidth > 390 ||
    !mobileSidebarVisible ||
    !mobileNavigationWorked;

  if (failed) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
