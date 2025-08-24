
(function () {
  const STORAGE = "gg:starter:v1";

  const qs = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  let state = load() || {
    session: { who: "guest@local" },
    tree: {
      id: "tree_" + uid(),
      name: "My Family",
      people: [],
      links: [],   // { parentId, childId }
      spouses: []  // [id1, id2]
    },
    latestCID: null,
  };

  function save() {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE)); } catch { return null; }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // landing actions
    qs("#btnExploreDemo").onclick = async () => {
      state = {
        session: { who: "guest@local" },
        tree: {
          id: "tree_demo_" + uid(),
          name: "Demo Family",
          people: [
            { id: uid(), name: "Alex Pioneer", birthPlace: "Baghdad, Iraq" },
            { id: uid(), name: "Brianna Pioneer", birthPlace: "Erbil, Iraq" },
            { id: uid(), name: "Child A", birthPlace: "San Diego, USA" },
          ],
          links: [], // keep simple for the starter
          spouses: []
        },
        latestCID: null,
      };
      save();
      enter();
      // auto-publish demo so it's decentralized immediately
      try {
        qs("#pubStatus").textContent = "Publishing demo to IPFS…";
        const cid = await publishToIPFS(snapshotFromState());
        state.latestCID = cid; save();
        updateCIDUI(cid);
        qs("#pubStatus").textContent = "Demo published to IPFS.";
      } catch (e) {
        qs("#pubStatus").textContent = "Publish failed: " + (e?.message || e);
      }
    };

    qs("#btnStartFresh").onclick = () => {
      state = {
        session: { who: "guest@local" },
        tree: { id: "tree_" + uid(), name: "My Family", people: [], links: [], spouses: [] },
        latestCID: null,
      };
      save();
      enter();
    };

    // app actions (wired after enter too)
    if (state.session?.who) enter();
  });

  function enter() {
    hide(qs("#landing"));
    show(qs("#app"));
    qs("#userBadge").textContent = state.session.who;

    qs("#btnAddPerson").onclick = addPerson;
    qs("#btnPublish").onclick = onPublish;

    renderPeople();
    updateCIDUI(state.latestCID);
  }

  function addPerson() {
    const name = (qs("#pName").value || "").trim();
    if (!name) { alert("Enter a name"); return; }
    const birthPlace = (qs("#pBirthPlace").value || "").trim();
    state.tree.people.push({ id: uid(), name, birthPlace });
    save();
    qs("#pName").value = ""; qs("#pBirthPlace").value = "";
    renderPeople();
  }

  function renderPeople() {
    const tb = qs("#peopleRows");
    tb.innerHTML = "";
    state.tree.people.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-2">${escapeHtml(p.name)}</td>
        <td class="py-2 text-zinc-500">${escapeHtml(p.birthPlace || "")}</td>
        <td class="py-2 text-right">
          <button data-del="${i}" class="text-red-600">Delete</button>
        </td>`;
      tb.appendChild(tr);
    });
    qsa("[data-del]").forEach(b => b.onclick = () => {
      const idx = +b.getAttribute("data-del");
      state.tree.people.splice(idx, 1);
      save();
      renderPeople();
    });
  }

  async function onPublish() {
    qs("#pubStatus").textContent = "Publishing snapshot to IPFS…";
    try {
      const cid = await publishToIPFS(snapshotFromState());
      state.latestCID = cid; save();
      updateCIDUI(cid);
      qs("#pubStatus").textContent = "Published to IPFS.";
    } catch (e) {
      qs("#pubStatus").textContent = "Publish failed: " + (e?.message || e);
    }
  }

  function snapshotFromState() {
    // Minimal, clean JSON snapshot (one file). We can shard later.
    return {
      _schema: "gg-snapshot@v0",
      tree: {
        id: state.tree.id,
        name: state.tree.name,
      },
      people: state.tree.people,
      links: state.tree.links,
      spouses: state.tree.spouses,
      meta: {
        createdAt: new Date().toISOString(),
        createdBy: state.session.who || "guest@local",
      }
    };
  }

  async function publishToIPFS(snapshot) {
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    const data = await res.json();
    if (!data || !data.cid) throw new Error("No CID returned");
    return data.cid;
  }

  function updateCIDUI(cid) {
    const box = qs("#cidBox");
    const links = qs("#cidLinks");
    if (!cid) {
      box.textContent = "No snapshot published yet.";
      links.innerHTML = "";
      return;
    }
    box.textContent = `ipfs://${cid}`;
    const gw1 = `https://ipfs.dweb.link/ipfs/${cid}`;
    const gw2 = `https://w3s.link/ipfs/${cid}`;
    links.innerHTML = `
      <a class="underline" href="${gw1}" target="_blank" rel="noopener">Open via dweb.link</a>
      <span class="mx-2 text-zinc-400">|</span>
      <a class="underline" href="${gw2}" target="_blank" rel="noopener">Open via w3s.link</a>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();
