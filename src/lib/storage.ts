// src/lib/storage.ts
// Modern Storacha (w3up) uploader for Node/Vercel

import { create } from '@storacha/client'
import { Blob } from 'buffer'          // Ensure Blob exists in Node
import { File } from 'formdata-node'   // File polyfill for Node

export interface PublishOptions {
  /**
   * managed  -> use server-side proof from env: W3UP_PROOF_BASE64
   * byo       -> caller provides a base64 UCAN delegation proof
   */
  mode?: 'managed' | 'byo'
  /** Base64 UCAN delegation proof (only used when mode === 'byo') */
  byoProofBase64?: string
  /** The JSON you want to publish (e.g., your tree snapshot) */
  json: unknown
}

async function selectSpace(opts: PublishOptions) {
  const client = await create()

  if (opts.mode === 'byo') {
    if (!opts.byoProofBase64) {
      throw new Error('BYO mode requires byoProofBase64')
    }
    const space = await client.addSpace(opts.byoProofBase64)
    await client.setCurrentSpace(space.did())
    return client
  }

  // managed (default)
  const proof = process.env.W3UP_PROOF_BASE64
  if (!proof) throw new Error('Missing W3UP_PROOF_BASE64 in environment')
  const space = await client.addSpace(proof)
  await client.setCurrentSpace(space.did())
  return client
}

/**
 * Publishes the provided JSON to Storacha/IPFS and returns its CID and byte size.
 */
export async function publishSnapshot(opts: PublishOptions): Promise<{ cid: string; bytes: number }> {
  const client = await selectSpace(opts)

  const raw = new Blob(
    [JSON.stringify(opts.json, null, 2)],
    { type: 'application/json' }
  )

  // Use Node-compatible File
  const file = new File([raw], 'tree.json', { type: 'application/json' })

  const cid = await client.uploadFile(file)
  return { cid: cid.toString(), bytes: raw.size }
}
