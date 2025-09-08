// src/lib/storage.ts
import 'server-only';
import { create } from '@storacha/client';

type UploadOptsA = {
  json: unknown;
  token?: string;
  endpoint?: string;
  filename?: string;
};
type UploadOptsB = {
  json: unknown;
  mode?: 'byo' | 'managed';
  byoToken?: string;
  endpoint?: string;
  filename?: string;
};
type UploadOpts = UploadOptsA | UploadOptsB;

export type UploadResult = {
  cid: string;
  bytes: number;
};

/** Safely pick a token from opts (supports both shapes) or env */
function getTokenFrom(opts: UploadOpts): string | undefined {
  if ('token' in opts && opts.token) return String(opts.token);
  if ('byoToken' in opts && opts.byoToken) return String(opts.byoToken);
  return process.env.STORACHA_TOKEN || undefined;
}

/** Create a Storacha client */
function getStorachaClient(opts?: { token?: string; endpoint?: string }) {
  return create({
    token: opts?.token ?? process.env.STORACHA_TOKEN,
    endpoint: opts?.endpoint,
  });
}

/** Upload a JSON snapshot to Storacha */
export async function uploadJSONSnapshot(opts: UploadOpts): Promise<UploadResult> {
  const filename = (opts as any).filename || 'tree.json';

  // Serialize JSON → File (avoid Node Blob vs DOM Blob typing issues)
  const json = JSON.stringify(opts.json, null, 2);
  const file = new File([json], filename, { type: 'application/json' });
  const bytes = new TextEncoder().encode(json).length;

  const token = getTokenFrom(opts);
  const endpoint = (opts as any).endpoint as string | undefined;
  const client = getStorachaClient({ token, endpoint });

  // @storacha/client uses put(files, options)
  const cid = await client.put([file], { name: filename });

  return { cid: cid.toString(), bytes };
}

// Back-compat alias if other code imports publishSnapshot
export { uploadJSONSnapshot as publishSnapshot };
