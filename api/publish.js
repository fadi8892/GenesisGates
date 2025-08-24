// /api/publish.js
// Vercel serverless function (Node 18+).
// Takes JSON in the request body, uploads it to Storacha as "snapshot.json", returns { cid }.

const STORACHA_UPLOAD_URL = "https://up.storacha.network/upload";

// Helper: read raw body as text if needed (when req.body is empty)
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // --- 1) Get Storacha creds from env ---
    const SPACE_DID = process.env.STORACHA_SPACE_DID;           // e.g. did:key:z6Mk...
    const AUTHORIZATION = process.env.STORACHA_AUTHORIZATION;   // from bridge token generation
    const X_AUTH_SECRET = process.env.STORACHA_X_AUTH_SECRET;   // from bridge token generation

    if (!SPACE_DID || !AUTHORIZATION || !X_AUTH_SECRET) {
      return res.status(500).json({
        error:
          "Missing Storacha env vars. Please set STORACHA_SPACE_DID, STORACHA_AUTHORIZATION, STORACHA_X_AUTH_SECRET in Vercel.",
      });
    }

    // --- 2) Parse the snapshot JSON from request ---
    let snapshot = req.body;
    if (!snapshot || typeof snapshot !== "object") {
      // Fallback if body wasn't parsed
      const raw = await readBody(req);
      snapshot = raw ? JSON.parse(raw) : {};
    }

    // Minimal sanity: wrap into a standard snapshot envelope
    const payload = {
      _schema: "gg-snapshot@v0",
      // keep original fields if you already sent in this structure
      ...snapshot,
      meta: {
        ...(snapshot.meta || {}),
        uploadedAt: new Date().toISOString(),
        space: SPACE_DID,
      },
    };

    // --- 3) Build multipart for Storacha (single file: snapshot.json) ---
    // Node 18 on Vercel has fetch, FormData, Blob globally available.
    const form = new FormData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    form.append("file", blob, "snapshot.json");

    // --- 4) POST to Storacha Upload ---
    const up = await fetch(STORACHA_UPLOAD_URL, {
      method: "POST",
      headers: {
        // Space DID scoping + auth headers issued via Storacha bridge
        "X-Space-Did": SPACE_DID,
        Authorization: AUTHORIZATION,
        "X-Auth-Secret": X_AUTH_SECRET,
      },
      body: form,
    });

    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      return res
        .status(up.status)
        .json({ error: `Storacha upload failed: ${txt || up.statusText}` });
    }

    // Expect JSON like { cid: "bafy..." }
    const data = await up.json();
    if (!data || !data.cid) {
      return res.status(502).json({ error: "No CID returned by Storacha." });
    }

    return res.status(200).json({ cid: data.cid });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: err?.message || String(err) });
  }
};
