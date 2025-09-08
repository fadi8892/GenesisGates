// src/app/api/storage/snapshot/route.ts
import { NextResponse } from 'next/server';
import { uploadJSONSnapshot } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BodyShape = {
  json?: unknown;
  filename?: string;
  // legacy fields may still be sent by the client, but we ignore them now:
  // token?: string; byoToken?: string; endpoint?: string; mode?: 'byo' | 'managed';
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyShape;

    if (!body || typeof body !== 'object' || body.json === undefined) {
      return NextResponse.json({ error: 'Missing "json" payload' }, { status: 400 });
    }

    const result = await uploadJSONSnapshot({
      json: body.json,
      filename: body.filename ?? 'tree.json',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('snapshot POST failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Snapshot failed' },
      { status: 500 }
    );
  }
}
