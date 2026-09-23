import { initGlobe } from './globe.js';
import { initPeriodicTable, openPeriodicTable } from './ptable.js';
import { initViewer } from './viewer.js';

async function loadModels() {
  const res = await fetch("../../public/models.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load models.json");
  return res.json();
}

function getId() {
  const u = new URL(location.href);
  return u.searchParams.get("id");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}

function addTagChips(tags) {
  const host = document.getElementById("tags");
  if (!host) return;
  host.innerHTML = "";
  for (const t of tags ?? []) {
    const b = document.createElement("span");
    b.className = "chip";
    b.dataset.on = "false";
    b.textContent = t;
    host.appendChild(b);
  }
}

function renderCompoundBadges(compounds) {
  const host = document.getElementById("compoundBadges");
  if (!host) return;
  host.innerHTML = "";
  if (!Array.isArray(compounds) || compounds.length === 0) {
    host.style.display = "none";
    return;
  }
  host.style.display = "flex";
  for (const item of compounds) {
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "compound-badge";
    if (item.color) badge.style.setProperty("--compound-bg", item.color);
    if (item.glow) badge.style.setProperty("--compound-glow", item.glow);
    badge.title = item.name ? `${item.name} (${item.symbol ?? ""})` : item.symbol ?? "";
    badge.setAttribute(
      "aria-label",
      `Open periodic table for ${item.name ?? item.symbol ?? "element"}`
    );
    badge.addEventListener("click", () => openPeriodicTable(item.symbol));
    const num = document.createElement("div");
    num.className = "compound-number";
    num.textContent = item.number ?? "";
    const sym = document.createElement("div");
    sym.className = "compound-symbol";
    sym.textContent = item.symbol ?? "";
    badge.appendChild(num);
    badge.appendChild(sym);
    host.appendChild(badge);
  }
}

(async () => {
  initPeriodicTable();
  const canvas = document.getElementById("c");
  if (!canvas) throw new Error("Canvas #c not found");

  let models;
  try {
    models = await loadModels();
  } catch (err) {
    setText("title", "Failed to load models.json");
    setText("name", "Failed to load models.json");
    setText("desc", err?.message ?? "Unknown error");
    return;
  }

  const id = getId();
  const m = (models ?? []).find((x) => x.id === id) ?? (models ?? [])[0];
  if (!m) {
    setText("title", "No models found");
    setText("name", "No models found");
    return;
  }

  document.title = m.name ?? "Viewer";
  setText("title", m.name);
  setText("name", m.name);
  if ((m.description ?? "").trim()) setText("desc", m.description);
  setText("author", m.author);
  setText("date", m.date);
  setText("software", m.software);
  setText("polycount", (m.polycount ?? "").toString());

  addTagChips(m.tags);
  renderCompoundBadges(m.compounds);

  const sources = Array.isArray(m.src) ? m.src : [m.src];
  const plySrc = sources.find((s) => s.toLowerCase().endsWith(".ply"));
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn && plySrc) {
    downloadBtn.href = plySrc;
    downloadBtn.setAttribute("download", plySrc.split("/").pop() || "model");
  }

  initGlobe(m, models);
  await initViewer(m, canvas);
})();