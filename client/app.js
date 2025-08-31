// ===== Genesis Gates App =====
// Viewer vs Owner modes, share code, GEDCOM/JSON, D3 tree, Leaflet map,
// Web3.Storage publish/load (needs user token), slick UI with Tailwind.

const qs  = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const uid  = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---- Persistent storage
const STORAGE = "gg:state:v1";
const KEY_OWNER = "gg:ownerKey";
const KEY_W3S = "gg:w3sToken";
const KEY_SHAREMAP = "gg:shareMap"; // { CODE: CID }

function saveState(s){ localStorage.setItem(STORAGE, JSON.stringify(s)); }
function loadState(){ try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch { return {}; } }

// ---- App state
let state = Object.assign({
  people: [],
  links: [],       // { parentId, childId }
  spouses: [],     // [aId, bId]
  sources: [],
  media: [],
  opts: { large:false, spouses:true, curved:true },
  geoCache: {}
}, loadState());

let MODE = "viewer"; // "viewer" | "owner"

// Seed so page isn't empty
if (state.people.length === 0) {
  const a = { id: uid(), sex: "M", name: "Alex Pioneer", birthDate: "1970-01-01", birthPlace: "Baghdad, Iraq", residencePlace: "San Diego, USA" };
  const b = { id: uid(), sex: "F", name: "Brianna Pioneer", birthDate: "1972-02-02", birthPlace: "Erbil, Iraq", residencePlace: "Phoenix, USA" };
  const c = { id: uid(), sex: "M", name: "Child A", birthDate: "1995-04-05", birthPlace: "San Diego, USA", residencePlace: "Austin, USA" };
  state.people = [a, b, c];
  state.spouses = [[a.id, b.id]];
  state.links = [{ parentId: a.id, childId: c.id }, { parentId: b.id, childId: c.id }];
  saveState(state);
}

// ---------- Landing wiring ----------
document.addEventListener("DOMContentLoaded", () => {
  // View with code
  qs("#btnOpenCode").addEventListener("click", openWithCode);

  // Owner login / create
  const ownerKey = localStorage.getItem(KEY_OWNER);
  qs("#ownerStatus").textContent = ownerKey ? "Key present" : "No key yet";
  qs("#btnOwnerLogin").addEventListener("click", ownerLogin);
  qs("#btnOwnerCreate").addEventListener("click", ownerCreate);

  // Web3.Storage
  const savedToken = localStorage.getItem(KEY_W3S) || "";
  if (savedToken) qs("#w3sToken").value = savedToken;
  qs("#btnSaveToken").addEventListener("click", () => {
    const t = qs("#w3sToken").value.trim();
    if (!t) return alert("Paste your Web3.Storage token");
    localStorage.setItem(KEY_W3S, t);
    alert("Token saved locally.");
  });
  qs("#btnCreateNewTree").addEventListener("click", createEmptyTree);

  // App shell
  qs("#btnLogout").addEventListener("click", () => location.reload());
  qs("#btnShare").addEventListener("click", createShareCode);
  qs("#btnPublish").addEventListener("click", publishToWeb3);

  // Tabs
  qsa(".tab").forEach((b) => b.addEventListener("click", () => switchTab(b.getAttribute("data-tab"))));

  // Overview actions
  qs("#btnBackup").addEventListener("click", exportGEDCOM);
  qs("#btnExportJSON").addEventListener("click", exportJSON);
  qs("#fileImportJSON").addEventListener("change", importJSON);
  qs("#btnExportGED").addEventListener("click", exportGEDCOM);
  qs("#fileImportGED").addEventListener("change", onGEDFile);

  qs("#btnLocatePlaces").addEventListener("click", locatePlaces);
  qs("#btnSavePerson").addEventListener("click", savePerson);
  qs("#btnClearForm").addEventListener("click", clearForm);

  // Reports
  qs("#btnReportA").addEventListener("click", () => generateReport("ancestor"));
  qs("#btnReportD").addEventListener("click", () => generateReport("descendant"));
  qs("#btnReportT").addEventListener("click", () => generateReport("timeline"));

  // Settings
  bindSettings();

  renderPeople();
  refreshSelectors();
});

// ---------- Mode helpers ----------
function enterViewer() {
  MODE = "viewer";
  qs("#modeBadge").textContent = "Viewer";
  qsa(".form").forEach((el) => (el.disabled = true));
  showApp();
}
function enterOwner() {
  MODE = "owner";
  qs("#modeBadge").textContent = "Owner";
  qsa(".form").forEach((el) => (el.disabled = false));
  showApp();
}

