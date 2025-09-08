// src/lib/storage.ts
import { create, File } from '@storacha/client'

export interface PublishOptions {
  mode?: 'managed' | 'byo'
  byoProofBase64?: string
  json: any
}

export async function publishSnapshot(opts: PublishOptions) {
  const client = await create()

  if (opts.mode === 'byo' && opts.byoProofBase64) {
    // User provided a base64 UCAN delegation proof
    const space = await client.addSpace(opts.byoProofBase64)
    await client.setCurrentSpace(space.did())
  } else {
    // Managed mode: use proof stored in env variable
    const proof = process.env.W3UP_PROOF_BASE64
    if (!proof) throw new Error('Missing W3UP_PROOF_BASE64 in environment')
    const space = await client.addSpace(proof)
    await client.setCurrentSpace(space.did())
  }

  const raw = new Blob([JSON.stringify(opts.json, null, 2)], {
    type: 'application/json',
  })
  const file = new File([raw], 'tree.json', { type: 'application/json' })
  const cid = await client.uploadFile(file)

  return { cid: cid.toString(), bytes: raw.size }
}
