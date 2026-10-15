import { chromium } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm, stat, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { duration, sceneMarkup } from "./scenes.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const assets = path.join(root, "assets/readme");
const frames = await mkdtemp(path.join(tmpdir(), "loopaer-render-"));
const site = await mkdtemp(path.join(tmpdir(), "loopaer-showcase-"));
const serveOnly = process.argv.includes("--serve");
const port = serveOnly ? 8765 : 8766;
let server, browser, cleanupPromise;
const cleanup = () => cleanupPromise ||= (async () => {
  server?.kill();
  try { if (browser) await browser.close(); }
  finally {
    await rm(frames, { recursive: true, force: true });
    await rm(site, { recursive: true, force: true });
  }
})();
process.once("SIGINT", () => { void cleanup().finally(() => process.exit(130)); });
process.once("SIGTERM", () => { void cleanup().finally(() => process.exit(143)); });
try {
// Publish only the showcase and its explicit source references, never .env,
// credentials, repository metadata or unrelated session evidence.
const files = ["README.md", "LICENSE", "docs/showcase-evidence.txt",
  ...["index.html", "showcase.css", "showcase.js", "scenes.js", "captions.vtt"].map((name) => `docs/showcase/${name}`),
  "frontend/src/App.js", "frontend/src/pages/Runtime.jsx",
  ...["server", "runtime", "sources", "openrouter", "eventbus", "commandcenter"].map((name) => `backend/${name}.py`),
  ...["500", "800", "900"].map((weight) => `frontend/src/landing/fonts/cabinet-grotesk-${weight}.woff2`)];
for (const name of files) {
  await mkdir(path.dirname(path.join(site, name)), { recursive: true });
  await cp(path.join(root, name), path.join(site, name));
}
await mkdir(path.join(site, "assets/readme"), { recursive: true });
const copyMedia = async () => {
  for (const name of ["preview.gif", "poster.png", "architecture.svg", "architecture.png", "walkthrough.mp4", "walkthrough.webm", "contact-sheet.png", "tour-desktop.png", "tour-mobile.png", "poster-light.png", "poster-dark.png"]) {
    try { await cp(path.join(assets, name), path.join(site, "assets/readme", name)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
};
await copyMedia();
server = spawn(process.execPath, [fileURLToPath(new URL("node_modules/http-server/bin/http-server", import.meta.url)), site, "-a", "127.0.0.1", "-p", String(port), "-c", "-1", "--no-dotfiles", "-d", "false"], { stdio: "ignore" });
  await mkdir(assets, { recursive: true });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview server failed; port ${port} may be occupied`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/docs/showcase/index.html`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Preview server did not start");
  assert.equal((await fetch(`http://127.0.0.1:${port}/.git/config`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${port}/backend/.env`)).status, 404);
  if (serveOnly) {
    console.log(`Local tour: http://127.0.0.1:${port}/docs/showcase/ (curated snapshot; restart after edits)`);
    await new Promise((resolve) => {
      server.once("exit", resolve);
    });
  } else {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/docs/showcase/index.html?render=1`);
  await page.evaluate(() => document.fonts.ready);
  const scene = page.locator("#scene");
  const draw = (time) => page.evaluate(async (t) => {
    const { drawScene } = await import("./scenes.js");
    drawScene(document.querySelector("#scene"), t);
  }, time);
  for (let frame = 0; frame < duration * 24; frame++) {
    await draw(frame / 24);
    await scene.screenshot({ path: path.join(frames, `${String(frame).padStart(4, "0")}.png`) });
  }
  await draw(17);
  await scene.screenshot({ path: path.join(assets, "poster.png") });
  // A self-contained static SVG; PNG posters carry the exact bundled display font.
  await writeFile(path.join(assets, "architecture.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-labelledby="title desc"><title id="title">Loopaer architecture</title><desc id="desc">React and FastAPI loops use sources and a model. The event bus returns updates. MongoDB supports runtime storage. The scripted demo is separate.</desc>${sceneMarkup(31)}</svg>\n`);
  await draw(31);
  await scene.screenshot({ path: path.join(assets, "architecture.png") });
  const ffmpeg = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  ffmpeg(["-framerate", "24", "-i", path.join(frames, "%04d.png"), "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(assets, "walkthrough.mp4")]);
  ffmpeg(["-framerate", "24", "-i", path.join(frames, "%04d.png"), "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", path.join(assets, "walkthrough.webm")]);
  // Twelve seconds condense the same five chapters; palette and changed rectangles
  // keep the GitHub preview small without sacrificing labels at desktop size.
  ffmpeg(["-framerate", "64", "-i", path.join(frames, "%04d.png"), "-filter_complex", "[0:v]fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none", "-loop", "0", path.join(assets, "preview.gif")]);
  ffmpeg(["-i", path.join(assets, "walkthrough.mp4"), "-vf", "fps=3/16,scale=480:-1,tile=3x2", "-frames:v", "1", path.join(assets, "contact-sheet.png")]);
  for (const [name, budget, expectedFrames, expectedDuration] of [
    ["preview.gif", 2_000_000, 144, 12],
    ["walkthrough.mp4", 10_000_000, 768, 32],
    ["walkthrough.webm", 10_000_000, 768, 32]
  ]) {
    const filename = path.join(assets, name);
    if ((await stat(filename)).size > budget) throw new Error(`${name} exceeds ${budget} bytes`);
    ffmpeg(["-i", filename, "-f", "null", "-"]);
    const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,duration:format=duration", "-of", "json", filename], { encoding: "utf8" }));
    if (Number(probe.streams[0].nb_read_frames) !== expectedFrames || Number(probe.streams[0].duration || probe.format.duration) !== expectedDuration) {
      throw new Error(`Unexpected frame count or duration: ${name}`);
    }
    assert.ok((await stat(path.join(assets, "walkthrough.mp4"))).size + (await stat(path.join(assets, "walkthrough.webm"))).size <= 10_000_000, "Combined walkthrough exceeds budget");
    await copyMedia();
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/docs/showcase/`);
  await page.waitForFunction(() => document.querySelector("#film").readyState >= 1);
  assert.equal(await page.locator("#film").evaluate((video) => video.duration), 32);
  assert.equal(await page.locator("#film").evaluate((video) => video.paused), true);
  await page.locator("[data-time='12']").click();
  await page.waitForFunction(() => document.querySelector("#film").currentTime === 12);
  assert.equal(await page.locator("[data-time='12']").getAttribute("aria-current"), "true");
  await page.locator("[data-node='storage']").focus();
  await page.keyboard.press("Enter");
  assert.match(await page.locator("#node-detail").innerText(), /still calls db directly/);
  assert.equal(await page.locator("[data-node='storage']").getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("[data-architecture='storage'] path").getAttribute("stroke"), "#d4ff00");
  assert.equal(await page.locator("#scene-title").count(), 1);
  await page.locator("#pipeline-controls button").nth(2).click();
  assert.match(await page.locator("#pipeline-description").innerText(), /no enterprise system is queried/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("#static-mode").checked);
  await page.locator("[data-time='20']").click();
  const still = await scene.innerHTML();
  await page.locator("#film").evaluate((video) => { video.currentTime = 22; video.dispatchEvent(new Event("timeupdate")); });
  assert.equal(await scene.innerHTML(), still);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => !document.querySelector("#static-mode").checked);
  await page.locator("[data-time='0']").click();
  await page.locator("#film").evaluate((video) => video.play());
  await page.waitForFunction(() => document.querySelector("#film").currentTime > .2);
  await page.locator("#film").evaluate((video) => video.pause());
  assert.equal(await page.locator("#film").evaluate((video) => video.textTracks[0].cues.length), 5);
  await page.locator("#film").evaluate((video) => { video.currentTime = 0; });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(assets, "tour-desktop.png") });
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  for (const button of await page.locator("button").all()) {
    assert.ok((await button.boundingBox()).height >= 44);
  }
  await page.screenshot({ path: path.join(assets, "tour-mobile.png") });
  const touch = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const touchPage = await touch.newPage();
  await touchPage.goto(`http://127.0.0.1:${port}/docs/showcase/`);
  await touchPage.locator("[data-node='demo']").tap();
  assert.match(await touchPage.locator("#node-detail").innerText(), /outcome figures are invented/);
  await touch.close();
  const fallback = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(`http://127.0.0.1:${port}/docs/showcase/`);
  assert.equal(await fallbackPage.locator("video[controls]").count(), 1);
  assert.equal(await fallbackPage.locator("noscript").isVisible(), true);
  assert.equal(await fallbackPage.locator("[data-node='demo']").isVisible(), false);
  await fallbackPage.locator("a[data-time='12']").click();
  assert.ok(fallbackPage.url().endsWith("#chapter-research"));
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log("Browser checks passed: playback/captions, chapters, keyboard nodes, pipeline, reduced motion, 360px, touch and no-JS");
  // GitHub-like light/dark surrounds: the original poster itself is unchanged.
  for (const [theme, background] of [["light", "#ffffff"], ["dark", "#0d1117"]]) {
    await page.setViewportSize({ width: 1000, height: 620 });
    await page.setContent(`<body style="margin:0;padding:20px;background:${background}"><img alt="Architecture poster" width="960" src="http://127.0.0.1:${port}/assets/readme/architecture.png"></body>`);
    await page.locator("img").evaluate((image) => image.decode());
    await page.screenshot({ path: path.join(assets, `poster-${theme}.png`) });
  }
  for (const name of ["poster.png", "architecture.png", "contact-sheet.png", "tour-desktop.png", "tour-mobile.png", "poster-light.png", "poster-dark.png"]) {
    assert.ok((await stat(path.join(assets, name))).size <= 500_000, `${name} exceeds poster budget`);
  }
  console.log(`Rendered ${duration}s at 24 fps; source frames: ${duration * 24}`);
  console.log(execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0]);
  console.log(await browser.version());
  }
} finally {
  await cleanup();
}
