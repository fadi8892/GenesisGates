// Minimal Overview with add/edit/delete, localStorage persistence

const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const STORAGE = "gg:people:v1";

function saveState(s) { localStorage.setItem(STORAGE, JSON.stringify(s)); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch { return {}; } }

let state = Object.assign({ people: [] }, loadState());
if (state.people.length === 0) {
  state.people = [
    { id: uid(), sex: "M", name: "Alex Pioneer", birthDate: "1970-01-01", birthPlace: "Baghdad, Iraq" },
    { id: uid(), sex: "F", name: "Brianna Pioneer", birthDate: "1972-02-02", birthPlace: "Erbil, Iraq" },
  ];
  saveState(state);
}

document.addEventListener("DOMContentLoaded", () => {
  // Enter app
  const enter = () => { hide(qs("#landing")); show(qs("#app")); renderPeople(); bindOverview(); };
  const btn = qs("#btnWallet");
  if (btn) btn.addEventListener("click", enter);

  // If you prefer to skip landing during testing:
  // enter();
});

function renderPeople() {
  const tbody = qs("#peopleRows");
  if (!tbody) return;
  tbody.innerHTML = "";
  state.people.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2">${p.name || ""}</td>
      <td class="py-2">${p.sex || ""}</td>
      <td class="py-2 text-zinc-500">${(p.birthDate || "")}${p.birthPlace ? " · " + p.birthPlace : ""}</td>
      <td class="py-2 text-right">
        <button data-id="${p.id}" class="btnEdit text-blue-600 mr-3">Edit</button>
        <button data-id="${p.id}" class="btnDel text-red-600">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  qsa(".btnEdit").forEach((b) => b.addEventListener("click", () => loadToForm(b.getAttribute("data-id"))));
  qsa(".btnDel").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      if (!confirm("Delete this person?")) return;
      state.people = state.people.filter((x) => x.id !== id);
      saveState(state);
      renderPeople();
      clearForm();
    })
  );
}

function loadToForm(id) {
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

function clearForm() {
  ["pId","pName","pSex","pBirthDate","pBirthPlace","pDeathDate","pDeathPlace","pResidencePlace"]
    .forEach((id) => { const el = qs("#" + id); if (el) el.value = ""; });
}

function savePerson() {
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
  clearForm();
}

function bindOverview() {
  const saveBtn = qs("#btnSavePerson");
  const clearBtn = qs("#btnClearForm");
  if (saveBtn && !saveBtn._bound) { saveBtn._bound = true; saveBtn.addEventListener("click", savePerson); }
  if (clearBtn && !clearBtn._bound) { clearBtn._bound = true; clearBtn.addEventListener("click", clearForm); }
}
