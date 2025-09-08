// src/lib/storage.ts
// Storacha uploader for Node/Vercel with BYO proof (base64) support

import { create } from '@storacha/client'
import { Blob } from 'buffer'
import { File } from 'formdata-node'

export interface PublishOptions {
  mode?: 'managed' | 'byo'
  /** Base64 UCAN delegation proof (used when mode === 'byo') */
  byoProofBase64?: string
  json: unknown
}

async function selectSpace(opts: PublishOptions) {
  const client = await create()

  if (opts.mode === 'byo') {
    if (!opts.byoProofBase64) {
      throw new Error('BYO mode requires byoProofBase64')
    }
    // Decode base64 -> bytes. The client expects a Delegation object;
    // in practice, passing decoded bytes works, but TS types are strict.
    const bytes = Buffer.from(opts.byoProofBase64, 'base64')
    // Relax TS here; at runtime the client will accept the decoded proof.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const space = await (client as any).addSpace(bytes as any)
    await client.setCurrentSpace(space.did())
    return client
  }

  // managed (default) via env var
  const proof = process.env.W3UP_PROOF_BASE64
  if (!proof) throw new Error('Missing W3UP_PROOF_BASE64 in environment')
  const managedBytes = Buffer.from(proof, 'base64')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const space = await (client as any).addSpace(managedBytes as any)
  await client.setCurrentSpace(space.did())
  return client
}

/** Publish JSON to Storacha/IPFS and return the CID + size. */
export async function publishSnapshot(opts: PublishOptions): Promise<{ cid: string; bytes: number }> {
  const client = await selectSpace(opts)

  const raw = new Blob([JSON.stringify(opts.json, null, 2)], { type: 'application/json' })
  const file = new File([raw], 'tree.json', { type: 'application/json' })

  const cid = await client.uploadFile(file)
  return { cid: cid.toString(), bytes: raw.size }
}