function showApp() {
  hide(qs("#landing"));
  show(qs("#app"));
  // default to Overview
  switchTab("overview");
}

function ownerCreate() {
  const pass = qs("#ownerPass").value.trim();
  if (!pass) return alert("Enter a passphrase first.");
  const key = "GG-" + btoa(pass).slice(0, 16);
  localStorage.setItem(KEY_OWNER, key);
  qs("#ownerStatus").textContent = "Key created";
  alert("Owner key created.");
}
function ownerLogin() {
  const pass = qs("#ownerPass").value.trim();
  if (!pass) return alert("Enter your passphrase.");
  const key = localStorage.getItem(KEY_OWNER);
  if (!key) return alert("No owner key yet. Click 'Create/Replace Key' first.");
  if (key === "GG-" + btoa(pass).slice(0, 16)) {
    enterOwner();
  } else {
    alert("Wrong passphrase.");
  }
}

// ---------- Share code (CODE↔CID mapping stored locally for demo) ----------
function genCode() {
  const base32 = "ABCDEFGHJKLMNPQRSTUVWXYZ234567";
  const group = () => Array.from({ length: 5 }, () => base32[Math.floor(Math.random() * base32.length)]).join("");
  return [group(), group(), group(), group(), group()].join("-");
}
function loadShareMap() {
  try { return JSON.parse(localStorage.getItem(KEY_SHAREMAP)) || {}; } catch { return {}; }
}
function saveShareMap(map) {
  localStorage.setItem(KEY_SHAREMAP, JSON.stringify(map));
}
async function createShareCode() {
  // Publish to IPFS first, then mint a code for that CID
  const cid = await publishToWeb3(true);
  if (!cid) return;
  const map = loadShareMap();
  const code = genCode();
  map[code] = cid;
  saveShareMap(map);
  prompt("Share code (anyone can view):", code);
}
async function openWithCode() {
  const code = qs("#viewCode").value.trim().toUpperCase();
  const status = qs("#codeStatus");
  if (!/^[A-Z2-7]{5}(-[A-Z2-7]{5}){4}$/.test(code)) {
    status.textContent = "Invalid code format.";
    status.classList.add("text-red-600");
    return;
  }
  status.textContent = "Resolving…";
  status.classList.remove("text-red-600");
  const cid = (loadShareMap())[code];
  if (!cid) {
    status.textContent = "Unknown code (this demo stores codes in your browser).";
    status.classList.add("text-red-600");
    return;
  }
  const ok = await loadFromWeb3(cid);
  if (ok) {
    enterViewer();
  } else {
    status.textContent = "Failed to load CID.";
    status.classList.add("text-red-600");
  }
}

// ---------- Tabs ----------
function switchTab(name) {
  ["overview", "tree", "map", "media", "sources", "reports", "settings"].forEach((n) => {
    qs("#panel-" + n).classList.toggle("hidden", n !== name);
    const btn = qs('.tab[data-tab="' + n + '"]');
    if (btn) btn.classList.toggle("active", n === name);
  });
  if (name === "tree" && !window._treeReady) loadTree();
  if (name === "map" && !window._mapReady) loadMap();
  if (name === "media") renderMedia();
  if (name === "sources") renderSources();
  if (name === "reports") refreshSelectors();
}

