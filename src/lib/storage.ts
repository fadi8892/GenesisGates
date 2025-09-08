// src/lib/storage.ts
import 'server-only';
import { create } from '@storacha/client';

export type UploadResult = {
  cid: string;
  bytes: number;
};

type UploadOpts = {
  json: unknown;
  filename?: string;
};

/**
 * Upload a JSON snapshot to Storacha using @storacha/client.
 * - No token is passed; the client manages auth per Storacha’s model.
 * - Uses client.uploadFile (single file) per docs.
 */
export async function uploadJSONSnapshot(opts: UploadOpts): Promise<UploadResult> {
  const filename = opts.filename || 'tree.json';

  // Serialize JSON → File (avoid Node Blob type mismatch)
  const json = JSON.stringify(opts.json, null, 2);
  const file = new File([json], filename, { type: 'application/json' });
  const bytes = new TextEncoder().encode(json).length;

  // Create client (no token option)
  const client = await create();

  // Upload single file (returns a CID-like object)
  const cid = await client.uploadFile(file);

  return { cid: cid.toString(), bytes };
}

// Back-compat alias if other code imports publishSnapshot
export { uploadJSONSnapshot as publishSnapshot };
