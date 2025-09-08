// NEW: src/lib/storage.ts
import { create, File } from '@web3-storage/w3up-client';

export interface PublishOptions {
  provider?: 'storacha';          // default to storacha
  mode?: 'managed' | 'byo';
  // For BYO we now expect either an email login flow handled elsewhere,
  // or a base64 UCAN delegation proof string (advanced).
  byoProofBase64?: string;        // optional, advanced
  json: any;
}

export async function publishSnapshot(opts: PublishOptions) {
  const client = await create();                 // creates an agent in-browser/server
  // BYO path (advanced): user pastes a base64 delegation proof generated with the CLI
  //   storacha delegation create --space <SPACE_DID> --to <AGENT_DID> --base64
  if (opts.mode === 'byo' && opts.byoProofBase64) {
    const space = await client.addSpace(opts.byoProofBase64);
    await client.setCurrentSpace(space.did());
  } else {
    // Managed path: load your own pre-provisioned space (store proof securely in env/kv)
    const proof = process.env.W3UP_PROOF_BASE64!;
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());
  }

  const raw = new Blob([JSON.stringify(opts.json, null, 2)], { type: 'application/json' });
  const file = new File([raw], 'tree.json', { type: 'application/json' });
  const cid = await client.uploadFile(file);
  return { cid: cid.toString(), bytes: raw.size };
}
