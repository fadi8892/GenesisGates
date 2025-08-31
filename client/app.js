// Minimal Vite entry point for Genesis Gates

const qs = (s) => document.querySelector(s);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

document.addEventListener("DOMContentLoaded", () => {
  const btn = qs("#btnWallet");
  btn.addEventListener("click", () => {
    hide(qs("#landing"));
    show(qs("#app"));
    renderPeople();
  });
});

const state = {
  people: [
    { id: 1, name: "Alex Pioneer", birthPlace: "Baghdad, Iraq" },
    { id: 2, name: "Brianna Pioneer", birthPlace: "Erbil, Iraq" },
    { id: 3, name: "Child A", birthPlace: "San Diego, USA" },
  ],
};

function renderPeople() {
  const div = qs("#peopleContainer");
  div.innerHTML = "";
  state.people.forEach((p) => {
    const item = document.createElement("div");
    item.className = "p-3 border rounded-xl bg-white shadow-sm";
    item.textContent = `${p.name} — ${p.birthPlace}`;
    div.appendChild(item);
  });
}
