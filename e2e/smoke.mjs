// Browser smoke test (desktop + phone): browse, search, jump, practice (1 and 2 answers), resume,
// wrong-answers review, timed mock exam with resume, submit and review.
//   npm i --no-save playwright && npx playwright install chromium
//   npm run build && npm start   (in another terminal)
//   node e2e/smoke.mjs           (BASE_URL=... to test a deployment)
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./screenshots/", import.meta.url).pathname;
import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const check = (cond, msg) => {
  if (!cond) {
    errors.push(msg);
    console.log("FAIL:", msg);
  } else console.log("ok:", msg);
};

async function run(name, viewport, isMobile) {
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: isMobile ? 2 : 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name} console: ${m.text()}`));

  await page.goto(BASE + "/");
  await page.screenshot({ path: `${OUT}${name}-home.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal scroll on home`);

  // Browse + search
  await page.goto(BASE + "/questions");
  check((await page.getByText("Showing all 1000 questions").count()) === 1, `${name}: browser shows all 1000`);
  await page.getByLabel("Search questions").fill("school zone");
  await page.waitForTimeout(500);
  const matchText = await page.getByText(/matching questions/).textContent();
  check(/\d+ matching/.test(matchText), `${name}: search filters (${matchText})`);
  await page.screenshot({ path: `${OUT}${name}-search.png`, fullPage: false });

  // Jump by number to a two-answer photo question
  await page.getByLabel("Question number").first().fill("860");
  await page.getByRole("button", { name: "Go" }).first().click();
  await page.waitForURL(/n=860/);
  check((await page.locator("img[alt^='Picture for question 860']").count()) === 1, `${name}: Q860 image shown`);
  await page.screenshot({ path: `${OUT}${name}-q860.png`, fullPage: true });

  // Video question marked
  await page.goto(BASE + "/questions?n=970");
  check((await page.getByText("This question needs a video").count()) === 1, `${name}: Q970 missing-video banner`);

  // Last question reachable
  await page.goto(BASE + "/questions?n=1000");
  check((await page.getByText("Q1000", { exact: true }).count()) >= 1, `${name}: Q1000 reachable`);

  // Practice: sequential 1..10; Q1 correct is 2
  await page.goto(BASE + "/practice");
  await page.getByLabel("From question").fill("1");
  await page.getByLabel("To question").fill("10");
  await page.getByRole("button", { name: /Start practice \(10 questions\)/ }).click();
  const choices = page.getByRole("group", { name: "Answer choices" }).getByRole("button");
  await choices.nth(1).click();
  check((await page.getByText("Correct!").count()) === 1, `${name}: practice single-answer correct feedback`);
  await page.getByRole("button", { name: "Next →" }).click();
  // Q2 answer is 2; pick 1 -> wrong
  await choices.nth(0).click();
  check((await page.getByText("Not quite.").count()) === 1, `${name}: practice wrong feedback`);
  // go to Q8 (two answers 1,4)
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: /Next →|Skip →/ }).click();
  check((await page.getByText("Q8", { exact: true }).count()) === 1, `${name}: at Q8`);
  await choices.nth(0).click();
  check((await page.getByText("Correct!").count()) === 0, `${name}: two-answer not graded after one pick`);
  await choices.nth(3).click();
  check((await page.getByText("Correct!").count()) === 1, `${name}: two-answer graded correct with both`);
  await page.screenshot({ path: `${OUT}${name}-practice-q8.png`, fullPage: true });

  // Reload -> resume practice at same place
  await page.reload();
  check((await page.getByText("Q8", { exact: true }).count()) === 1, `${name}: practice resumes after reload`);
  await page.getByRole("button", { name: "Exit" }).click();

  // Wrong list contains Q2
  await page.goto(BASE + "/wrong");
  check((await page.getByRole("link", { name: "Q2", exact: true }).count()) === 1, `${name}: Q2 in wrong answers`);
  await page.getByRole("button", { name: /Review 1 in order/ }).click();
  await choices.nth(1).click();
  check((await page.getByText("Correct!").count()) === 1, `${name}: wrong review correct`);
  await page.getByRole("button", { name: "Finish" }).click();
  check((await page.getByText("Nothing to review yet").count()) === 1, `${name}: wrong list cleared after correct review`);

  // Mock exam
  await page.goto(BASE + "/mock");
  await page.getByRole("button", { name: /Start 40-minute exam/ }).click();
  check((await page.getByRole("timer").count()) === 1, `${name}: countdown visible`);
  const t1 = await page.getByRole("timer").textContent();
  check(/^(40:00|39:5\d)$/.test(t1.trim()), `${name}: timer starts at 40:00 (${t1})`);
  check((await page.getByText(/Q1\/39/).count()) >= 1 && (await page.getByText(/Q1\/40/).count()) === 0, `${name}: 39 questions (video excluded)`);
  await page.screenshot({ path: `${OUT}${name}-mock.png`, fullPage: true });
  // answer 5 questions with the first option(s)
  for (let i = 0; i < 5; i++) {
    const g = page.getByRole("group", { name: "Answer choices" }).getByRole("button");
    await g.nth(0).click();
    if ((await page.getByText("Choose 2 answers").count()) > 0) await g.nth(1).click();
    await page.getByRole("button", { name: "Next →" }).click();
  }
  await page.reload();
  check((await page.getByText(/5 answered/).count()) === 1, `${name}: mock resumes with 5 answered after reload`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForSelector("text=/ \\/ 100/");
  const passTxt = await page.getByText(/^(Passed|Not passed)$/).textContent();
  check(!!passTxt, `${name}: results shown (${passTxt})`);
  await page.getByRole("button", { name: /^All \(39\)$/ }).click();
  await page.locator("li.card button").first().click();
  await page.screenshot({ path: `${OUT}${name}-results.png`, fullPage: true });
  await page.goto(BASE + "/wrong");
  const wrongCount = await page.locator("ul.card > li").count();
  check(wrongCount >= 34, `${name}: mock misses fed into wrong list (${wrongCount})`);

  await page.goto(BASE + "/settings");
  await page.screenshot({ path: `${OUT}${name}-settings.png`, fullPage: true });
  await ctx.close();
}

await run("desktop", { width: 1280, height: 860 }, false);
await run("phone", { width: 390, height: 844 }, true);
await browser.close();
console.log(errors.length ? `\n${errors.length} problem(s):\n` + errors.join("\n") : "\nALL CHECKS PASSED");
process.exit(errors.length ? 1 : 0);