// ---------- People (Overview) ----------
function renderPeople() {
  const tbody = qs("#peopleRows");
  tbody.innerHTML = "";
  state.people.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2">${p.name || ""}</td>
      <td class="py-2">${p.sex || ""}</td>
      <td class="py-2 text-slate-500">${(p.birthDate || "")}${p.birthPlace ? " · " + p.birthPlace : ""}</td>
      <td class="py-2 text-slate-500">${(p.deathDate || "")}${p.deathPlace ? " · " + p.deathPlace : ""}</td>
      <td class="py-2 text-right">
        <button data-id="${p.id}" class="btnEdit text-indigo-700 mr-3 ${MODE==='viewer'?'opacity-50 pointer-events-none':''}">Edit</button>
        <button data-id="${p.id}" class="btnDel text-rose-600 ${MODE==='viewer'?'opacity-50 pointer-events-none':''}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  qsa(".btnEdit").forEach((b) => b.addEventListener("click", () => loadToForm(b.getAttribute("data-id"))));
  qsa(".btnDel").forEach((b) =>
    b.addEventListener("click", () => {
      if (MODE !== "owner") return;
      const id = b.getAttribute("data-id");
      if (!confirm("Delete this person?")) return;
      state.people = state.people.filter((x) => x.id !== id);
      state.links = state.links.filter((l) => l.parentId !== id && l.childId !== id);
      state.spouses = state.spouses.filter((pair) => pair[0] !== id && pair[1] !== id);
      saveState(state);
      renderPeople();
      refreshSelectors();
      if (window._treeReady) drawGraph();
      if (window._mapReady) refreshMap();
    })
  );

  // lock hint
  qs("#editLock").classList.toggle("hidden", MODE === "owner");
}
function loadToForm(id) {
  if (MODE !== "owner") return;
  const p = state.people.find((x) => x.id === id);
  if (!p) return;
  qs("#pId").value = p.id;
  qs("#pName").value = p.name || "";
  qs("#pSex").value = p.sex || "";
  qs("#pBirthDate").value = p.birthDate || "";
  qs("#pBirthPlace").value = p.birthPlace || "";
  qs("#pDeathDate").value = p.deathDate || "";
  qs("#pDeathPlace").value = p.deathPlace || "";
  qs("#pResidencePlace").value = p.residencePlace || "";
}
function clearForm() { ["pId","pName","pSex","pBirthDate","pBirthPlace","pDeathDate","pDeathPlace","pResidencePlace"].forEach(id => { const el = qs("#"+id); if (el) el.value = ""; }); }
async function locatePlaces() {
  const birth = qs("#pBirthPlace").value.trim();
  const resi  = qs("#pResidencePlace").value.trim();
  if (birth) await geocodePlace(birth);
  if (resi)  await geocodePlace(resi);
  alert("Locations looked up. Click Save to persist.");
}
function savePerson() {
  if (MODE !== "owner") return;
  const id = qs("#pId").value || uid();
  const person = {
    id,
    name: (qs("#pName").value || "").trim() || "Unnamed",
    sex: qs("#pSex").value || "",
    birthDate: (qs("#pBirthDate").value || "").trim(),
    birthPlace: (qs("#pBirthPlace").value || "").trim(),
    deathDate: (qs("#pDeathDate").value || "").trim(),
    deathPlace: (qs("#pDeathPlace").value || "").trim(),
    residencePlace: (qs("#pResidencePlace").value || "").trim(),
  };
  const idx = state.people.findIndex((x) => x.id === id);
  if (idx >= 0) state.people[idx] = person; else state.people.push(person);
  saveState(state);
  renderPeople();
  refreshSelectors();
  if (window._treeReady) drawGraph();
  if (window._mapReady) refreshMap();
  clearForm();
}

// ---------- JSON backup ----------
function exportJSON() {
  const a = document.createElement("a");
  a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  a.download = "genesis-gates.json";
  a.click();
}
function importJSON(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      state = Object.assign(state, data);
      saveState(state);
      renderPeople();
      refreshSelectors();
      if (window._treeReady) drawGraph();
      if (window._mapReady) refreshMap();
      alert("Import complete.");
    } catch {
      alert("Invalid JSON file.");
    }
  };
  r.readAsText(f);
}

