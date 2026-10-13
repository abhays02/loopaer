import { chapterTimes, drawScene } from "./scenes.js";

const film = document.querySelector("#film");
const scene = document.querySelector("#scene");
const staticMode = document.querySelector("#static-mode");
const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
document.querySelectorAll("[data-enhancement]").forEach((element) => { element.hidden = false; });
staticMode.checked = preference.matches;
let selectedNode = null;
preference.addEventListener("change", (event) => {
  staticMode.checked = event.matches;
  update();
});
function update() {
  const chapter = chapterTimes.findLastIndex((start) => film.currentTime >= start);
  drawScene(scene, selectedNode ? 31 : staticMode.checked ? chapterTimes[chapter] + 5 : film.currentTime);
  if (selectedNode) {
    scene.querySelectorAll("[data-architecture]").forEach((node) => {
      const color = node.dataset.architecture === selectedNode ? "#d4ff00" : "#edede6";
      node.querySelector("path").setAttribute("stroke", color);
      node.querySelector("text").setAttribute("fill", color);
    });
  }
  document.querySelectorAll("[data-time]").forEach((link, index) => {
    link.setAttribute("aria-current", String(index === chapter));
  });
  document.querySelectorAll("[data-node]").forEach((node) => {
    node.setAttribute("aria-pressed", String(node.dataset.node === selectedNode));
  });
}
film.addEventListener("timeupdate", update);
film.addEventListener("play", () => { selectedNode = null; update(); });
staticMode.addEventListener("change", update);
document.querySelectorAll("[data-time]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    selectedNode = null;
    film.pause();
    film.currentTime = Number(link.dataset.time);
    update();
  });
});

const nodes = {
  workspace: ["React workspace", "The runtime page presents loops, knowledge and controls. It consumes REST responses and WebSocket events.", "../../frontend/src/pages/Runtime.jsx"],
  runtime: ["FastAPI + loops", "server.py routes requests to asynchronous planner, research, verification and skill-builder loops. Controls pause at cooperative checkpoints, not at arbitrary instructions.", "../../backend/runtime.py"],
  sources: ["Sources + model", "Research queries arXiv and GitHub. OpenRouter supplies model output for planning, extraction and verification. Source availability and model quality are not guaranteed.", "../../backend/sources.py"],
  events: ["Event bus", "The bus buffers and broadcasts lifecycle events, then persists them when a database is available. Runtime sessions and demo run IDs share /api/ws/{sid}.", "../../backend/eventbus.py"],
  storage: ["MongoDB", "The demo can run in memory, but the broader runtime API still calls db directly. Sessions, skills, auth, generated UI and snapshots are not all usable without MongoDB.", "../../backend/server.py"],
  demo: ["Scripted demo", "A separate engine walks six timed stages. Catalog connectors are mocked; outcome figures are invented. This is not a successful enterprise deployment or a research loop.", "../../backend/commandcenter.py"]
};
document.querySelectorAll("[data-node]").forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    selectedNode = button.dataset.node;
    film.pause();
    film.currentTime = 26;
    update();
    const [title, description, source] = nodes[button.dataset.node];
    const detail = document.querySelector("#node-detail");
    detail.querySelector("h3").textContent = title;
    detail.querySelector("p").textContent = description;
    detail.querySelector("a").href = source;
    detail.querySelector("a").textContent = `Read ${source.split("/").pop()}`;
    document.querySelectorAll("[data-node]").forEach((node) => {
      node.setAttribute("aria-pressed", String(node === button));
    });
  });
});
document.querySelectorAll("#pipeline li").forEach((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${index + 1} / ${item.querySelector("strong").textContent.replace(".", "")}`;
  button.setAttribute("aria-controls", "pipeline");
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => {
    document.querySelectorAll("#pipeline li").forEach((step) => step.removeAttribute("aria-current"));
    document.querySelectorAll("#pipeline-controls button").forEach((step) => step.setAttribute("aria-pressed", String(step === button)));
    item.setAttribute("aria-current", "step");
    document.querySelector("#pipeline-description").textContent = item.textContent;
    item.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
  document.querySelector("#pipeline-controls").append(button);
});
if (new URLSearchParams(location.search).has("render")) document.body.classList.add("render");
update();
