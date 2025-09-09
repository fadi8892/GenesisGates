// src/lib/storage.ts
import 'server-only';

/**
 * Strongly-typed result for an upload
 */
export type UploadResult = {
  cid: string;
  bytes: number;
};

export type UploadJSONOptions = {
  filename?: string;
  /**
   * Credential mode:
   *  - 'byo'     : read from options provided to the function (agent/space)
   *  - 'managed' : read from environment variables
   */
  mode?: 'byo' | 'managed';

  // BYO fields (when mode === 'byo')
  agentSecret?: string;      // e.g. agent key / secret produced by `storacha agent create`
  spaceDid?: string;         // e.g. "did:key:..."
  endpoint?: string;         // optional custom endpoint

  // Managed fields (when mode === 'managed', these are read from env if not overridden)
  managedAgentSecret?: string;
  managedSpaceDid?: string;
  managedEndpoint?: string;
};

/**
 * Upload a JSON snapshot to Storacha and return the CID + size.
 * Uses a dynamic import to keep the Storacha SDK out of any client/edge bundle.
 */
export async function uploadJSONSnapshot(
  json: unknown,
  opts: UploadJSONOptions = {}
): Promise<UploadResult> {
  const payload = JSON.stringify(json ?? {}, null, 0);
  const bytes = new TextEncoder().encode(payload).byteLength;

  // Resolve creds
  const mode = opts.mode ?? 'managed';

  const agentSecret =
    mode === 'byo'
      ? (opts.agentSecret ?? '')
      : (opts.managedAgentSecret ??
         process.env.STORACHA_AGENT_SECRET ??
         '');

  const spaceDid =
    mode === 'byo'
      ? (opts.spaceDid ?? '')
      : (opts.managedSpaceDid ??
         process.env.STORACHA_SPACE_DID ??
         '');

  const endpoint =
    (mode === 'byo' ? opts.endpoint : opts.managedEndpoint) ??
    process.env.STORACHA_ENDPOINT ??
    undefined;

  if (!agentSecret) {
    throw new Error(
      "Storacha: missing agent secret. Provide 'agentSecret' (mode: 'byo') or set STORACHA_AGENT_SECRET (mode: 'managed')."
    );
  }
  if (!spaceDid) {
    throw new Error(
      "Storacha: missing space DID. Provide 'spaceDid' (mode: 'byo') or set STORACHA_SPACE_DID (mode: 'managed')."
    );
  }

  // Dynamically import the SDK so it stays server-only
  const { create } = await import('@storacha/client');

  // Create a client. The exact option names may vary across SDK versions,
  // so we defensively pass common fields; the SDK ignores unknown ones.
  const client: any = create({
    agentSecret,
    space: spaceDid,
    endpoint, // optional
  });

  // Try a few common method shapes to be robust across SDK versions.
  // Prefer JSON-focused helpers if available; otherwise fall back to a generic upload.
  let cid: string | undefined;

  if (typeof client.uploadJSON === 'function') {
    const res = await client.uploadJSON({
      data: json,
      filename: (opts.filename ?? 'tree.json'),
    });
    cid = (res?.cid || res?.root?.cid || res?.result?.cid);
  } else if (typeof client.upload === 'function') {
    const res = await client.upload({
      data: payload,
      mimeType: 'application/json',
      filename: (opts.filename ?? 'tree.json'),
    });
    cid = (res?.cid || res?.root?.cid || res?.result?.cid);
  } else if (typeof client.put === 'function') {
    // Some storage clients expose "put(File|Blob[])"-style APIs
    const { Blob } = await import('buffer'); // Node18+: global Blob exists; this is a no-op fallback
    const blob = new Blob([payload], { type: 'application/json' }) as any;
    const res = await client.put([blob], { wrapWithDirectory: false, filename: (opts.filename ?? 'tree.json') });
    cid = (res?.cid || res?.root?.cid || res?.result?.cid || res);
  } else {
    throw new Error('Storacha client: no supported upload method found (expected uploadJSON, upload, or put).');
  }

  if (!cid || typeof cid !== 'string') {
    throw new Error('Storacha upload failed: missing CID in response.');
  }

  return { cid, bytes };
}