// ---------- GEDCOM ----------
function exportGEDCOM() {
  const xref = {};
  state.people.forEach((p, i) => (xref[p.id] = `@I${i + 1}@`));
  const lines = [];
  lines.push("0 HEAD","1 SOUR GenesisGates","1 GEDC","2 VERS 5.5.1","2 FORM LINEAGE-LINKED","1 CHAR UTF-8");
  state.people.forEach((p) => {
    lines.push(`0 ${xref[p.id]} INDI`);
    if (p.name) lines.push(`1 NAME ${p.name}`);
    if (p.sex) lines.push(`1 SEX ${p.sex}`);
    if (p.birthDate || p.birthPlace) { lines.push("1 BIRT"); if (p.birthDate) lines.push("2 DATE " + p.birthDate); if (p.birthPlace) lines.push("2 PLAC " + p.birthPlace); }
    if (p.deathDate || p.deathPlace) { lines.push("1 DEAT"); if (p.deathDate) lines.push("2 DATE " + p.deathDate); if (p.deathPlace) lines.push("2 PLAC " + p.deathPlace); }
    if (p.residencePlace) { lines.push("1 RESI", "2 PLAC " + p.residencePlace); }
  });
  const fams = [];
  const seen = new Map();
  const key = (a, b) => [a, b].sort().join("|");
  state.spouses.forEach(([a, b]) => {
    const k = key(a, b);
    if (!seen.has(k)) { seen.set(k, fams.length); fams.push({ husb: a, wife: b, children: [] }); }
  });
  state.links.forEach((l) => {
    fams.forEach((f) => {
      if (l.parentId === f.husb || l.parentId === f.wife) {
        if (!f.children.includes(l.childId)) f.children.push(l.childId);
      }
    });
  });
  fams.forEach((f, i) => {
    const fid = `@F${i + 1}@`;
    lines.push(`0 ${fid} FAM`);
    if (f.husb) lines.push(`1 HUSB ${xref[f.husb] || ""}`);
    if (f.wife) lines.push(`1 WIFE ${xref[f.wife] || ""}`);
    f.children.forEach((c) => lines.push(`1 CHIL ${xref[c] || ""}`));
  });
  lines.push("0 TRLR");
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(lines.join("\n"));
  a.download = "genesis-gates.ged";
  a.click();
}
function onGEDFile(e) {
  if (MODE !== "owner") { alert("Log in to import."); e.target.value=""; return; }
  if (state.people.length && !confirm("Importing will REPLACE current data. Continue?")) { e.target.value=""; return; }
  importGEDCOM(e);
}
function importGEDCOM(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const lines = r.result.split(/\r?\n/);
    const inds = {};
    const fams = [];
    let current = null, type = null;
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      const m = line.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z0-9_]+)?\s*(.*)?$/);
      if (!m) return;
      const level = +m[1], xref = m[2] || null, tag = m[3] || "", data = (m[4] || "").trim();
      if (level === 0 && xref && tag === "INDI") { current = { id: xref, data: {} }; type = "INDI"; inds[xref] = current.data; }
      else if (level === 0 && xref && tag === "FAM") { current = { id: xref, data: { children: [] } }; type = "FAM"; fams.push(current.data); }
      else if (type === "INDI") {
        if (tag === "NAME") current.data.name = data;
        else if (tag === "SEX") current.data.sex = data;
        else if (tag === "BIRT") { current._birt = true; current._deat = current._resi = false; }
        else if (tag === "DEAT") { current._deat = true; current._birt = current._resi = false; }
        else if (tag === "RESI") { current._resi = true; current._birt = current._deat = false; }
        else if (tag === "DATE") { if (current._birt) current.data.birthDate = data; if (current._deat) current.data.deathDate = data; }
        else if (tag === "PLAC") { if (current._birt) current.data.birthPlace = data; if (current._deat) current.data.deathPlace = data; if (current._resi) current.data.residencePlace = data; }
        else if (level === 1) { current._birt = current._deat = current._resi = false; }
      } else if (type === "FAM") {
        if (tag === "HUSB") current.data.husb = data;
        else if (tag === "WIFE") current.data.wife = data;
        else if (tag === "CHIL") current.data.children.push(data);
      }
    });
    const idMap = {}; const people = [];
    Object.keys(inds).forEach((x) => { const p = Object.assign({ id: uid() }, inds[x]); idMap[x] = p.id; people.push(p); });
    const links = []; const spouses = [];
    fams.forEach((f) => {
      const a = idMap[f.husb], b = idMap[f.wife];
      if (a && b) spouses.push([a, b]);
      (f.children || []).forEach((c0) => {
        const c = idMap[c0];
        if (c && a) links.push({ parentId: a, childId: c });
        if (c && b) links.push({ parentId: b, childId: c });
      });
    });
    state.people = people; state.links = links; state.spouses = spouses;
    saveState(state);
    renderPeople(); refreshSelectors();
    if (window._treeReady) drawGraph();
    if (window._mapReady) refreshMap();
    alert("GEDCOM imported.");
  };
  r.readAsText(f);
}

// ---------- Geocoding ----------
async function geocodePlace(place) {
  if (!place) return null;
  const key = place.trim();
  if (state.geoCache && state.geoCache[key]) return state.geoCache[key];
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(key);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const arr = await res.json();
    if (arr && arr[0]) {
      const out = { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
      state.geoCache = state.geoCache || {};
      state.geoCache[key] = out;
      saveState(state);
      return out;
    }
  } catch {}
  return null;
}
async function locateAll() {
  for (const p of state.people) {
    if (p.birthPlace && (!p.bLat || !p.bLon)) {
      const r = await geocodePlace(p.birthPlace); if (r) { p.bLat = r.lat; p.bLon = r.lon; }
    }
    if (p.residencePlace && (!p.rLat || !p.rLon)) {
      const r2 = await geocodePlace(p.residencePlace); if (r2) { p.rLat = r2.lat; p.rLon = r2.lon; }
    }
  }
  saveState(state);
}
async function locatePlaces() {
  if (MODE !== "owner") return;
  await locateAll();
  if (window._mapReady) refreshMap();
}

