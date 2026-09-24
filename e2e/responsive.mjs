// Responsive layout check: 14 viewports (320px phone to 1920px desktop, incl. landscape and tablets) x every
// page and state (question views, install dialog, practice, mock exam, results). Fails on anything that sticks
// out of the screen. Usage: start the app, then `node e2e/responsive.mjs` (needs playwright, see smoke.mjs).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./screenshots/responsive/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();

const VIEWPORTS = [
  [320, 568, true], [360, 740, true], [375, 667, true], [390, 844, true], [414, 896, true], [430, 932, true],
  [844, 390, true], // phone landscape
  [600, 960, true], [768, 1024, true], [820, 1180, true], // tablets
  [1024, 768, false], [1280, 800, false], [1440, 900, false], [1920, 1080, false],
];
const SHOOT = new Set([320, 390, 844, 768, 1280]);

// Report elements that stick out of the viewport (ignoring ones inside intentional horizontal scrollers).
const overflowCheck = () => {
  const W = window.innerWidth;
  const bad = [];
  const scrolls = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.position === "fixed") continue;
    if ((r.right > W + 1 || r.left < -1) && !scrolls(el)) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} [${Math.round(r.left)}..${Math.round(r.right)}]`);
  }
  return { docOverflow: document.documentElement.scrollWidth - W, bad: bad.slice(0, 5) };
};

const problems = [];
let checks = 0;
for (const [w, h, touch] of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch && w < 900, hasTouch: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => problems.push(`${w}px pageerror ${e.message}`));
  const check = async (label) => {
    await p.waitForTimeout(250);
    const r = await p.evaluate(overflowCheck);
    checks++;
    if (r.docOverflow > 0 || r.bad.length) problems.push(`${w}x${h} ${label}: page overflow ${r.docOverflow}px ${r.bad.join(" | ")}`);
    if (SHOOT.has(w)) await p.screenshot({ path: `${OUT}${w}-${label}.png` });
  };
  for (const [label, url] of [
    ["home", "/"],
    ["list", "/questions"],
    ["q860", "/questions?n=860"],
    ["q871", "/questions?n=871"],
    ["q970", "/questions?n=970"],
    ["q509", "/questions?n=509"],
    ["practice-setup", "/practice"],
    ["mock-setup", "/mock"],
    ["wrong", "/wrong"],
    ["settings", "/settings"],
  ]) {
    await p.goto(BASE + url);
    await check(label);
  }
  // install dialog
  await p.goto(BASE + "/");
  const btn = p.getByRole("button", { name: /How to install|Install app/ }).last();
  await btn.click();
  await p.waitForSelector("dialog[open]");
  await check("install-dialog");
  await p.keyboard.press("Escape");
  // practice running
  await p.goto(BASE + "/practice");
  await p.getByRole("button", { name: /Start practice/ }).click();
  await p.getByRole("group", { name: "Answer choices" }).getByRole("button").first().click();
  await check("practice-run");
  await p.getByRole("button", { name: "Exit" }).click();
  // mock running + navigator + results
  await p.goto(BASE + "/mock");
  await p.getByRole("button", { name: /Start 40-minute exam/ }).click();
  await check("mock-run");
  const navBtn = p.getByRole("button", { name: /^Q1\/39/ });
  if (await navBtn.isVisible()) {
    await navBtn.click();
    await check("mock-nav");
  }
  p.once("dialog", (d) => d.accept());
  await p.getByRole("button", { name: "Submit", exact: true }).click();
  await p.waitForSelector("text=/ \\/ 100/");
  await p.getByRole("button", { name: /^Wrong \(/ }).click();
  await p.locator("li.card button").first().click();
  await check("mock-results");
  await ctx.close();
}
await b.close();
console.log(`${checks} page/viewport checks`);
console.log(problems.length ? problems.join("\n") : "NO OVERFLOW OR LAYOUT PROBLEMS");
if (problems.length) process.exitCode = 1;
