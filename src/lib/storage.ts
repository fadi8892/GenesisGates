// src/lib/storage.ts
// Server-only Storacha client factory + helpers compatible with your snapshot route.

import "server-only";
import { create } from "@storacha/client";

// ---------- Types ----------
export type ClientCreds = {
  agentSecret: string;
  spaceDid: string;
  endpoint?: string;
  /** Optional if your SDK version requires it; safe to leave undefined */
  agentDid?: string;
};

export type UploadJSONSnapshotOpts = {
  filename?: string;

  // Choose how creds are supplied:
  mode?: "byo" | "managed";

  // BYO creds (when mode === 'byo')
  agentSecret?: string;
  spaceDid?: string;
  endpoint?: string;
  agentDid?: string;

  // Managed overrides (optional; otherwise pulled from env)
  managedAgentSecret?: string;
  managedSpaceDid?: string;
  managedEndpoint?: string;
  managedAgentDid?: string;
};

type PutOptions = {
  filename?: string;
  contentType?: string;
};

// ---------- Guards ----------
function ensureServer() {
  // @ts-ignore
  if (typeof window !== "undefined") {
    throw new Error("storage.ts can only be used on the server.");
  }
}

// ---------- Client creation ----------
function resolveCreds(opts: UploadJSONSnapshotOpts = {}): ClientCreds {
  const mode = opts.mode ?? "managed";

  if (mode === "byo") {
    const agentSecret = opts.agentSecret || "";
    const spaceDid = opts.spaceDid || "";
    const endpoint = opts.endpoint || undefined;
    const agentDid = opts.agentDid || undefined;

    if (!agentSecret) throw new Error("BYO mode: missing agentSecret");
    if (!spaceDid) throw new Error("BYO mode: missing spaceDid");

    return { agentSecret, spaceDid, endpoint, agentDid };
  }

  // managed mode (default): pull from env, allow overrides
  const agentSecret = opts.managedAgentSecret ?? process.env.STORACHA_AGENT_SECRET ?? "";
  const spaceDid = opts.managedSpaceDid ?? process.env.STORACHA_SPACE_DID ?? "";
  const endpoint = opts.managedEndpoint ?? process.env.STORACHA_ENDPOINT || undefined;
  const agentDid = opts.managedAgentDid ?? process.env.STORACHA_AGENT_DID || undefined;

  if (!agentSecret) throw new Error("Managed mode: STORACHA_AGENT_SECRET missing");
  if (!spaceDid) throw new Error("Managed mode: STORACHA_SPACE_DID missing");

  return { agentSecret, spaceDid, endpoint, agentDid };
}

/** Create a Storacha client (tolerant to minor SDK shape differences). */
export function makeStorachaClient(creds: ClientCreds) {
  const { agentSecret, spaceDid, endpoint, agentDid } = creds;

  // NOTE: Recent Storacha SDKs expect { agent: { secret, did? }, space, endpoint? }
  const client = (create as any)({
    agent: {
      ...(agentDid ? { did: agentDid } : null),
      secret: agentSecret,
    },
    space: spaceDid,
    endpoint,
  });

  return client;
}

// ---------- Method shims (tolerate SDK variations) ----------
async function callFirst<T = any>(obj: any, names: string[], ...args: any[]): Promise<T> {
  for (const n of names) {
    const fn = obj?.[n];
    if (typeof fn === "function") return await fn.apply(obj, args);
  }
  const available = Object.keys(obj ?? {});
  throw new Error(
    `None of the methods [${names.join(", ")}] exist on Storacha client. Available: ${available.join(", ")}`
  );
}