// ---------- Tree (D3) ----------
let d3Loaded = false, svg, g, zoom, diagramMode = "tree";
const collapsed = new Set();

async function loadTree() {
  await loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");
  d3Loaded = true; window._treeReady = true;

  const host = qs("#treeHost"); host.innerHTML = "";
  svg = d3.select(host).append("svg").attr("width", "100%").attr("height", "100%");
  g = svg.append("g");
  zoom = d3.zoom().scaleExtent([0.3, 2.5]).on("zoom", (evt) => g.attr("transform", evt.transform));
  svg.call(zoom);

  qs("#btnFitTree").addEventListener("click", fitGraph);
  qs("#btnCenterTree").addEventListener("click", () => centerGraph(0.9));
  qs("#btnResetTree").addEventListener("click", () => { collapsed.clear(); drawGraph(); fitGraph(); });
  qs("#btnTreeSearch").addEventListener("click", () => { const q = qs("#treeSearch").value.trim(); if (q) focusByName(q); });
  qs("#treeSearch").addEventListener("keydown", (e) => e.key === "Enter" && qs("#btnTreeSearch").click());
  qsa('input[name="diagram"]').forEach((r) => r.addEventListener("change", (e) => { diagramMode = e.target.value; drawGraph(); fitGraph(); }));

  drawGraph(); fitGraph();
}
function personById(id){ return state.people.find(p => p.id === id); }
function childrenOf(id){ return Array.from(new Set(state.links.filter(l=>l.parentId===id).map(l=>l.childId))).map(personById).filter(Boolean); }
function buildHierarchy(rootId, visited=new Set()) {
  const me = personById(rootId); if (!me || visited.has(rootId)) return null; visited.add(rootId);
  const kids = childrenOf(rootId).map(ch => buildHierarchy(ch.id, visited)).filter(Boolean);
  return { id: me.id, name: me.name, _collapsed: collapsed.has(me.id), children: kids };
}
function refreshSelectors() {
  const selA = qs("#reportRootA"), selD = qs("#reportRootD"), rootSel = qs("#rootSelect");
  [selA, selD, rootSel].forEach(sel => {
    if (!sel) return;
    const v = sel.value;
    sel.innerHTML = "";
    state.people.forEach(p => {
      const opt = document.createElement("option"); opt.value = p.id; opt.textContent = p.name; sel.appendChild(opt);
    });
    if (v) sel.value = v;
  });
}
function drawGraph() {
  if (!d3Loaded) return;
  const rootId = (qs("#rootSelect") && qs("#rootSelect").value) || (state.people[0] && state.people[0].id);
  const data = buildHierarchy(rootId) || { name: "(empty)" };
  g.selectAll("*").remove();
  if (diagramMode === "tree") drawTree(data); else drawCircles(data);
}
function drawTree(data) {
  const host = qs("#treeHost"); const { width, height } = host.getBoundingClientRect();
  const root = d3.hierarchy(data, d => (d._collapsed ? null : d.children));
  const nodeW = (state.opts.large ? 200 : 160), nodeH = (state.opts.large ? 60 : 44);
  const hgap = (state.opts.large ? 60 : 40), vgap = (state.opts.large ? 90 : 70);
  const layout = d3.tree().nodeSize([vgap, nodeW + hgap]);
  layout(root);

  const curved = state.opts.curved !== false;
  const linkGen = curved
    ? d3.linkHorizontal().x(d => d.y + 80).y(d => d.x)
    : (d) => `M${d.source.y+80},${d.source.x} L${d.target.y+80},${d.target.x}`;

  g.selectAll("path.link").data(root.links()).enter().append("path")
    .attr("class","link").attr("d", linkGen).attr("fill","none").attr("stroke","#D1D5DB").attr("stroke-width",2);

  const nodes = g.selectAll("g.node").data(root.descendants()).enter().append("g").attr("class","node")
    .attr("transform", d => `translate(${d.y+80},${d.x - nodeH/2})`);

  nodes.append("rect").attr("rx",12).attr("ry",12).attr("width", nodeW).attr("height", nodeH)
    .attr("fill","#fff").attr("stroke","#E5E7EB").attr("filter","drop-shadow(0 6px 20px rgba(0,0,0,.08))");

  nodes.append("circle").attr("cx", 16).attr("cy", nodeH/2).attr("r", 10).attr("fill","#E0E7FF");
  nodes.append("text").attr("x",16).attr("y", nodeH/2+4).attr("text-anchor","middle").attr("font-size","10px").attr("fill","#111827")
    .text(d => (d.data.name||'?').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase());

  nodes.append("text").attr("x", 36).attr("y", nodeH/2+4).attr("font-size","12px").attr("fill","#111827").style("cursor","pointer")
    .text(d => d.data.name).on("click", (e,d) => { if (collapsed.has(d.data.id)) collapsed.delete(d.data.id); else collapsed.add(d.data.id); drawGraph(); });

  if (MODE === "owner") {
    nodes.append("text").attr("x", nodeW-52).attr("y", 14).attr("font-size","11px").attr("fill","#16A34A").style("cursor","pointer").text("+P").on("click", (e,d)=> addParent(d.data.id));
    nodes.append("text").attr("x", nodeW-24).attr("y", 14).attr("font-size","11px").attr("fill","#5850EC").style("cursor","pointer").text("+C").on("click", (e,d)=> addChild(d.data.id));
    nodes.append("text").attr("x", nodeW-86).attr("y", 14).attr("font-size","11px").attr("fill","#374151").style("cursor","pointer").text("+S").on("click", (e,d)=> addSpouse(d.data.id));
  }
}
function drawCircles(data) {
  const host = qs("#treeHost"); const { width, height } = host.getBoundingClientRect();
  const root = d3.hierarchy(data, d => (d._collapsed ? null : d.children));
  const radius = Math.min(width, height) / 2 - 40;
  const cluster = d3.cluster().size([2*Math.PI, radius]); cluster(root);
  const cx = width/2, cy = height/2;

  const lineGen = d3.linkRadial().angle(d=>d.x).radius(d=>d.y);
  g.selectAll("path.rlink").data(root.links()).enter().append("path")
    .attr("class","rlink").attr("d", lineGen).attr("transform", `translate(${cx},${cy})`)
    .attr("fill","none").attr("stroke","#D1D5DB").attr("stroke-width",2);

  const nodes = g.selectAll("g.rnode").data(root.descendants()).enter().append("g").attr("class","rnode")
    .attr("transform", d=>`translate(${cx + Math.cos(d.x - Math.PI/2)*d.y}, ${cy + Math.sin(d.x - Math.PI/2)*d.y})`);

  nodes.append("circle").attr("r", 14).attr("fill","#fff").attr("stroke","#E5E7EB");
  nodes.append("text").attr("y", -18).attr("text-anchor","middle").attr("font-size","11px").attr("fill","#111827").text(d=>d.data.name);

  if (MODE === "owner") {
    nodes.append("text").attr("x", -20).attr("y", 4).attr("font-size","11px").attr("fill","#16A34A").style("cursor","pointer").text("+P").on("click",(e,d)=>addParent(d.data.id));
    nodes.append("text").attr("x", 4).attr("y", 4).attr("font-size","11px").attr("fill","#5850EC").style("cursor","pointer").text("+C").on("click",(e,d)=>addChild(d.data.id));
    nodes.append("text").attr("x", -6).attr("y", 20).attr("font-size","11px").attr("fill","#374151").style("cursor","pointer").text("+S").on("click",(e,d)=>addSpouse(d.data.id));
  }
}
function fitGraph() {
  const host = qs("#treeHost"); const svgEl = host.querySelector("svg"); if (!svgEl) return;
  const bb = g.node().getBBox(); const margin = 40;
  const { width, height } = host.getBoundingClientRect();
  const scale = Math.max(0.3, Math.min(2.5, Math.min((width-margin)/bb.width, (height-margin)/bb.height)));
  const tx = (width - bb.width*scale)/2 - bb.x*scale;
  const ty = (height - bb.height*scale)/2 - bb.y*scale;
  d3.select(svgEl).transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}
