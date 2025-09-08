// src/app/api/storage/snapshot/route.ts
import { NextResponse } from 'next/server'
import { publishSnapshot } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mode, byoProofBase64, json } = body

    const result = await publishSnapshot({
      mode,
      byoProofBase64,
      json,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Snapshot upload failed:', err)
    return NextResponse.json(
      { error: err.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
