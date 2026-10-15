// Deterministic SVG choreography shared by the local tour and media renderer.
export const duration = 32;
export const chapterTimes = [0, 6, 12, 20, 26];
const ease = (x) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
const ink = "#edede6";
const muted = "#aaa9a0";
const signal = "#d4ff00";
const quadratic = (a, b, c, t) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c;
const text = (x, y, value, size = 20, color = ink, weight = 500) =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Cabinet Grotesk, Arial, sans-serif">${value}</text>`;
const mono = (x, y, value, color = muted) =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="15" font-family="monospace">${value}</text>`;
const sketch = (x, y, w, h, label, active = false, node = "") =>
  `<g data-architecture="${node}"><path d="M${x - 2} ${y + 2} Q${x + w / 2} ${y - 3} ${x + w + 2} ${y} L${x + w} ${y + h + 2} Q${x + w / 2} ${y + h - 2} ${x} ${y + h} Z" fill="#101010" stroke="${active ? signal : "#76766b"}" stroke-width="1.5"/>${text(x + 18, y + h / 2 + 7, label, 23, active ? signal : ink, 800)}</g>`;
const path = (d, progress = 1, active = false) =>
  `<path d="${d}" fill="none" stroke="${active ? signal : "#76766b"}" stroke-width="2" pathLength="1" stroke-dasharray="${progress} 1" stroke-linecap="round"/>`;

