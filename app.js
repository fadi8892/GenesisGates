/* Genesis Gates — mobile-optimized core app (v1.1)
   Additions in this build:
   - Per-identity local storage (wallet/guest scoped)
   - New Profiles tab with full-page person profile + deep links (hash routing)
   - Quick Edit: "Open Profile" button
   - Tree reliability tweaks (redraw+fit on show/resize/root change)
   - Map popups: Open Profile action
   - Hide deprecated tabs (Media / Sources / Reports) if present in HTML
   - Snapshot/AI placeholders (UI only; no network calls here)

   This file is drop-in for index.html you shared. It dynamically inserts the
   Profiles and AI tabs/panels if they don’t exist yet, so you don’t need to
   edit HTML to see them.
*/

(function () {
  // ---------- helpers ----------
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  // ---------- storage (per identity) ----------
  const BASE = "gg:pro:v3:mobile:full"; // base namespace
  const LAST_KEY = BASE + ":lastIdentity"; // remembers last used identity
  const idOrGuest = (addr) => (addr && typeof addr === "string" ? addr : "guest@local");
  const storageKeyFor = (addr) => `${BASE}:${idOrGuest(addr)}`;

  const loadByAddress = (addr) => {
    try {
      return JSON.parse(localStorage.getItem(storageKeyFor(addr))) || null;
    } catch {
      return null;
    }
  };
  const saveByAddress = (addr, data) => {
    localStorage.setItem(storageKeyFor(addr), JSON.stringify(data));
    localStorage.setItem(LAST_KEY, idOrGuest(addr));
  };

  const lastIdentity = localStorage.getItem(LAST_KEY) || "guest@local";

  // base/default state
  const makeDefaultState = () => ({
    session: { wallet: lastIdentity && lastIdentity !== "guest@local" ? { address: lastIdentity } : null },
    people: [],
    links: [], // { parentId, childId }
    spouses: [], // [id1, id2]
    geoCache: {}, // { "Place": {lat,lon} }
    personExtras: {}, // { [id]: { notes, facts, links, media: [] } }
    ui: { lastTab: "overview" }
  });

  let state = loadByAddress(lastIdentity) || makeDefaultState();

  // seed demo on first run for this identity
  if ((state.people || []).length === 0) {
    const a = { id: uid(), name: "Alex Pioneer", sex: "M", birthPlace: "Baghdad, Iraq", residencePlace: "San Diego, USA" };
    const b = { id: uid(), name: "Brianna Pioneer", sex: "F", birthPlace: "Erbil, Iraq", residencePlace: "Phoenix, USA" };
    const c = { id: uid(), name: "Child A", sex: "M", birthPlace: "San Diego, USA", residencePlace: "Austin, USA" };
    state.people = [a, b, c];
    state.spouses = [[a.id, b.id]];
    state.links = [ { parentId: a.id, childId: c.id }, { parentId: b.id, childId: c.id } ];
    saveByAddress(state.session.wallet?.address, state);
  }

  // save/load bound to *current* identity
  const save = () => saveByAddress(state.session?.wallet?.address, state);

  // ---------- DOM bootstrap (adds missing tabs/panels if needed) ----------
  function ensureExtraTabs() {
    const tabsRow = document.querySelector(".flex.md\\:grid.md\\:grid-cols-7.gap-2, .flex.gap-2");

    // Hide deprecated tabs if present
    ["media", "sources", "reports"].forEach((k) => {
      const btn = document.querySelector(`.tab[data-tab="${k}"]`);
      const panel = qs(`#panel-${k}`);
      if (btn) btn.classList.add("hidden");
      if (panel) panel.classList.add("hidden");
    });

    // Insert Profiles tab if missing
    if (!document.querySelector('.tab[data-tab="profiles"]')) {
      const btn = document.createElement("button");
      btn.className = "tab shrink-0 rounded-2xl border px-4 py-2 bg-white";
      btn.dataset.tab = "profiles";
      btn.textContent = "Profiles";
      tabsRow && tabsRow.appendChild(btn);
    }

    // Insert AI tab if missing (placeholder UI)
    if (!document.querySelector('.tab[data-tab="ai"]')) {
      const btn = document.createElement("button");
      btn.className = "tab shrink-0 rounded-2xl border px-4 py-2 bg-white";
      btn.dataset.tab = "ai";
      btn.textContent = "AI";
      tabsRow && tabsRow.appendChild(btn);
    }

    // Insert profiles panel if missing
    if (!qs("#panel-profiles")) {
      const sec = document.createElement("div");
      sec.id = "panel-profiles";
      sec.className = "mt-6 hidden";
      sec.innerHTML = `
        <div class="rounded-2xl bg-white border shadow-sm p-5">
          <div id="profileView" class="min-h-[200px] text-zinc-500">Open a profile from Overview/Tree/Map, or paste an ID.</div>
        </div>`;
      qs("#app").appendChild(sec);
    }

    // Insert AI panel if missing
    if (!qs("#panel-ai")) {
      const sec = document.createElement("div");
      sec.id = "panel-ai";
      sec.className = "mt-6 hidden";
      sec.innerHTML = `
        <div class="rounded-2xl bg-white border shadow-sm p-5">
          <div class="font-medium mb-2">Ask the Tree</div>
          <div class="flex gap-2 mb-4">
            <input id="aiQ" class="border rounded-xl px-3 py-2 flex-1" placeholder="e.g., How is Alex related to Brianna?">
            <button id="btnAskAI" class="rounded-xl border px-4 py-2">Ask</button>
          </div>
          <div id="aiAns" class="text-sm text-zinc-700"></div>
        </div>`;
      qs("#app").appendChild(sec);
    }
  }

  // ---------- app bootstrap ----------
  document.addEventListener("DOMContentLoaded", () => {
    ensureExtraTabs();

    // sign in (wallet/guest)
    qs("#btnWallet").onclick = async () => {
      let addr = null;
      if (window.ethereum && window.ethereum.request) {
        try {
          const ac = await window.ethereum.request({ method: "eth_requestAccounts" });
          addr = ac && ac[0];
        } catch {}
      }
      if (!addr) addr = "guest@local";

      // switch identity: load existing state if present, else keep current and set wallet
      const loaded = loadByAddress(addr);
      if (loaded) {
        state = loaded;
        state.session.wallet = { address: addr };
      } else {
        state.session.wallet = { address: addr };
      }
      save();
      enter();
    };

    qs("#btnLogout").onclick = () => {
      state.session.wallet = null;
      save();
      hide(qs("#app"));
      show(qs("#landing"));
    };

    // Non-critical buttons
    const btnOwner = qs("#btnOwner");
    const btnShowAccess = qs("#btnShowAccess");
    if (btnOwner)
      btnOwner.onclick = () => alert("Owner Mode is a placeholder. In production this would verify your wallet signature and unlock admin actions.");
    if (btnShowAccess)
      btnShowAccess.onclick = () => alert("Access code feature is coming next build.");

    if (state.session.wallet) enter();
  });

  function enter() {
    hide(qs("#landing"));
    show(qs("#app"));
    qs("#userBadge").textContent = "Signed in as " + (state.session.wallet.address || "guest");
    bindUI();
    renderPeople();
    refreshSelectors();
    // try deep link route if present
    setTimeout(handleHashRoute, 0);
  }

  function bindUI() {
    // Tabs (dynamic; attach each time in case we injected new ones)
    qsa(".tab").forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));

    // Overview actions
    const fileJSON = qs("#fileImportJSON");
    const fileGED = qs("#fileImportGED");
    qs("#btnExportTip").onclick = exportGED;
    qs("#btnExportJSON").onclick = exportJSON;
    if (fileJSON) fileJSON.onchange = importJSON;
    qs("#btnExportGED").onclick = exportGED;
    if (fileGED)
      fileGED.onchange = (e) => {
        if (state.people.length && !confirm("Importing a GEDCOM will replace your current tree.\nPlease export a backup first.\n\nContinue?")) {
          e.target.value = "";
          return;
        }
        importGED(e);
      };

    // People form
    qs("#btnSavePerson").onclick = savePerson;
    qs("#btnClearForm").onclick = clearForm;
    qs("#btnLocatePlaces").onclick = async () => {
      if (qs("#pBirthPlace").value) await geocode(qs("#pBirthPlace").value);
      if (qs("#pResidencePlace").value) await geocode(qs("#pResidencePlace").value);
      alert("Locations looked up. Click Save to persist them with the person.");
    };

    // Quick modal
    qs("#btnQuickClose").onclick = () => hide(qs("#quickModal"));

    // Resize refit for the tree
    let t;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (window._treeReady) {
          drawGraph();
          setTimeout(() => { try { fitGraph(); } catch {} }, 0);
        }
      }, 150);
    });

    // AI tab stub (local processing only for now)
    const ask = qs("#btnAskAI");
    if (ask) ask.onclick = runLocalAI;

    // hash routing
    window.addEventListener("hashchange", handleHashRoute);
  }

  function panelsList() {
    // Build from DOM so we don’t depend on hard-coded names
    return qsa("[id^=panel-]").map((el) => el.id.replace("panel-", ""));
  }

  function switchTab(name) {
    const panels = panelsList();
    panels.forEach((id) => {
      const active = id === name;
      qs("#panel-" + id)?.classList.toggle("hidden", !active);
      qs(`.tab[data-tab="${id}"]`)?.classList.toggle("active", active);
    });
    state.ui = state.ui || {}; state.ui.lastTab = name; save();
    if (name === "tree" && !window._treeReady) initTree();
    if (name === "map" && !window._mapReady) initMap();
    if (name === "profiles") handleHashRoute();
  }

  // ---------- People CRUD ----------
  function renderPeople() {
    const tb = qs("#peopleRows");
    if (!tb) return;
    tb.innerHTML = "";
    state.people.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2">
          <button class="underline text-left" data-quick="${p.id}">${escapeHtml(p.name || "")}</button>
        </td>
        <td>${p.sex || ""}</td>
        <td class="text-zinc-500">${p.birthDate || ""}${p.birthPlace ? " · " + escapeHtml(p.birthPlace) : ""}</td>
        <td class="text-zinc-500">${p.deathDate || ""}${p.deathPlace ? " · " + escapeHtml(p.deathPlace) : ""}</td>
        <td class="text-right">
          <button data-edit="${p.id}" class="text-blue-600 mr-3">Edit</button>
          <button data-del="${p.id}" class="text-red-600">Delete</button>
        </td>`;
      tb.appendChild(tr);
    });
    qsa("[data-edit]").forEach((b) => (b.onclick = () => loadToForm(b.dataset.edit)));
    qsa("[data-del]").forEach((b) => (b.onclick = () => delPerson(b.dataset.del)));
    qsa("[data-quick]").forEach((b) => (b.onclick = () => openQuick(b.dataset.quick)));
  }

  function loadToForm(id) {
    const p = state.people.find((x) => x.id === id);
    if (!p) return;
    set("pId", p.id); set("pName", p.name); set("pSex", p.sex);
    set("pBirthDate", p.birthDate); set("pBirthPlace", p.birthPlace);
    set("pDeathDate", p.deathDate); set("pDeathPlace", p.deathPlace);
    set("pResidencePlace", p.residencePlace);
  }

  function set(id, v) { const el = qs("#" + id); if (el) el.value = v || ""; }

  function clearForm() {
    ["pId","pName","pSex","pBirthDate","pBirthPlace","pDeathDate","pDeathPlace","pResidencePlace"].forEach((i) => set(i, ""));
  }

  function delPerson(id) {
    if (!confirm("Delete this person?")) return;
    state.people = state.people.filter((x) => x.id !== id);
    state.links = state.links.filter((l) => l.parentId !== id && l.childId !== id);
    state.spouses = state.spouses.filter((pr) => pr[0] !== id && pr[1] !== id);
    delete state.personExtras[id];
    save();
    renderPeople();
    redraw();
  }

  function savePerson() {
    const id = qs("#pId").value || uid();
    const p = {
      id,
      name: (qs("#pName").value || "").trim() || "Unnamed",
      sex: qs("#pSex").value || "",
      birthDate: (qs("#pBirthDate").value || "").trim(),
      birthPlace: (qs("#pBirthPlace").value || "").trim(),
      deathDate: (qs("#pDeathDate").value || "").trim(),
      deathPlace: (qs("#pDeathPlace").value || "").trim(),
      residencePlace: (qs("#pResidencePlace").value || "").trim(),
    };
    const i = state.people.findIndex((x) => x.id === id);
    if (i >= 0) state.people[i] = p; else state.people.push(p);
    state.personExtras[id] = state.personExtras[id] || { notes: "", facts: "", links: "", media: [] };
    save();
    renderPeople();
    refreshSelectors();
    redraw();
    clearForm();
  }

  // ---------- Quick Edit ----------
  let currentQuickId = null;

  function ensureQuickOpenProfileButton() {
    let openBtn = qs("#qOpenProfile");
    if (!openBtn) {
      // left column box (Main) is the first .rounded-xl.border.p-3 inside the modal
      const mainBox = qs("#quickModal .rounded-xl.border.p-3");
      if (mainBox) {
        const holder = document.createElement("div");
        holder.className = "mt-2";
        holder.innerHTML = `<button id="qOpenProfile" class="rounded-xl border px-3 py-2 w-full">Open Profile</button>`;
        mainBox.appendChild(holder);
      }
    }
  }

  function goToProfile(personId) {
    location.hash = "#/t/default/p/" + encodeURIComponent(personId);
    switchTab("profiles");
    hide(qs("#quickModal"));
    renderProfile(personId);
  }

  function openQuick(id) {
    currentQuickId = id;
    const p = state.people.find((x) => x.id === id);
    if (!p) return;
    show(qs("#quickModal"));

    // Main fields
    setQ("qName", p.name); setQ("qSex", p.sex);
    setQ("qBirthDate", p.birthDate); setQ("qBirthPlace", p.birthPlace);
    setQ("qResidencePlace", p.residencePlace);
    qs("#nftBadge").textContent = "NFT ID: " + p.id;

    // tabs inside modal
    qsa(".qtab").forEach((b) => { b.onclick = () => quickTab(b.dataset.qt); });
    quickTab("media");

    // extras
    const extras = state.personExtras[id] || (state.personExtras[id] = { notes: "", facts: "", links: "", media: [] });
    qs("#qFacts").value = extras.facts || "";
    qs("#qNotes").value = extras.notes || "";
    qs("#qLinks").value = extras.links || "";
    renderMediaGrid(extras.media);

    // media upload
    const qMedia = qs("#qMedia");
    if (qMedia) qMedia.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        const dataURL = await fileToDataURL(f);
        extras.media.push(dataURL);
      }
      save();
      renderMediaGrid(extras.media);
      qMedia.value = "";
    };

    // locate + save
    qs("#qLocate").onclick = async () => {
      if (valQ("qBirthPlace")) await geocode(valQ("qBirthPlace"));
      if (valQ("qResidencePlace")) await geocode(valQ("qResidencePlace"));
      alert("Locations looked up.");
    };

    qs("#qSave").onclick = () => {
      p.name = valQ("qName") || "Unnamed";
      p.sex = valQ("qSex");
      p.birthDate = valQ("qBirthDate");
      p.birthPlace = valQ("qBirthPlace");
      p.residencePlace = valQ("qResidencePlace");
      extras.facts = qs("#qFacts").value; extras.notes = qs("#qNotes").value; extras.links = qs("#qLinks").value;
      save();
      renderPeople();
      redraw();
      alert("Saved");
    };

    // relation buttons
    qs("#qAddParent").onclick = () => addParent(id);
    qs("#qAddChild").onclick = () => addChild(id);
    qs("#qAddSpouse").onclick = () => addSpouse(id);

    // ensure Open Profile button exists & binds
    ensureQuickOpenProfileButton();
    const openBtn = qs("#qOpenProfile");
    if (openBtn) openBtn.onclick = () => goToProfile(id);
  }

  function quickTab(name) {
    ["media", "facts", "notes", "links"].forEach((k) => {
      qs("#qPanel-" + k)?.classList.toggle("hidden", k !== name);
    });
    qsa(".qtab").forEach((b) => b.classList.toggle("underline", b.dataset.qt === name));
  }

  function setQ(id, v) { const el = qs("#" + id); if (el) el.value = v || ""; }
  function valQ(id) { const el = qs("#" + id); return el ? (el.value || "").trim() : ""; }

  function renderMediaGrid(arr) {
    const grid = qs("#qMediaGrid"); if (!grid) return;
    grid.innerHTML = "";
    arr.forEach((src, i) => {
      const d = document.createElement("div");
      d.className = "relative rounded-lg overflow-hidden border aspect-square bg-zinc-100";
      d.innerHTML = `
        <img src="${src}" class="absolute inset-0 w-full h-full object-cover"/>
        <button class="absolute top-1 right-1 text-[10px] px-2 py-1 bg-white/80 rounded border">Remove</button>`;
      grid.appendChild(d);
      d.querySelector("button").onclick = () => { arr.splice(i, 1); save(); renderMediaGrid(arr); };
    });
  }

  function fileToDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }

  // ---------- Import/Export ----------
  function exportJSON() {
    const a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    a.download = "genesis-gates.json";
    a.click();
  }

  function importJSON(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        Object.assign(state, data);
        save(); renderPeople(); refreshSelectors(); redraw();
        alert("Imported JSON");
      } catch { alert("Invalid JSON"); }
    };
    r.readAsText(f);
  }

  function exportGED() {
    const xref = {}; state.people.forEach((p, i) => (xref[p.id] = "@I" + (i + 1) + "@") );
    const lines = ["0 HEAD","1 SOUR GenesisGates","1 GEDC","2 VERS 5.5.1","2 FORM LINEAGE-LINKED","1 CHAR UTF-8"]; 
    state.people.forEach((p) => {
      lines.push("0 " + xref[p.id] + " INDI");
      if (p.name) lines.push("1 NAME " + p.name);
      if (p.sex) lines.push("1 SEX " + p.sex);
      if (p.birthDate || p.birthPlace) { lines.push("1 BIRT"); if (p.birthDate) lines.push("2 DATE " + p.birthDate); if (p.birthPlace) lines.push("2 PLAC " + p.birthPlace); }
      if (p.deathDate || p.deathPlace) { lines.push("1 DEAT"); if (p.deathDate) lines.push("2 DATE " + p.deathDate); if (p.deathPlace) lines.push("2 PLAC " + p.deathPlace); }
      if (p.residencePlace) { lines.push("1 RESI"); lines.push("2 PLAC " + p.residencePlace); }
    });
    const fams = []; const pairKey = (a,b)=>[a,b].sort().join("|"); const seen = new Map();
    state.spouses.forEach((pr) => { const k = pairKey(pr[0], pr[1]); if (!seen.has(k)) { seen.set(k, fams.length); fams.push({ husb: pr[0], wife: pr[1], children: [] }); } });
    state.links.forEach((l) => { fams.forEach((f) => { if (l.parentId === f.husb || l.parentId === f.wife) { if (!f.children.includes(l.childId)) f.children.push(l.childId); } }); });
    fams.forEach((f, i) => { const fid = "@F" + (i + 1) + "@"; lines.push("0 " + fid + " FAM"); if (f.husb) lines.push("1 HUSB " + (xref[f.husb] || "")); if (f.wife) lines.push("1 WIFE " + (xref[f.wife] || "")); f.children.forEach((cid) => lines.push("1 CHIL " + (xref[cid] || ""))); });
    lines.push("0 TRLR");
    const a = document.createElement("a"); a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(lines.join("\n")); a.download = "genesis-gates.ged"; a.click();
  }

  function importGED(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const lines = r.result.split(/\r?\n/);
      const inds = {}; const fams = []; let current = null; let typ = null;
      lines.forEach((raw) => {
        const m = raw.trim().match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z0-9_]+)?\s*(.*)?$/); if (!m) return;
        const level = +m[1]; const xref = m[2] || null; const tag = m[3] || ""; const data = (m[4] || "").trim();
        if (level === 0 && xref && tag === "INDI") { current = { id: xref, data: {} }; typ = "INDI"; inds[xref] = current.data; }
        else if (level === 0 && xref && tag === "FAM") { current = { id: xref, data: { children: [] } }; typ = "FAM"; fams.push(current.data); }
        else if (typ === "INDI") {
          if (tag === "NAME") current.data.name = data;
          else if (tag === "SEX") current.data.sex = data;
          else if (tag === "BIRT") { current._b = true; current._d = false; current._r = false; }
          else if (tag === "DEAT") { current._d = true; current._b = false; current._r = false; }
          else if (tag === "RESI") { current._r = true; current._b = false; current._d = false; }
          else if (tag === "DATE") { if (current._b) current.data.birthDate = data; if (current._d) current.data.deathDate = data; }
          else if (tag === "PLAC") { if (current._b) current.data.birthPlace = data; if (current._d) current.data.deathPlace = data; if (current._r) current.data.residencePlace = data; }
          else if (level === 1) { current._b = current._d = current._r = false; }
        } else if (typ === "FAM") {
          if (tag === "HUSB") current.data.husb = data; else if (tag === "WIFE") current.data.wife = data; else if (tag === "CHIL") current.data.children.push(data);
        }
      });
      const idMap = {}; const people = [];
      Object.keys(inds).forEach((xref) => { const p = Object.assign({ id: uid() }, inds[xref]); idMap[xref] = p.id; people.push(p); });
      const links = []; const spouses = [];
      fams.forEach((f) => { const a = idMap[f.husb]; const b = idMap[f.wife]; if (a && b) spouses.push([a, b]); (f.children || []).forEach((cxr) => { const c = idMap[cxr]; if (c && a) links.push({ parentId: a, childId: c }); if (c && b) links.push({ parentId: b, childId: c }); }); });
      state.people = people; state.links = links; state.spouses = spouses; save(); renderPeople(); refreshSelectors(); redraw(); alert("GEDCOM imported");
    };
    r.readAsText(f);
  }

  // ---------- Tree (D3) ----------
  let svg, g, zoom, collapsed = new Set();

  function initTree() {
    window._treeReady = true;
    const host = qs("#treeHost"); if (!host) return;
    host.innerHTML = "";
    svg = d3.select(host).append("svg").attr("width", "100%").attr("height", "100%");
    g = svg.append("g");
    zoom = d3.zoom().scaleExtent([0.3, 2.5]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    qs("#btnFitTree").onclick = fitGraph;
    qs("#btnCenterTree").onclick = () => centerGraph(0.95);
    qs("#btnResetTree").onclick = () => { collapsed.clear(); drawGraph(); fitGraph(); };
    qsa('input[name="diagram"]').forEach((r) => (r.onchange = () => { drawGraph(); fitGraph(); }));
    qs("#btnTreeSearch").onclick = () => { const q = qs("#treeSearch").value.trim(); if (q) focusByName(q); };

    // ensure we draw after the panel is visible to get correct layout
    setTimeout(() => { drawGraph(); fitGraph(); }, 0);
  }

  function childrenOf(id) {
    return Array.from(new Set(state.links.filter((l) => l.parentId === id).map((l) => l.childId)))
      .map((pid) => state.people.find((p) => p.id === pid)).filter(Boolean);
  }

  function build(rootId, v = new Set()) {
    const me = state.people.find((p) => p.id === rootId) || state.people[0];
    if (!me || v.has(me.id)) return null; v.add(me.id);
    const kids = childrenOf(me.id).map((ch) => build(ch.id, v)).filter(Boolean);
    return { id: me.id, name: me.name, _c: collapsed.has(me.id), children: kids };
  }

  function drawGraph() {
    const rootSel = qs("#rootSelect");
    if (rootSel && !rootSel.value && state.people[0]) rootSel.value = state.people[0].id;
    const rid = (rootSel && rootSel.value) || (state.people[0] && state.people[0].id);
    const data = build(rid) || { name: "(empty)" };

    g.selectAll("*").remove();

    const host = qs("#treeHost"); host.getBoundingClientRect();
    const root = d3.hierarchy(data, (d) => (d._c ? null : d.children));

    const nodeW = 160, nodeH = 52, hgap = 40, vgap = 76;
    d3.tree().nodeSize([vgap, nodeW + hgap])(root);

    // links
    g.selectAll("path").data(root.links()).enter().append("path")
      .attr("fill", "none").attr("stroke", "#D1D5DB").attr("stroke-width", 2)
      .attr("d", d3.linkHorizontal().x((d) => d.y + 80).y((d) => d.x));

    // nodes
    const nodes = g.selectAll("g").data(root.descendants()).enter().append("g")
      .attr("transform", (d) => "translate(" + (d.y + 80) + "," + (d.x - nodeH / 2) + ")");

    nodes.append("rect").attr("rx", 12).attr("ry", 12).attr("width", nodeW).attr("height", nodeH)
      .attr("fill", "#fff").attr("stroke", "#E5E7EB")
      .on("click", (e, d) => openQuick(d.data.id));

    nodes.append("text").attr("x", 12).attr("y", 18).attr("font-size", "12px")
      .text((d) => d.data.name)
      .on("dblclick", (e, d) => { if (collapsed.has(d.data.id)) collapsed.delete(d.data.id); else collapsed.add(d.data.id); drawGraph(); });

    // inline actions
    nodes.append("text").attr("x", nodeW - 52).attr("y", 18).attr("font-size", "12px").attr("fill", "#16A34A")
      .text("+P").attr("title", "Add Parent").style("cursor", "pointer").on("click", (e, d) => addParent(d.data.id));
    nodes.append("text").attr("x", nodeW - 24).attr("y", 18).attr("font-size", "12px").attr("fill", "#5850EC")
      .text("+C").attr("title", "Add Child").style("cursor", "pointer").on("click", (e, d) => addChild(d.data.id));
    nodes.append("text").attr("x", nodeW - 86).attr("y", 18).attr("font-size", "12px").attr("fill", "#374151")
      .text("+S").attr("title", "Add Spouse").style("cursor", "pointer").on("click", (e, d) => addSpouse(d.data.id));
  }

  function fitGraph() {
    const host = qs("#treeHost"); const svgEl = host?.querySelector("svg"); if (!svgEl || !g) return;
    const b = g.node().getBBox(); const m = 40;
    const { width, height } = host.getBoundingClientRect();
    if (b.width === 0 || b.height === 0 || width === 0 || height === 0) return;
    const scale = Math.max(0.3, Math.min(2.5, Math.min((width - m) / b.width, (height - m) / b.height)));
    const tx = (width - b.width * scale) / 2 - b.x * scale;
    const ty = (height - b.height * scale) / 2 - b.y * scale;
    d3.select(svgEl).transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function centerGraph(s = 0.95) {
    const host = qs("#treeHost"); const svgEl = host?.querySelector("svg"); if (!svgEl) return;
    const { width, height } = host.getBoundingClientRect();
    d3.select(svgEl).transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(width * 0.025, height * 0.025).scale(s));
  }

  function focusByName(q) {
    const p = state.people.find((pp) => (pp.name || "").toLowerCase().includes(q.toLowerCase()));
    if (!p) { alert("No match"); return; }
    openQuick(p.id);
  }

  // ---------- Map (Leaflet + heat) ----------
  let map, heatLayer, markersLayer, arcsLayer;

  function initMap() {
    window._mapReady = true;
    map = L.map("map", { zoomAnimation: true, scrollWheelZoom: true }).setView([30, 10], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 10, attribution: "© OpenStreetMap" }).addTo(map);

    heatLayer = L.heatLayer([], { radius: 22, blur: 18, maxZoom: 10 }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    arcsLayer = L.layerGroup().addTo(map);

    qs("#chkHeat").onchange = () => { if (qs("#chkHeat").checked) heatLayer.addTo(map); else map.removeLayer(heatLayer); };
    qs("#chkArcs").onchange = () => { if (qs("#chkArcs").checked) arcsLayer.addTo(map); else map.removeLayer(arcsLayer); };
    qs("#btnGeoAll").onclick = geocodeAll;

    refreshMap();
  }

  async function geocode(place) {
    const key = (place || "").trim(); if (!key) return null;
    if (state.geoCache[key]) return state.geoCache[key];
    try {
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(key);
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const arr = await res.json();
      if (arr && arr[0]) { const out = { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) }; state.geoCache[key] = out; save(); return out; }
    } catch {}
    return null;
  }

  async function geocodeAll() {
    const s = qs("#geoStatus"); s.textContent = "Geocoding…";
    for (const p of state.people) {
      if (p.birthPlace && (!p.bLat || !p.bLon)) { const r = await geocode(p.birthPlace); if (r) { p.bLat = r.lat; p.bLon = r.lon; } }
      if (p.residencePlace && (!p.rLat || !p.rLon)) { const r2 = await geocode(p.residencePlace); if (r2) { p.rLat = r2.lat; p.rLon = r2.lon; } }
    }
    save(); await refreshMap(); s.textContent = "Done."; setTimeout(() => (s.textContent = ""), 1500);
  }

  async function refreshMap() {
    if (!map) return;
    heatLayer.setLatLngs([]); markersLayer.clearLayers(); arcsLayer.clearLayers();

    const heat = [];
    for (const p of state.people) {
      if (p.residencePlace && (!p.rLat || !p.rLon)) { const r = await geocode(p.residencePlace); if (r) { p.rLat = r.lat; p.rLon = r.lon; } }

      if (Number.isFinite(p.rLat) && Number.isFinite(p.rLon)) {
        heat.push([p.rLat, p.rLon, 0.7]);
        const m = L.marker([p.rLat, p.rLon]).addTo(markersLayer);
        m.bindPopup(`
          <div class="text-sm">
            <div class="font-medium">${escapeHtml(p.name || "")}</div>
            <div class="text-xs">${escapeHtml(p.residencePlace || "")}</div>
            <div class="mt-2">
              <button data-q="${p.id}" class="px-2 py-1 border rounded">Quick Edit</button>
              <button data-prof="${p.id}" class="px-2 py-1 border rounded">Open Profile</button>
              <button data-s="${p.id}" class="px-2 py-1 border rounded">+ Spouse</button>
            </div>
          </div>`);
        m.on("popupopen", (e) => {
          const el = e.popup.getElement();
          const q = el.querySelector("[data-q]"); const s = el.querySelector("[data-s]"); const pr = el.querySelector("[data-prof]");
          if (q) q.onclick = () => openQuick(p.id);
          if (pr) pr.onclick = () => { goToProfile(p.id); m.closePopup(); };
          if (s) s.onclick = () => { addSpouse(p.id); m.closePopup(); };
        });
      }

      if (Number.isFinite(p.bLat) && Number.isFinite(p.bLon) && Number.isFinite(p.rLat) && Number.isFinite(p.rLon)) {
        L.polyline([[p.bLat, p.bLon],[p.rLat, p.rLon]], { color: "#6D28D9", weight: 2, opacity: 0.85 }).addTo(arcsLayer);
      }
    }
    heatLayer.setLatLngs(heat); save();
  }

  // ---------- Relations ----------
  function addChild(parentId) {
    const child = { id: uid(), name: "New Child" };
    state.people.push(child); state.links.push({ parentId, childId: child.id });
    save(); renderPeople(); redraw(); openQuick(child.id);
  }

  function addParent(childId) {
    const parent = { id: uid(), name: "New Parent" };
    state.people.push(parent); state.links.push({ parentId: parent.id, childId });
    save(); renderPeople(); redraw(); openQuick(parent.id);
  }

  function addSpouse(aId) {
    const partner = { id: uid(), name: "New Partner" };
    state.people.push(partner); state.spouses.push([aId, partner.id]);
    save(); renderPeople(); redraw(); openQuick(partner.id);
  }

  // ---------- Shared redraw ----------
  function refreshSelectors() {
    const rootSel = qs("#rootSelect"); if (!rootSel) return;
    const v = rootSel.value; rootSel.innerHTML = "";
    state.people.forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; rootSel.appendChild(o); });
    if (v) rootSel.value = v; rootSel.onchange = () => { drawGraph(); fitGraph(); };
  }

  function redraw() { if (window._treeReady) { drawGraph(); setTimeout(fitGraph, 0); } if (window._mapReady) refreshMap(); }

  // ---------- Profile page ----------
  function renderProfile(personId) {
    const p = state.people.find((x) => x.id === personId);
    const view = qs("#profileView"); if (!view) return;
    if (!p) { view.innerHTML = `<div class="text-red-600">Person not found.</div>`; return; }

    const living = !(p.deathDate || p.deathPlace);
    const badge = living ? `<span class="text-xs px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">Living</span>` : `<span class="text-xs px-2 py-1 rounded bg-zinc-100 border text-zinc-600">Deceased</span>`;

    const parents = state.links.filter(l => l.childId === p.id).map(l => l.parentId).map(pid => state.people.find(pp => pp.id === pid)).filter(Boolean);
    const children = state.links.filter(l => l.parentId === p.id).map(l => l.childId).map(pid => state.people.find(pp => pp.id === pid)).filter(Boolean);
    const spouses = state.spouses.filter(pair => pair.includes(p.id)).map(pair => pair[0] === p.id ? pair[1] : pair[0]).map(pid => state.people.find(pp => pp.id === pid)).filter(Boolean);

    view.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-2xl font-semibold">${escapeHtml(p.name || "Unnamed")}</div>
          <div class="mt-1 flex items-center gap-2">${badge}
            <span class="text-xs text-zinc-500">PID: <code class="text-zinc-700">${p.id}</code></span>
          </div>
        </div>
        <div class="flex gap-2">
          <button id="btnCopyPid" class="rounded-xl border px-3 py-2 text-sm">Copy PID</button>
          <button id="btnShareQR" class="rounded-xl border px-3 py-2 text-sm">Share QR</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div class="md:col-span-2 rounded-xl border p-4">
          <div class="font-medium mb-2">About</div>
          <div class="text-sm text-zinc-700">
            <div><span class="text-zinc-500">Sex:</span> ${p.sex || "—"}</div>
            <div><span class="text-zinc-500">Birth:</span> ${p.birthDate || "—"} ${p.birthPlace ? " · " + escapeHtml(p.birthPlace) : ""}</div>
            <div><span class="text-zinc-500">Death:</span> ${p.deathDate || "—"} ${p.deathPlace ? " · " + escapeHtml(p.deathPlace) : ""}</div>
            <div><span class="text-zinc-500">Residence:</span> ${p.residencePlace ? escapeHtml(p.residencePlace) : "—"}</div>
          </div>
        </div>
        <div class="rounded-xl border p-4">
          <div class="font-medium mb-2">Relationships</div>
          <div class="text-sm"><span class="text-zinc-500">Parents:</span>
            ${parents.map(x=>`<button class="link-profile underline mr-2" data-p="${x.id}">${escapeHtml(x.name)}</button>`).join("") || " —"}
          </div>
          <div class="text-sm mt-1"><span class="text-zinc-500">Spouses:</span>
            ${spouses.map(x=>`<button class="link-profile underline mr-2" data-p="${x.id}">${escapeHtml(x.name)}</button>`).join("") || " —"}
          </div>
          <div class="text-sm mt-1"><span class="text-zinc-500">Children:</span>
            ${children.map(x=>`<button class="link-profile underline mr-2" data-p="${x.id}">${escapeHtml(x.name)}</button>`).join("") || " —"}
          </div>
        </div>
      </div>

      <div class="rounded-xl border p-4 mt-4">
        <div class="font-medium mb-2">Posts</div>
        <div class="text-sm text-zinc-500">Coming soon: text, image, video feed.</div>
      </div>`;

    qsa("#profileView .link-profile").forEach(b => b.onclick = () => { const nextId = b.getAttribute("data-p"); goToProfile(nextId); });
    const cp = qs("#btnCopyPid"); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(p.id); alert("PID copied"); } catch { alert("Copy failed"); } };
    const qr = qs("#btnShareQR"); if (qr) qr.onclick = () => { const url = `${location.origin}${location.pathname}#/t/default/p/${encodeURIComponent(p.id)}?connect=1`; alert("Share this link (QR coming next):\n" + url); };
  }

  function handleHashRoute() {
    const h = location.hash || "";
    const m = h.match(/^#\/t\/[^/]+\/p\/([^/?#]+)(?:.*)?$/);
    if (m) {
      const pid = decodeURIComponent(m[1]);
      switchTab("profiles"); renderProfile(pid); return true;
    }
    return false;
  }

  // ---------- AI (local placeholder) ----------
  function runLocalAI() {
    const q = (qs("#aiQ")?.value || "").trim(); const out = qs("#aiAns"); if (!out) return;
    if (!q) { out.textContent = "Ask a question about your tree (names, relationships)."; return; }
    // extremely small local demo: if question contains two known names, show a naive path via spouses/parents/children search up to depth 3
    const names = state.people.map(p=>p.name.toLowerCase());
    const who = names.filter(n => q.toLowerCase().includes(n)).slice(0,2);
    if (who.length < 2) { out.textContent = "Tip: mention two people by name."; return; }
    const a = state.people.find(p=>p.name.toLowerCase()===who[0]);
    const b = state.people.find(p=>p.name.toLowerCase()===who[1]);
    const path = bfsPath(a?.id, b?.id);
    if (!a || !b) { out.textContent = "Couldn’t find both people."; return; }
    if (!path) { out.textContent = `No short path found between ${a.name} and ${b.name}.`; return; }
    out.innerHTML = `Path: ` + path.map(pid => {
      const p = state.people.find(x=>x.id===pid); return `<button class="link-profile underline mr-1" data-p="${pid}">${escapeHtml(p?.name||pid)}</button>`;
    }).join(" → ");
    qsa("#aiAns .link-profile").forEach(b=>b.onclick=()=>goToProfile(b.getAttribute("data-p")));
  }

  function bfsPath(startId, goalId) {
    if (!startId || !goalId) return null; if (startId === goalId) return [startId];
    const neighbors = (id) => {
      const arr = new Set();
      state.links.forEach((l)=>{ if (l.parentId===id) arr.add(l.childId); if (l.childId===id) arr.add(l.parentId); });
      state.spouses.forEach((s)=>{ if (s[0]===id) arr.add(s[1]); if (s[1]===id) arr.add(s[0]); });
      return Array.from(arr);
    };
    const q = [startId]; const prev = new Map([[startId, null]]);
    while (q.length) { const cur = q.shift(); for (const nb of neighbors(cur)) { if (!prev.has(nb)) { prev.set(nb, cur); if (nb===goalId) { const path=[nb]; let t=cur; while (t){ path.push(t); t=prev.get(t);} return path.reverse(); } q.push(nb); } } }
    return null;
  }

  // ---------- utils ----------
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();