// ---------- Core helpers ----------
export async function putFile(
  file: File | Blob | Uint8Array | ArrayBuffer,
  opts: PutOptions = {}
): Promise<string> {
  ensureServer();
  const { filename } = opts;

  let payload: Blob;
  if (file instanceof Blob) {
    payload = file;
  } else if (file instanceof Uint8Array) {
    payload = new Blob([file], { type: opts.contentType || "application/octet-stream" });
  } else if (file instanceof ArrayBuffer) {
    payload = new Blob([new Uint8Array(file)], { type: opts.contentType || "application/octet-stream" });
  } else {
    payload = file as Blob; // File extends Blob
  }

  // We’ll create a temporary client using managed creds by default.
  const client = makeStorachaClient(resolveCreds({ mode: "managed" }));

  const res = await callFirst<any>(
    client,
    ["put", "upload", "store", "add", "uploadFile", "putFile"],
    payload,
    { filename }
  );

  if (typeof res === "string") return res;
  const maybe = res?.cid ?? res?.CID ?? res?.root?.cid ?? res?.root?.CID ?? res?.value ?? res?.id;
  if (!maybe) throw new Error("Storacha putFile: Could not determine CID from response");
  return String(maybe);
}

export async function putJSON<T = unknown>(data: T, opts: PutOptions = {}): Promise<string> {
  ensureServer();
  const blob = new Blob([JSON.stringify(data)], {
    type: opts.contentType || "application/json",
  });
  const filename = opts.filename || "data.json";
  return putFile(blob, { filename, contentType: blob.type });
}

// ---------- Compatibility helper for your route ----------
/**
 * Upload JSON and return { cid, bytes }.
 * - Respects `mode: 'byo' | 'managed'`
 * - Supports managed overrides (env-based by default)
 * - Uses the latest Storacha client shape { agent: { secret, did? }, space, endpoint }
 */
export async function uploadJSONSnapshot(
  json: unknown,
  opts: UploadJSONSnapshotOpts = {}
): Promise<{ cid: string; bytes: number }> {
  ensureServer();
  const creds = resolveCreds(opts);
  const client = makeStorachaClient(creds);

  const text = JSON.stringify(json);
  const bytes = new TextEncoder().encode(text).length;
  const blob = new Blob([text], { type: "application/json" });
  const filename = opts.filename ?? `snapshot-${Date.now()}.json`;

  const res = await callFirst<any>(
    client,
    ["put", "upload", "store", "add", "uploadFile", "putFile"],
    blob,
    { filename }
  );

  let cid: string;
  if (typeof res === "string") cid = res;
  else {
    const maybe = res?.cid ?? res?.CID ?? res?.root?.cid ?? res?.root?.CID ?? res?.value ?? res?.id;
    if (!maybe) throw new Error("Storacha uploadJSONSnapshot: Could not determine CID from response");
    cid = String(maybe);
  }

  return { cid, bytes };
}

// ---------- Optional getters (handy for reads) ----------
export async function getBytes(cid: string): Promise<Uint8Array> {
  ensureServer();
  const client = makeStorachaClient(resolveCreds({ mode: "managed" }));

  try {
    const res = await callFirst<any>(client, ["get", "fetch", "retrieve", "cat"], cid);
    if (res instanceof Uint8Array) return res;
    if (res?.arrayBuffer) return new Uint8Array(await res.arrayBuffer());
    if (res?.blob) return new Uint8Array(await (await res.blob()).arrayBuffer());
    if (res?.data instanceof ArrayBuffer) return new Uint8Array(res.data);
    if (res?.files?.[0]?.arrayBuffer) return new Uint8Array(await res.files[0].arrayBuffer());
  } catch {
    // fall through to gateway
  }

  const endpoint = process.env.STORACHA_ENDPOINT?.replace(/\/+$/, "");
  const url = endpoint ? `${endpoint}/${encodeURIComponent(cid)}` : `https://w3s.link/ipfs/${cid}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Gateway fetch failed: ${r.status} ${r.statusText}`);
  return new Uint8Array(await r.arrayBuffer());
}

export async function getJSON<T = unknown>(cid: string): Promise<T> {
  ensureServer();
  const bytes = await getBytes(cid);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}