function centerGraph(scale=0.9) {
  const host = qs("#treeHost"); const svgEl = host.querySelector("svg"); if (!svgEl) return;
  const { width, height } = host.getBoundingClientRect();
  d3.select(svgEl).transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(width*0.05, height*0.05).scale(scale));
}
function focusByName(q) {
  if (!q) return;
  const p = state.people.find(pp => (pp.name||"").toLowerCase().includes(q.toLowerCase()));
  if (!p) return alert("No match");
  // (future: center on node by layout coords)
  fitGraph();
}
function addChild(parentId) {
  if (MODE !== "owner") return;
  const child = { id: uid(), name: "New Child" };
  state.people.push(child);
  state.links.push({ parentId, childId: child.id });
  saveState(state); renderPeople(); refreshSelectors(); if (window._treeReady) drawGraph();
}
function addParent(childId) {
  if (MODE !== "owner") return;
  const parent = { id: uid(), name: "New Parent" };
  state.people.push(parent);
  state.links.push({ parentId: parent.id, childId: childId });
  saveState(state); renderPeople(); refreshSelectors(); if (window._treeReady) drawGraph();
}
function addSpouse(aId) {
  if (MODE !== "owner") return;
  const partner = { id: uid(), name: "New Partner" };
  state.people.push(partner);
  state.spouses.push([aId, partner.id]);
  saveState(state); renderPeople(); refreshSelectors(); if (window._treeReady) drawGraph();
}

