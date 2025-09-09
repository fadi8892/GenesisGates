// src/app/api/storage/snapshot/route.ts
import { NextResponse } from 'next/server';
import { uploadJSONSnapshot } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BodyShape = {
  json: unknown;
  filename?: string;

  // Choose how creds are supplied:
  mode?: 'byo' | 'managed';

  // BYO creds (when mode === 'byo')
  agentSecret?: string;
  spaceDid?: string;
  endpoint?: string;

  // Managed overrides (optional; otherwise pulled from env)
  managedAgentSecret?: string;
  managedSpaceDid?: string;
  managedEndpoint?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BodyShape;

    if (!body || typeof body !== 'object' || typeof body.json === 'undefined') {
      return NextResponse.json({ error: 'Missing body.json' }, { status: 400 });
    }

    const { cid, bytes } = await uploadJSONSnapshot(body.json, {
      filename: body.filename,
      mode: body.mode ?? 'managed',
      agentSecret: body.agentSecret,
      spaceDid: body.spaceDid,
      endpoint: body.endpoint,
      managedAgentSecret: body.managedAgentSecret,
      managedSpaceDid: body.managedSpaceDid,
      managedEndpoint: body.managedEndpoint,
    });

    return NextResponse.json({ cid, bytes }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Storacha upload failed' },
      { status: 400 }
    );
  }
}
