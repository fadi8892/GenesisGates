// src/app/api/storage/snapshot/route.ts
import { NextResponse } from 'next/server';
import { uploadJSONSnapshot } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BodyShape = {
  treeId?: string;
  json: unknown;
  mode?: 'byo' | 'managed';
  byoToken?: string;
  token?: string;         // allow alt key
  endpoint?: string;
  filename?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyShape;

    if (!body || typeof body !== 'object' || !('json' in body)) {
      return NextResponse.json({ error: 'Missing "json" payload' }, { status: 400 });
    }

    const result = await uploadJSONSnapshot({
      json: body.json,
      // prefer explicit token/byoToken if provided, else env
      token: body.token ?? body.byoToken,
      endpoint: body.endpoint,
      filename: body.filename ?? 'tree.json',
      mode: body.mode,          // accepted by our helper signature
      byoToken: body.byoToken,  // accepted by our helper signature
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
