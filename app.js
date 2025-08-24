/* Genesis Gates — mobile-optimized core app
   Features:
   - Wallet/guest sign-in, logout
   - Tabs (Overview / Tree / Map / …)
   - People CRUD + Quick Edit bottom sheet
   - D3 tree with inline +Parent/+Child/+Spouse, fit/center/reset
   - Leaflet map with heatmap + migration lines; quick-edit from marker
   - JSON & GEDCOM import/export with safety warning
   - Basic media/facts/notes/links per person (stored in localStorage)
*/

(function () {
  // ---------- helpers ----------
  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const STORAGE = "gg:pro:v3:mobile:full";
  const save = () => localStorage.setItem(STORAGE, JSON.stringify(state));
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE)) || {};
    } catch {
      return {};
    }
  };

  let state = Object.assign(
    {
      session: { wallet: null },
      people: [],
      // links: parent-child relations: { parentId, childId }
      links: [],
      // spouses: array of [id1, id2]
      spouses: [],
      // geoCache: { "Place string": {lat,lon} }
      geoCache: {},
      // personExtras: { [id]: { notes, facts, links, media: [dataURL,...] } }
      personExtras: {},
    },
    load()
  );

  // seed demo on first run
  if (state.people.length === 0) {
    const a = {
      id: uid(),
      name: "Alex Pioneer",
      sex: "M",
      birthPlace: "Baghdad, Iraq",
      residencePlace: "San Diego, USA",
    };
    const b = {
      id: uid(),
      name: "Brianna Pioneer",
      sex: "F",
      birthPlace: "Erbil, Iraq",
      residencePlace: "Phoenix, USA",
    };
    const c = {
      id: uid(),
      name: "Child A",
      sex: "M",
      birthPlace: "San Diego, USA",
      residencePlace: "Austin, USA",
    };
    state.people = [a, b, c];
    state.spouses = [[a.id, b.id]];
    state.links = [
      { parentId: a.id, childId: c.id },
      { parentId: b.id, childId: c.id },
    ];
    save();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // sign in (wallet/guest)
    qs("#btnWallet").onclick = async () => {
      let addr = null;
      // Try MetaMask if available; otherwise continue as guest
      if (window.ethereum && window.ethereum.request) {
        try {
          const ac = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          addr = ac && ac[0];
        } catch {}
      }
      if (!addr) addr = "guest@local";
      state.session.wallet = { address: addr };
      save();
      enter();
    };

    qs("#btnLogout").onclick = () => {
      state.session.wallet = null;
      save();
      hide(qs("#app"));
      show(qs("#landing"));
    };

    // Non-critical buttons so they don't feel broken
    const btnOwner = qs("#btnOwner");
    const btnShowAccess = qs("#btnShowAccess");
    if (btnOwner)
      btnOwner.onclick = () =>
        alert(
          "Owner Mode is a placeholder here. In production this would check your wallet signature and unlock admin-only actions."
        );
    if (btnShowAccess)
      btnShowAccess.onclick = () =>
        alert(
          "Access code feature (share a read-only code to a specific tree) is coming next build."
        );

    if (state.session.wallet) enter();
  });

  function enter() {
    hide(qs("#landing"));
    show(qs("#app"));
    qs("#userBadge").textContent =
      "Signed in as " + (state.session.wallet.address || "guest");
    bindUI();
    renderPeople();
    refreshSelectors();
  }

  function bindUI() {
    // Tabs
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
        if (
          state.people.length &&
          !confirm(
            "Importing a GEDCOM will replace your current tree.\nPlease export a backup first.\n\nContinue?"
          )
        ) {
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
      if (qs("#pResidencePlace").value)
        await geocode(qs("#pResidencePlace").value);
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
          setTimeout(() => {
            try {
              fitGraph();
            } catch {}
          }, 0);
        }
      }, 150);
    });
  }

  function switchTab(name) {
    const panels = [
      "overview",
      "tree",
      "map",
      "media",
      "sources",
      "reports",
      "settings",
    ];
    panels.forEach((id) => {
      const active = id === name;
      qs("#panel-" + id)?.classList.toggle("hidden", !active);
      qs(`.tab[data-tab="${id}"]`)?.classList.toggle("active", active);
    });
    if (name === "tree" && !window._treeReady) initTree();
    if (name === "map" && !window._mapReady) initMap();
  }

  // ---------- People CRUD ----------
  function renderPeople() {
    const tb = qs("#peopleRows");
    tb.innerHTML = "";
    state.people.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2">
          <button class="underline text-left" data-quick="${p.id}">${escapeHtml(
        p.name || ""
      )}</button>
        </td>
        <td>${p.sex || ""}</td>
        <td class="text-zinc-500">
          ${p.birthDate || ""}${p.birthPlace ? " · " + p.birthPlace : ""}
        </td>
        <td class="text-zinc-500">
          ${p.deathDate || ""}${p.deathPlace ? " · " + p.deathPlace : ""}
        </td>
        <td class="text-right">
          <button data-edit="${p.id}" class="text-blue-600 mr-3">Edit</button>
          <button data-del="${p.id}" class="text-red-600">Delete</button>
        </td>`;
      tb.appendChild(tr);
    });
    qsa("[data-edit]").forEach(
      (b) => (b.onclick = () => loadToForm(b.dataset.edit))
    );
    qsa("[data-del]").forEach(
      (b) => (b.onclick = () => delPerson(b.dataset.del))
    );
    qsa("[data-quick]").forEach(
      (b) => (b.onclick = () => openQuick(b.dataset.quick))
    );
  }

  function loadToForm(id) {
    const p = state.people.find((x) => x.id === id);
    if (!p) return;
    set("pId", p.id);
    set("pName", p.name);
    set("pSex", p.sex);
    set("pBirthDate", p.birthDate);
    set("pBirthPlace", p.birthPlace);
    set("pDeathDate", p.deathDate);
    set("pDeathPlace", p.deathPlace);
    set("pResidencePlace", p.residencePlace);
  }

  function set(id, v) {
    const el = qs("#" + id);
    if (el) el.value = v || "";
  }

  function clearForm() {
    [
      "pId",
      "pName",
      "pSex",
      "pBirthDate",
      "pBirthPlace",
      "pDeathDate",
      "pDeathPlace",
      "pResidencePlace",
    ].forEach((i) => set(i, ""));
  }

  function delPerson(id) {
    if (!confirm("Delete this person?")) return;
    state.people = state.people.filter((x) => x.id !== id);
    state.links = state.links.filter(
      (l) => l.parentId !== id && l.childId !== id
    );
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
      name: qs("#pName").value.trim() || "Unnamed",
      sex: qs("#pSex").value || "",
      birthDate: qs("#pBirthDate").value.trim() || "",
      birthPlace: qs("#pBirthPlace").value.trim() || "",
      deathDate: qs("#pDeathDate").value.trim() || "",
      deathPlace: qs("#pDeathPlace").value.trim() || "",
      residencePlace: qs("#pResidencePlace").value.trim() || "",
    };
    const i = state.people.findIndex((x) => x.id === id);
    if (i >= 0) state.people[i] = p;
    else state.people.push(p);
    // Ensure extras bucket
    state.personExtras[id] =
      state.personExtras[id] || { notes: "", facts: "", links: "", media: [] };
    save();
    renderPeople();
    refreshSelectors();
    redraw();
    clearForm();
  }

  // ---------- Quick Edit ----------
  let currentQuickId = null;

  function openQuick(id) {
    currentQuickId = id;
    const p = state.people.find((x) => x.id === id);
    if (!p) return;
    show(qs("#quickModal"));

    // Main fields
    setQ("qName", p.name);
    setQ("qSex", p.sex);
    setQ("qBirthDate", p.birthDate);
    setQ("qBirthPlace", p.birthPlace);
    setQ("qResidencePlace", p.residencePlace);
    qs("#nftBadge").textContent = "NFT ID: " + p.id;

    // tabs inside modal
    qsa(".qtab").forEach((b) => {
      b.onclick = () => quickTab(b.dataset.qt);
    });
    quickTab("media");

    // extras
    const extras =
      state.personExtras[id] ||
      (state.personExtras[id] = { notes: "", facts: "", links: "", media: [] });
    qs("#qFacts").value = extras.facts || "";
    qs("#qNotes").value = extras.notes || "";
    qs("#qLinks").value = extras.links || "";
    renderMediaGrid(extras.media);

    // media upload
    const qMedia = qs("#qMedia");
    qMedia.onchange = async (e) => {
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
      // save extras
      extras.facts = qs("#qFacts").value;
      extras.notes = qs("#qNotes").value;
      extras.links = qs("#qLinks").value;
      save();
      renderPeople();
      redraw();
      alert("Saved");
    };

    // relation buttons
    qs("#qAddParent").onclick = () => addParent(id);
    qs("#qAddChild").onclick = () => addChild(id);
    qs("#qAddSpouse").onclick = () => addSpouse(id);
  }

  function quickTab(name) {
    ["media", "facts", "notes", "links"].forEach((k) => {
      qs("#qPanel-" + k).classList.toggle("hidden", k !== name);
    });
    qsa(".qtab").forEach((b) =>
      b.classList.toggle("underline", b.dataset.qt === name)
    );
  }

  function setQ(id, v) {
    const el = qs("#" + id);
    if (el) el.value = v || "";
  }
  function valQ(id) {
    const el = qs("#" + id);
    return el ? el.value.trim() : "";
  }

  function renderMediaGrid(arr) {
    const grid = qs("#qMediaGrid");
    grid.innerHTML = "";
    arr.forEach((src, i) => {
      const d = document.createElement("div");
      d.className =
        "relative rounded-lg overflow-hidden border aspect-square bg-zinc-100";
      d.innerHTML = `
        <img src="${src}" class="absolute inset-0 w-full h-full object-cover"/>
        <button class="absolute top-1 right-1 text-[10px] px-2 py-1 bg-white/80 rounded border">Remove</button>
      `;
      grid.appendChild(d);
      d.querySelector("button").onclick = () => {
        arr.splice(i, 1);
        save();
        renderMediaGrid(arr);
      };
    });
  }

  function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // ---------- Import/Export ----------
  function exportJSON() {
    const a = document.createElement("a");
    a.href =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(state, null, 2));
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
        Object.assign(state, data);
        save();
        renderPeople();
        refreshSelectors();
        redraw();
        alert("Imported JSON");
      } catch {
        alert("Invalid JSON");
      }
    };
    r.readAsText(f);
  }

  function exportGED() {
    // Create INDI xrefs
    const xref = {};
    state.people.forEach((p, i) => (xref[p.id] = "@I" + (i + 1) + "@"));

    const lines = [
      "0 HEAD",
      "1 SOUR GenesisGates",
      "1 GEDC",
      "2 VERS 5.5.1",
      "2 FORM LINEAGE-LINKED",
      "1 CHAR UTF-8",
    ];

    // Individuals
    state.people.forEach((p) => {
      lines.push("0 " + xref[p.id] + " INDI");
      if (p.name) lines.push("1 NAME " + p.name);
      if (p.sex) lines.push("1 SEX " + p.sex);
      if (p.birthDate || p.birthPlace) {
        lines.push("1 BIRT");
        if (p.birthDate) lines.push("2 DATE " + p.birthDate);
        if (p.birthPlace) lines.push("2 PLAC " + p.birthPlace);
      }
      if (p.deathDate || p.deathPlace) {
        lines.push("1 DEAT");
        if (p.deathDate) lines.push("2 DATE " + p.deathDate);
        if (p.deathPlace) lines.push("2 PLAC " + p.deathPlace);
      }
      if (p.residencePlace) {
        lines.push("1 RESI");
        lines.push("2 PLAC " + p.residencePlace);
      }
    });

    // Build FAMs from spouses + children
    const fams = [];
    const pairKey = (a, b) => [a, b].sort().join("|");
    const seen = new Map();
    state.spouses.forEach((pr) => {
      const k = pairKey(pr[0], pr[1]);
      if (!seen.has(k)) {
        seen.set(k, fams.length);
        fams.push({ husb: pr[0], wife: pr[1], children: [] });
      }
    });
    // attach children to the matching family (if parent is in that fam)
    state.links.forEach((l) => {
      fams.forEach((f) => {
        if (l.parentId === f.husb || l.parentId === f.wife) {
          if (!f.children.includes(l.childId)) f.children.push(l.childId);
        }
      });
    });

    fams.forEach((f, i) => {
      const fid = "@F" + (i + 1) + "@";
      lines.push("0 " + fid + " FAM");
      if (f.husb) lines.push("1 HUSB " + (xref[f.husb] || ""));
      if (f.wife) lines.push("1 WIFE " + (xref[f.wife] || ""));
      f.children.forEach((cid) => lines.push("1 CHIL " + (xref[cid] || "")));
    });

    lines.push("0 TRLR");

    const a = document.createElement("a");
    a.href =
      "data:text/plain;charset=utf-8," + encodeURIComponent(lines.join("\n"));
    a.download = "genesis-gates.ged";
    a.click();
  }

  function importGED(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const lines = r.result.split(/\r?\n/);
      const inds = {};
      const fams = [];
      let current = null;
      let typ = null;

      lines.forEach((raw) => {
        const m = raw
          .trim()
          .match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z0-9_]+)?\s*(.*)?$/);
        if (!m) return;
        const level = +m[1];
        const xref = m[2] || null;
        const tag = m[3] || "";
        const data = (m[4] || "").trim();

        if (level === 0 && xref && tag === "INDI") {
          current = { id: xref, data: {} };
          typ = "INDI";
          inds[xref] = current.data;
        } else if (level === 0 && xref && tag === "FAM") {
          current = { id: xref, data: { children: [] } };
          typ = "FAM";
          fams.push(current.data);
        } else if (typ === "INDI") {
          if (tag === "NAME") current.data.name = data;
          else if (tag === "SEX") current.data.sex = data;
          else if (tag === "BIRT") {
            current._b = true;
            current._d = false;
            current._r = false;
          } else if (tag === "DEAT") {
            current._d = true;
            current._b = false;
            current._r = false;
          } else if (tag === "RESI") {
            current._r = true;
            current._b = false;
            current._d = false;
          } else if (tag === "DATE") {
            if (current._b) current.data.birthDate = data;
            if (current._d) current.data.deathDate = data;
          } else if (tag === "PLAC") {
            if (current._b) current.data.birthPlace = data;
            if (current._d) current.data.deathPlace = data;
            if (current._r) current.data.residencePlace = data;
          } else if (level === 1) {
            current._b = current._d = current._r = false;
          }
        } else if (typ === "FAM") {
          if (tag === "HUSB") current.data.husb = data;
          else if (tag === "WIFE") current.data.wife = data;
          else if (tag === "CHIL") current.data.children.push(data);
        }
      });

      // remap xrefs to new local ids
      const idMap = {};
      const people = [];
      Object.keys(inds).forEach((xref) => {
        const p = Object.assign({ id: uid() }, inds[xref]);
        idMap[xref] = p.id;
        people.push(p);
      });

      const links = [];
      const spouses = [];
      fams.forEach((f) => {
        const a = idMap[f.husb];
        const b = idMap[f.wife];
        if (a && b) spouses.push([a, b]);
        (f.children || []).forEach((cxr) => {
          const c = idMap[cxr];
          if (c && a) links.push({ parentId: a, childId: c });
          if (c && b) links.push({ parentId: b, childId: c });
        });
      });

      state.people = people;
      state.links = links;
      state.spouses = spouses;
      save();
      renderPeople();
      refreshSelectors();
      redraw();
      alert("GEDCOM imported");
    };
    r.readAsText(f);
  }

  // ---------- Tree (D3) ----------
  let svg, g, zoom, collapsed = new Set();

  function initTree() {
    window._treeReady = true;
    const host = qs("#treeHost");
    host.innerHTML = "";
    svg = d3.select(host).append("svg").attr("width", "100%").attr("height", "100%");
    g = svg.append("g");
    zoom = d3
      .zoom()
      .scaleExtent([0.3, 2.5])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    qs("#btnFitTree").onclick = fitGraph;
    qs("#btnCenterTree").onclick = () => centerGraph(0.95);
    qs("#btnResetTree").onclick = () => {
      collapsed.clear();
      drawGraph();
      fitGraph();
    };
    qsa('input[name="diagram"]').forEach(
      (r) => (r.onchange = () => {
        drawGraph();
        fitGraph();
      })
    );
    qs("#btnTreeSearch").onclick = () => {
      const q = qs("#treeSearch").value.trim();
      if (q) focusByName(q);
    };

    drawGraph();
    fitGraph();
  }

  function childrenOf(id) {
    return Array.from(
      new Set(state.links.filter((l) => l.parentId === id).map((l) => l.childId))
    )
      .map((pid) => state.people.find((p) => p.id === pid))
      .filter(Boolean);
  }

  function build(rootId, v = new Set()) {
    const me = state.people.find((p) => p.id === rootId) || state.people[0];
    if (!me || v.has(me.id)) return null;
    v.add(me.id);
    const kids = childrenOf(me.id).map((ch) => build(ch.id, v)).filter(Boolean);
    return { id: me.id, name: me.name, _c: collapsed.has(me.id), children: kids };
  }

  function drawGraph() {
    const rootSel = qs("#rootSelect");
    if (rootSel && !rootSel.value && state.people[0])
      rootSel.value = state.people[0].id;
    const rid = (rootSel && rootSel.value) || (state.people[0] && state.people[0].id);
    const data = build(rid) || { name: "(empty)" };

    g.selectAll("*").remove();

    const host = qs("#treeHost");
    host.getBoundingClientRect(); // force layout
    const root = d3.hierarchy(data, (d) => (d._c ? null : d.children));

    const nodeW = 160,
      nodeH = 52,
      hgap = 40,
      vgap = 76;

    d3.tree().nodeSize([vgap, nodeW + hgap])(root);

    // links
    g
      .selectAll("path")
      .data(root.links())
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#D1D5DB")
      .attr("stroke-width", 2)
      .attr(
        "d",
        d3.linkHorizontal().x((d) => d.y + 80).y((d) => d.x)
      );

    // nodes
    const nodes = g
      .selectAll("g")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", (d) => "translate(" + (d.y + 80) + "," + (d.x - nodeH / 2) + ")");

    nodes
      .append("rect")
      .attr("rx", 12)
      .attr("ry", 12)
      .attr("width", nodeW)
      .attr("height", nodeH)
      .attr("fill", "#fff")
      .attr("stroke", "#E5E7EB")
      .on("click", (e, d) => openQuick(d.data.id));

    nodes
      .append("text")
      .attr("x", 12)
      .attr("y", 18)
      .attr("font-size", "12px")
      .text((d) => d.data.name)
      .on("dblclick", (e, d) => {
        if (collapsed.has(d.data.id)) collapsed.delete(d.data.id);
        else collapsed.add(d.data.id);
        drawGraph();
      });

    // inline actions
    nodes
      .append("text")
      .attr("x", nodeW - 52)
      .attr("y", 18)
      .attr("font-size", "12px")
      .attr("fill", "#16A34A")
      .text("+P")
      .attr("title", "Add Parent")
      .style("cursor", "pointer")
      .on("click", (e, d) => addParent(d.data.id));

    nodes
      .append("text")
      .attr("x", nodeW - 24)
      .attr("y", 18)
      .attr("font-size", "12px")
      .attr("fill", "#5850EC")
      .text("+C")
      .attr("title", "Add Child")
      .style("cursor", "pointer")
      .on("click", (e, d) => addChild(d.data.id));

    nodes
      .append("text")
      .attr("x", nodeW - 86)
      .attr("y", 18)
      .attr("font-size", "12px")
      .attr("fill", "#374151")
      .text("+S")
      .attr("title", "Add Spouse")
      .style("cursor", "pointer")
      .on("click", (e, d) => addSpouse(d.data.id));
  }

  function fitGraph() {
    const host = qs("#treeHost");
    const svgEl = host.querySelector("svg");
    if (!svgEl) return;
    const b = g.node().getBBox();
    const m = 40;
    const { width, height } = host.getBoundingClientRect();
    const scale = Math.max(
      0.3,
      Math.min(2.5, Math.min((width - m) / b.width, (height - m) / b.height))
    );
    const tx = (width - b.width * scale) / 2 - b.x * scale;
    const ty = (height - b.height * scale) / 2 - b.y * scale;
    d3
      .select(svgEl)
      .transition()
      .duration(300)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function centerGraph(s = 0.95) {
    const host = qs("#treeHost");
    const svgEl = host.querySelector("svg");
    const { width, height } = host.getBoundingClientRect();
    d3
      .select(svgEl)
      .transition()
      .duration(300)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(width * 0.025, height * 0.025).scale(s)
      );
  }

  function focusByName(q) {
    const p = state.people.find((pp) =>
      (pp.name || "").toLowerCase().includes(q.toLowerCase())
    );
    if (!p) {
      alert("No match");
      return;
    }
    openQuick(p.id);
  }

  // ---------- Map (Leaflet + heat) ----------
  let map, heatLayer, markersLayer, arcsLayer;

  function initMap() {
    window._mapReady = true;
    map = L.map("map", { zoomAnimation: true, scrollWheelZoom: true }).setView(
      [30, 10],
      2
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 10,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    heatLayer = L.heatLayer([], { radius: 22, blur: 18, maxZoom: 10 }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    arcsLayer = L.layerGroup().addTo(map);

    qs("#chkHeat").onchange = () => {
      if (qs("#chkHeat").checked) heatLayer.addTo(map);
      else map.removeLayer(heatLayer);
    };
    qs("#chkArcs").onchange = () => {
      if (qs("#chkArcs").checked) arcsLayer.addTo(map);
      else map.removeLayer(arcsLayer);
    };
    qs("#btnGeoAll").onclick = geocodeAll;

    refreshMap();
  }

  async function geocode(place) {
    const key = (place || "").trim();
    if (!key) return null;
    if (state.geoCache[key]) return state.geoCache[key];
    try {
      // Nominatim free endpoint; be gentle with usage
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(key);
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      const arr = await res.json();
      if (arr && arr[0]) {
        const out = { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
        state.geoCache[key] = out;
        save();
        return out;
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  async function geocodeAll() {
    const s = qs("#geoStatus");
    s.textContent = "Geocoding…";
    for (const p of state.people) {
      if (p.birthPlace && (!p.bLat || !p.bLon)) {
        const r = await geocode(p.birthPlace);
        if (r) {
          p.bLat = r.lat;
          p.bLon = r.lon;
        }
      }
      if (p.residencePlace && (!p.rLat || !p.rLon)) {
        const r2 = await geocode(p.residencePlace);
        if (r2) {
          p.rLat = r2.lat;
          p.rLon = r2.lon;
        }
      }
    }
    save();
    await refreshMap();
    s.textContent = "Done.";
    setTimeout(() => (s.textContent = ""), 1500);
  }

  async function refreshMap() {
    if (!map) return;
    heatLayer.setLatLngs([]);
    markersLayer.clearLayers();
    arcsLayer.clearLayers();

    const heat = [];
    for (const p of state.people) {
      // Ensure residence geocoded (lazy)
      if (p.residencePlace && (!p.rLat || !p.rLon)) {
        const r = await geocode(p.residencePlace);
        if (r) {
          p.rLat = r.lat;
          p.rLon = r.lon;
        }
      }

      if (Number.isFinite(p.rLat) && Number.isFinite(p.rLon)) {
        heat.push([p.rLat, p.rLon, 0.7]);

        const m = L.marker([p.rLat, p.rLon]).addTo(markersLayer);
        m.bindPopup(
          `<div class="text-sm">
             <div class="font-medium">${escapeHtml(p.name || "")}</div>
             <div class="text-xs">${escapeHtml(p.residencePlace || "")}</div>
             <div class="mt-2">
               <button data-q="${p.id}" class="px-2 py-1 border rounded">Quick Edit</button>
               <button data-s="${p.id}" class="px-2 py-1 border rounded">+ Spouse</button>
             </div>
           </div>`
        );
        m.on("popupopen", (e) => {
          const el = e.popup.getElement();
          const q = el.querySelector("[data-q]");
          const s = el.querySelector("[data-s]");
          if (q) q.onclick = () => openQuick(p.id);
          if (s)
            s.onclick = () => {
              addSpouse(p.id);
              m.closePopup();
            };
        });
      }

      // Migration line from birth -> residence
      if (
        Number.isFinite(p.bLat) &&
        Number.isFinite(p.bLon) &&
        Number.isFinite(p.rLat) &&
        Number.isFinite(p.rLon)
      ) {
        L.polyline(
          [
            [p.bLat, p.bLon],
            [p.rLat, p.rLon],
          ],
          { color: "#6D28D9", weight: 2, opacity: 0.85 }
        ).addTo(arcsLayer);
      }
    }
    heatLayer.setLatLngs(heat);
    save();
  }

  // ---------- Relations ----------
  function addChild(parentId) {
    const child = { id: uid(), name: "New Child" };
    state.people.push(child);
    state.links.push({ parentId, childId: child.id });
    save();
    renderPeople();
    redraw();
    openQuick(child.id);
  }

  function addParent(childId) {
    const parent = { id: uid(), name: "New Parent" };
    state.people.push(parent);
    state.links.push({ parentId: parent.id, childId });
    save();
    renderPeople();
    redraw();
    openQuick(parent.id);
  }

  function addSpouse(aId) {
    const partner = { id: uid(), name: "New Partner" };
    state.people.push(partner);
    state.spouses.push([aId, partner.id]);
    save();
    renderPeople();
    redraw();
    openQuick(partner.id);
  }

  // ---------- Shared redraw ----------
  function refreshSelectors() {
    const rootSel = qs("#rootSelect");
    if (!rootSel) return;
    const v = rootSel.value;
    rootSel.innerHTML = "";
    state.people.forEach((p) => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name;
      rootSel.appendChild(o);
    });
    if (v) rootSel.value = v;
  }

  function redraw() {
    if (window._treeReady) drawGraph();
    if (window._mapReady) refreshMap();
  }

  // ---------- utils ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
