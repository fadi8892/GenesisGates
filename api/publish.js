// Serverless function for Vercel (Node.js 18 runtime).
// Receives a JSON snapshot, uploads as snapshot.json to web3.storage, returns { cid }.

const API = "https://api.web3.storage/upload";

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const token = process.env.WEB3_STORAGE_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "Missing WEB3_STORAGE_TOKEN env var" });
    }

    let snapshot = req.body;
    if (!snapshot || typeof snapshot !== "object") {
      // Vercel can pass body as string depending on content-type
      const raw = await readBody(req);
      snapshot = JSON.parse(raw || "{}");
    }

    // Build multipart/form-data with a single file: snapshot.json
    const form = new FormData();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    form.append("file", blob, "snapshot.json");

    const r = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(r.status).json({ error: `web3.storage error: ${txt || r.statusText}` });
    }

    const data = await r.json();
    // web3.storage returns { cid: "bafy..." }
    if (!data || !data.cid) {
      return res.status(502).json({ error: "Invalid response from web3.storage" });
    }

    return res.status(200).json({ cid: data.cid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
};

// Helper to read raw body when needed
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
