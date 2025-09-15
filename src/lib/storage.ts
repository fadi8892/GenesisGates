// src/lib/storage.ts
// Server-only Storacha client factory + helpers.

import "server-only";
import { create } from "@storacha/client";

type MakeClientParams = {
  agentSecret: string;
  spaceDid: string;
  endpoint?: string;
};

type PutOptions = {
  filename?: string;
  contentType?: string;
};

// Prevent accidental client-side import
function ensureServer() {
  // @ts-ignore
  if (typeof window !== "undefined") {
    throw new Error("storage.ts can only be used on the server.");
  }
}

let _client: any | null = null;

export function makeStorachaClient({ agentSecret, spaceDid, endpoint }: MakeClientParams) {
  if (!agentSecret) throw new Error("Missing STORACHA_AGENT_SECRET");
  if (!spaceDid) throw new Error("Missing STORACHA_SPACE_DID");

  // ✅ FIX: move secret under agent; do NOT pass agentSecret at top level
  const client = (create as any)({
    agent: {
      // include did if your SDK/version requires it:
      // did: process.env.STORACHA_AGENT_DID,
      secret: agentSecret,
    },
    space: spaceDid,
    endpoint,
  });

  return client;
}

export function getStorachaClient() {
  ensureServer();
  if (_client) return _client;
  const agentSecret = process.env.STORACHA_AGENT_SECRET ?? "";
  const spaceDid = process.env.STORACHA_SPACE_DID ?? "";
  const endpoint = process.env.STORACHA_ENDPOINT || undefined;
  _client = makeStorachaClient({ agentSecret, spaceDid, endpoint });
  return _client;
}

// Call the first available method name (tolerates SDK naming differences)
async function callFirst<T = any>(obj: any, names: string[], ...args: any[]): Promise<T> {
  for (const n of names) {
    const fn = obj?.[n];
    if (typeof fn === "function") return await fn.apply(obj, args);
  }
  throw new Error(`None of the methods [${names.join(", ")}] exist on Storacha client`);
}

export async function putFile(
  file: File | Blob | Uint8Array | ArrayBuffer,
  opts: PutOptions = {}
): Promise<string> {
  ensureServer();
  const client = getStorachaClient();

  let payload: Blob;
  if (file instanceof Blob) {
    payload = file;
  } else if (file instanceof Uint8Array) {
    payload = new Blob([file], { type: opts.contentType || "application/octet-stream" });
  } else if (file instanceof ArrayBuffer) {
    payload = new Blob([new Uint8Array(file)], { type: opts.contentType || "application/octet-stream" });
  } else {
    payload = file as Blob; // File extends Blob in browsers
  }

  const res = await callFirst<any>(
    client,
    ["put", "upload", "store", "add", "uploadFile", "putFile"],
    payload,
    { filename: opts.filename }
  );

  if (typeof res === "string") return res;
  const maybe =
    (res && (res.cid || res.CID || res.root?.cid || res.root?.CID || res.value || res.id)) ?? null;
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

export async function getBytes(cid: string): Promise<Uint8Array> {
  ensureServer();
  const client = getStorachaClient();

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

export async function getStatus(cid: string): Promise<any> {
  ensureServer();
  const client = getStorachaClient();
  return callFirst<any>(client, ["status", "info", "head"], cid);
}
