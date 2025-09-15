// src/lib/storage.ts
// Server-only Storacha client factory + convenience helpers.
// Secrets stay on the server; do NOT import this into client components.

import "server-only";
import { create } from "@storacha/client";

// ---- Types ----
type MakeClientParams = {
  agentSecret: string;
  spaceDid: string;
  endpoint?: string;
};

type PutOptions = {
  /** Optional filename hint when uploading bytes/JSON */
  filename?: string;
  /** Optional content type for bytes/JSON */
  contentType?: string;
};

// Small runtime guard to avoid accidental client-side usage
function ensureServer() {
  // In edge runtimes, window is undefined as well; this still holds.
  // Next.js "server-only" already enforces, this is an extra safety net.
  // @ts-ignore
  if (typeof window !== "undefined") {
    throw new Error("storage.ts can only be used on the server.");
  }
}

// ---- Client singleton ----
let _client: any | null = null;

/**
 * Construct a Storacha client using a version-tolerant shape.
 * Some SDK versions expect { agent: { secret, did? }, space, endpoint? }.
 */
export function makeStorachaClient(params: MakeClientParams) {
  const { agentSecret, spaceDid, endpoint } = params;

  if (!agentSecret) throw new Error("Missing STORACHA_AGENT_SECRET");
  if (!spaceDid) throw new Error("Missing STORACHA_SPACE_DID");

  // NOTE:
  // The latest typings may not accept "agentSecret" at the top level.
  // We pass it under agent.secret and cast to any to avoid TS shape drift.
  const client = (create as any)({
    agent: { secret: agentSecret },
    space: spaceDid,
    endpoint,
  });

  return client;
}

/**
 * Get a cached client from environment variables.
 */
export function getStorachaClient() {
  ensureServer();
  if (_client) return _client;

  const agentSecret = process.env.STORACHA_AGENT_SECRET ?? "";
  const spaceDid = process.env.STORACHA_SPACE_DID ?? "";
  const endpoint = process.env.STORACHA_ENDPOINT || undefined;

  _client = makeStorachaClient({ agentSecret, spaceDid, endpoint });
  return _client;
}

// ---- Version-tolerant method shims ----

/**
 * Call the first available method name on the client with args.
 * Helps tolerate minor API naming differences across @storacha/client versions.
 */
async function callFirst<T = any>(obj: any, names: string[], ...args: any[]): Promise<T> {
  for (const n of names) {
    const fn = obj?.[n];
    if (typeof fn === "function") {
      return await fn.apply(obj, args);
    }
  }
  const available = Object.keys(obj ?? {});
  throw new Error(
    `None of the methods [${names.join(", ")}] exist on Storacha client. Available: ${available.join(", ")}`
  );
}

// ---- High-level helpers ----

/**
 * Upload a File/Blob/Uint8Array and return a CID (or equivalent ID).
 */
export async function putFile(
  file: File | Blob | Uint8Array | ArrayBuffer,
  opts: PutOptions = {}
): Promise<string> {
  ensureServer();
  const client = getStorachaClient();

  // Normalize to Blob for convenience
  let payload: Blob;
  if (file instanceof Blob) {
    payload = file;
  } else if (file instanceof Uint8Array) {
    payload = new Blob([file], { type: opts.contentType || "application/octet-stream" });
  } else if (file instanceof ArrayBuffer) {
    payload = new Blob([new Uint8Array(file)], { type: opts.contentType || "application/octet-stream" });
  } else {
    // File is a browser File which extends Blob; in server context you usually pass Buffer/Blob.
    payload = file as Blob;
  }

  // Try common method names used by content-addressed clients
  // e.g., put / upload / store / add (depending on SDK version)
  const cid = await callFirst<string>(
    client,
    ["put", "upload", "store", "add", "uploadFile", "putFile"],
    payload,
    { filename: opts.filename }
  );

  // Some SDKs return objects { cid } or { root: { cid } }
  if (typeof cid === "string") return cid;

  const maybeCid =
    (cid && (cid.cid || cid.CID || cid.root?.cid || cid.root?.CID || cid.value || cid.id)) ?? null;

  if (!maybeCid) {
    throw new Error("Storacha putFile: Could not determine CID from response");
  }
  return String(maybeCid);
}

/**
 * Upload JSON and return a CID.
 */
export async function putJSON<T = unknown>(data: T, opts: PutOptions = {}): Promise<string> {
  ensureServer();
  const blob = new Blob([JSON.stringify(data)], {
    type: opts.contentType || "application/json",
  });
  const filename = opts.filename || "data.json";
  return putFile(blob, { filename, contentType: blob.type });
}

/**
 * Fetch raw bytes by CID. Falls back to gateway fetch if client lacks a getter.
 */
export async function getBytes(cid: string): Promise<Uint8Array> {
  ensureServer();
  const client = getStorachaClient();

  // Try client methods first
  try {
    const res = await callFirst<any>(client, ["get", "fetch", "retrieve", "cat"], cid);
    // If the SDK gives back a Response/Blob/AsyncIterable/etc., normalize it:
    if (res instanceof Uint8Array) return res;
    if (res?.arrayBuffer) {
      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    }
    if (res?.blob) {
      const blob = await res.blob();
      const ab = await blob.arrayBuffer();
      return new Uint8Array(ab);
    }
    // Some SDKs return { files: [...] } or { data: ArrayBuffer }
    if (res?.data instanceof ArrayBuffer) {
      return new Uint8Array(res.data);
    }
    if (res?.files?.[0]?.arrayBuffer) {
      const ab = await res.files[0].arrayBuffer();
      return new Uint8Array(ab);
    }
  } catch {
    // fall through to gateway
  }

  // Gateway fallback (requires a readable public gateway/endpoint)
  const endpoint = process.env.STORACHA_ENDPOINT?.replace(/\/+$/, "");
  const url = endpoint ? `${endpoint}/${encodeURIComponent(cid)}` : `https://w3s.link/ipfs/${cid}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Gateway fetch failed: ${r.status} ${r.statusText}`);
  const ab = await r.arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Fetch JSON by CID.
 */
export async function getJSON<T = unknown>(cid: string): Promise<T> {
  ensureServer();
  const bytes = await getBytes(cid);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

/**
 * (Optional) Check a CID’s status if the SDK supports it.
 */
export async function getStatus(cid: string): Promise<any> {
  ensureServer();
  const client = getStorachaClient();
  return callFirst<any>(client, ["status", "info", "head"], cid);
}
