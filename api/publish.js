// /api/publish.js — web3.storage version
const API = "https://api.web3.storage/upload";

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const token = process.env.WEB3_STORAGE_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing WEB3_STORAGE_TOKEN" });

    const body = typeof req.body === "object" && req.body ? req.body
      : JSON.parse(await new Promise((r, j) => {
          let d=""; req.on("data",c=>d+=c); req.on("end",()=>r(d)); req.on("error",j);
        }) || "{}");

    const form = new FormData();
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
    form.append("file", blob, "snapshot.json");

    const r = await fetch(API, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });

    const data = await r.json();
    if (!data?.cid) return res.status(502).json({ error: "No CID returned" });
    return res.status(200).json({ cid: data.cid });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
