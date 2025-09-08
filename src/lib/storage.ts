// src/lib/storage.ts
import 'server-only';
import { create } from '@storacha/client';

type UploadOpts =
  | {
      json: unknown;
      token?: string;
      endpoint?: string;
      filename?: string;
    }
  | {
      json: unknown;
      mode?: 'byo' | 'managed';
      byoToken?: string;
      endpoint?: string;
      filename?: string;
    };

export type UploadResult = {
  cid: string;
  bytes: number;
};

/** Helper: pick token from opts or env */
function getTokenFrom(opts: UploadOpts): string | undefined {
  return (
    // @ts-expect-error support both shapes
    opts.token ??
    opts.byoToken ??
    process.env.STORACHA_TOKEN
  );
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

  // Serialize JSON → File
  const json = JSON.stringify(opts.json, null, 2);
  const file = new File([json], filename, { type: 'application/json' });
  const bytes = new TextEncoder().encode(json).length;

  // Build client
  const token = getTokenFrom(opts);
  const endpoint = (opts as any).endpoint as string | undefined;
  const client = getStorachaClient({ token, endpoint });

  // Upload (API uses `put` for files)
  const cid = await client.put([file], { name: filename });

  return { cid: cid.toString(), bytes };
}