// ---------- Map (Leaflet + heat + arcs) ----------
let map, heatLayer, arcLayerGroup;
async function loadMap() {
  await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  await loadScript("https://unpkg.com/leaflet.heat/dist/leaflet-heat.js");
  initMap();
  window._mapReady = true;
}
function initMap() {
  map = L.map("map", { zoomAnimation: true, scrollWheelZoom: true }).setView([30, 10], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 10, attribution: "© OpenStreetMap" }).addTo(map);
  heatLayer = L.heatLayer([], { radius: 22, blur: 18, maxZoom: 10 }).addTo(map);
  arcLayerGroup = L.layerGroup().addTo(map);
  refreshMap();
  qs("#chkHeat").addEventListener("change", () => { if (qs("#chkHeat").checked) heatLayer.addTo(map); else map.removeLayer(heatLayer); });
  qs("#chkArcs").addEventListener("change", () => { if (qs("#chkArcs").checked) arcLayerGroup.addTo(map); else map.removeLayer(arcLayerGroup); });
  qs("#btnGeoAll").addEventListener("click", async () => { qs("#geoStatus").textContent = "Geocoding…"; await locateAll(); refreshMap(); qs("#geoStatus").textContent = "Done."; setTimeout(()=>qs("#geoStatus").textContent="", 1500); });
}
function refreshMap() {
  if (!heatLayer || !arcLayerGroup) return;
  const pts = []; arcLayerGroup.clearLayers();
  state.people.forEach(p => {
    const rLat = parseFloat(p.rLat), rLon = parseFloat(p.rLon);
    const bLat = parseFloat(p.bLat), bLon = parseFloat(p.bLon);
    if (Number.isFinite(rLat) && Number.isFinite(rLon)) pts.push([rLat, rLon, 0.7]);
    if (qs("#chkArcs").checked && Number.isFinite(rLat) && Number.isFinite(rLon) && Number.isFinite(bLat) && Number.isFinite(bLon)) {
      L.polyline([[bLat, bLon], [rLat, rLon]], { color: "#6D28D9", weight: 2, opacity: 0.85 }).addTo(arcLayerGroup);
    }
  });
  heatLayer.setLatLngs(pts);
}

// ---------- Media ----------
function renderMedia() {
  const grid = qs("#mediaGrid"); grid.innerHTML = "";
  (state.media || []).forEach((m) => {
    const div = document.createElement("div");
    div.className = "rounded-xl overflow-hidden border";
    div.innerHTML = `<img src="${m.url}" class="w-full h-32 object-cover"><div class="p-2 text-xs">${m.caption || ""}</div>`;
    grid.appendChild(div);
  });
  const file = qs("#fileMedia");
  if (!file._bound) {
    file._bound = true;
    file.addEventListener("change", (e) => {
      if (MODE !== "owner") return alert("Log in to add media.");
      const files = e.target.files || [];
      Array.from(files).forEach((f) => {
        const url = URL.createObjectURL(f);
        state.media.push({ url, caption: f.name });
      });
      saveState(state);
      renderMedia();
    });
  }
}