export function sceneMarkup(time) {
  const t = Math.max(0, Math.min(duration - .001, time));
  const chapter = chapterTimes.findLastIndex((start) => t >= start);
  const local = t - chapterTimes[chapter];
  const titles = ["Start with a question.", "Make the work inspectable.", "Follow the sources.", "Ask what holds up.", "Keep the boundary honest."];
  const captions = [
    ["A session keeps the goal and its evolving knowledge together.", "Illustration only / no private session or measured result"],
    ["Planner requests a task graph through OpenRouter.", "PlanReady carries structure, not a promise of success."],
    ["arXiv + GitHub supply material; the model extracts facts and gaps.", "SourceFetching / FactExtracted / GapDetected"],
    ["Verification reports model judgments; skill builder packages knowledge.", "Confidence is not calibrated truth. Controls are cooperative."],
    ["Both engines share events, not the same reasoning.", "MongoDB is required for the broader runtime API."]
  ];
  let body = "";
  if (chapter === 0) {
    body = sketch(90, 200, 330, 115, "Question", true) +
      text(110, 280, "Evaluate source quality", 21, muted) +
      sketch(570, 200, 280, 115, "Session") +
      path("M425 257 Q500 253 561 257", ease(local / 2), true) +
      mono(575, 351, "SessionCreated");
    const x = 425 + 136 * ease((local - 1) / 3);
    body += `<circle cx="${x}" cy="257" r="5" fill="${signal}"/>`;
  } else if (chapter === 1) {
    body = sketch(75, 212, 230, 86, "Planner", true) +
      sketch(360, 212, 250, 86, "OpenRouter") +
      sketch(670, 212, 220, 86, "Task graph") +
      path("M310 254 Q333 252 353 254", ease(local), true) +
      path("M615 254 Q642 252 663 254", ease(local - 1), true) +
      mono(78, 352, "PlannerThinking") + mono(674, 352, "PlanReady") +
      path("M780 307 Q785 388 615 388 L400 388", ease((local - 2) / 2)) +
      mono(405, 419, "ReasoningTreeUpdated");
    body += `<circle cx="${310 + 353 * ease((local - .5) / 3)}" cy="254" r="5" fill="${signal}"/>`;
  } else if (chapter === 2) {
    body = sketch(70, 215, 220, 86, "Research", true) +
      sketch(370, 162, 240, 80, "arXiv / GitHub") +
      sketch(370, 298, 240, 80, "OpenRouter") +
      sketch(690, 215, 200, 86, "Knowledge") +
      path("M297 252 Q326 200 363 202", ease(local / 2), true) +
      path("M490 249 L490 290", ease((local - 1) / 2), true) +
      path("M617 338 Q655 335 683 264", ease((local - 2) / 2), true) +
      mono(72, 345, "SourceFetching") + mono(686, 345, "FactExtracted") +
      mono(686, 371, "+ gaps / entities");
    const p = ease(local < 2 ? local / 2 : local < 4 ? (local - 2) / 2 : (local - 4) / 3);
    const d = local < 2 ? [quadratic(297, 326, 363, p), quadratic(252, 200, 202, p)] :
      local < 4 ? [490, 249 + 41 * p] : [quadratic(617, 655, 683, p), quadratic(338, 335, 264, p)];
    body += `<circle cx="${d[0]}" cy="${d[1]}" r="5" fill="${signal}"/>`;
  } else if (chapter === 3) {
    body = sketch(65, 214, 220, 86, "Knowledge") +
      sketch(352, 214, 260, 86, "Verification", true) +
      sketch(680, 214, 210, 86, "Skill builder") +
      path("M292 256 Q320 253 345 256", ease(local), true) +
      path("M619 256 Q645 253 673 256", ease(local - 1.5), true) +
      mono(357, 347, "ConfidenceChanged") + mono(680, 347, "SkillGenerated") +
      path("M483 308 Q480 388 200 387", ease((local - 2) / 2)) +
      mono(66, 420, "pause / resume / cancel / inject");
    body += `<circle cx="${292 + 381 * ease((local - .5) / 3.5)}" cy="256" r="5" fill="${signal}"/>`;
  } else {
    body = sketch(60, 174, 235, 75, "React workspace", false, "workspace") +
      sketch(355, 174, 240, 75, "FastAPI / loops", false, "runtime") +
      sketch(665, 174, 235, 75, "Sources / model", false, "sources") +
      sketch(60, 322, 235, 75, "Event bus", true, "events") +
      sketch(355, 322, 240, 75, "MongoDB", false, "storage") +
      sketch(665, 322, 235, 75, "Scripted demo", false, "demo") +
      path("M302 209 Q325 207 348 209") +
      path("M602 209 Q630 207 658 209") +
      path("M474 256 Q476 277 476 315") +
      path("M355 226 Q178 266 177 315", ease(local / 2), true) +
      path("M177 315 Q172 285 177 256", ease((local - 1) / 2), true) +
      path("M659 361 Q478 430 302 361") +
      mono(70, 437, "WS /api/ws/{sid}") + mono(671, 437, "timed stages only");
    body += `<circle cx="177" cy="${315 - 59 * ease((local - 1) / 3)}" r="5" fill="${signal}"/>`;
  }
  // The same paper frame holds every scene; only the causal path carries acid.
  const length = (chapterTimes[chapter + 1] || duration) - chapterTimes[chapter];
  const reveal = ease(local / .45);
  const exit = ease((length - local) / .4);
  return `<rect width="960" height="540" fill="#0b0b0b"/>
    <path d="M24 54 L24 24 L55 25 M905 516 L937 515 L936 484" fill="none" stroke="#76766b" stroke-width="1.5"/>
    ${mono(60, 58, `LOOPAER / FIELD NOTES                                      0${chapter + 1} / 05`)}
    <g opacity="${.35 + .65 * reveal * exit}" transform="translate(0 ${8 * (1 - reveal)})">
    ${text(60, 120, titles[chapter], 42, ink, 800)}
    ${body}
    <path d="M59 465 Q480 462 901 465" fill="none" stroke="#41413b"/>
    ${text(60, 494, captions[chapter][0], 19)}
    ${mono(60, 521, captions[chapter][1])}</g>`;
}

export function drawScene(svg, time) {
  svg.innerHTML = `<title id="scene-title">Loopaer / code-grounded research walkthrough</title><desc id="scene-description">Illustrative architecture, not measured research results. A single signal traces the active chapter.</desc>${sceneMarkup(time)}`;
}