// ---------- Sources ----------
function renderSources() {
  const list = qs("#sourceList"); list.innerHTML = "";
  (state.sources || []).forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "rounded-xl border p-3";
    div.innerHTML = `<div class="text-sm font-medium">${s.title || "Source " + (i + 1)}</div><div class="text-xs text-slate-500">${s.detail || ""}</div>`;
    list.appendChild(div);
  });
  const btnAdd = qs("#btnAddSource");
  if (!btnAdd._bound) {
    btnAdd._bound = true;
    btnAdd.addEventListener("click", () => {
      if (MODE !== "owner") return alert("Log in to add sources.");
      const title = prompt("Source title");
      const detail = prompt("Details / citation / URL");
      state.sources = state.sources || [];
      state.sources.push({ title, detail });
      saveState(state);
      renderSources();
    });
  }
  const btnExp = qs("#btnExportSources");
  if (!btnExp._bound) {
    btnExp._bound = true;
    btnExp.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.sources || [], null, 2));
      a.download = "genesis-gates-sources.json";
      a.click();
    });
  }
}

// ---------- Reports ----------
function generateReport(kind) {
  let out = "";
  if (kind === "ancestor") {
    const root = qs("#reportRootA").value;
    const lines = [];
    const parentsOf = (id) => Array.from(new Set(state.links.filter(l => l.childId === id).map(l => l.parentId)));
    const walk = (id, depth = 0) => { const p = personById(id); if (!p) return; lines.push("  ".repeat(depth) + "• " + (p.name || "Unnamed") + (p.birthDate ? ` (b. ${p.birthDate})` : "")); parentsOf(id).forEach(pid => walk(pid, depth + 1)); };
    walk(root, 0); out = lines.join("\n");
  } else if (kind === "descendant") {
    const root = qs("#reportRootD").value;
    const lines = [];
    const kids = (id) => Array.from(new Set(state.links.filter(l => l.parentId === id).map(l => l.childId)));
    const walk = (id, depth = 0) => { const p = personById(id); if (!p) return; lines.push("  ".repeat(depth) + "• " + (p.name || "Unnamed") + (p.birthDate ? ` (b. ${p.birthDate})` : "")); kids(id).forEach(cid => walk(cid, depth + 1)); };
    walk(root, 0); out = lines.join("\n");
  } else if (kind === "timeline") {
    const events = [];
    state.people.forEach(p => { if (p.birthDate) events.push({ date: p.birthDate, what: `Birth — ${p.name}` }); if (p.deathDate) events.push({ date: p.deathDate, what: `Death — ${p.name}` }); });
    events.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    out = events.map(e => `${e.date || "----"}  |  ${e.what}`).join("\n");
  }
  qs("#reportOut").textContent = out || "(No data)";
}

// ---------- Settings ----------
function bindSettings() {
  const large = qs("#optLargeNodes"), spouses = qs("#optShowSpouses"), curved = qs("#optCurvedLinks");
  large.checked  = !!state.opts.large;
  spouses.checked = state.opts.spouses !== false;
  curved.checked  = state.opts.curved !== false;

  large.onchange = () => { state.opts.large = large.checked; saveState(state); if (window._treeReady) drawGraph(); };
  spouses.onchange = () => { state.opts.spouses = spouses.checked; saveState(state); if (window._treeReady) drawGraph(); };
  curved.onchange = () => { state.opts.curved = curved.checked; saveState(state); if (window._treeReady) drawGraph(); };
}

// ---------- Utils ----------
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script"); s.src = src; s.defer = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

// ---------- D3 helpers
function personById(id) { return state.people.find(p => p.id === id); }

// ---------- Web3.Storage (IPFS) ----------
async function publishToWeb3(silent=false) {
  const token = localStorage.getItem(KEY_W3S);
  if (!token) { if(!silent) alert("Save your Web3.Storage token first."); return null; }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const cid = await uploadViaHTTP(token, blob, "genesis-gates.json");
  if (!silent) alert("Published to IPFS.\nCID: " + cid);
  return cid;
}
async function loadFromWeb3(cid) {
  try {
    const url = `https://w3s.link/ipfs/${cid}/genesis-gates.json`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    state = Object.assign(state, data);
    saveState(state);
    renderPeople(); refreshSelectors();
    if (window._treeReady) drawGraph();
    if (window._mapReady) refreshMap();
    return true;
  } catch {
    return false;
  }
}
// Minimal HTTP upload (no SDK) using Web3.Storage "car-less" API
async function uploadViaHTTP(token, fileBlob, filename) {
  const form = new FormData();
  form.append("file", fileBlob, filename);
  const res = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  const out = await res.json();
  return out?.cid;
}
