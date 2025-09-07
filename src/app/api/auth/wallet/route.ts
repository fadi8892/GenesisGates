import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { verifyMessage, keccak256, toUtf8Bytes } from 'ethers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = requireSession();
    await ensureSchema();
    const { rows } = await sql`select wallet_address, wallet_sig_hash from users where id=${userId}`;
    return NextResponse.json({
      walletAddress: rows?.[0]?.wallet_address ?? null,
      walletSigHash: rows?.[0]?.wallet_sig_hash ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, email } = requireSession();
    const body = await req.json().catch(() => ({}));
    const message = body?.message as string;
    const signature = body?.signature as string;
    if (!message || !signature) throw new Error('Missing message or signature');
    if (!email || !message.includes(email)) throw new Error('Message must include email');

    const address = verifyMessage(message, signature);
    const sigHash = keccak256(toUtf8Bytes(signature));

    await ensureSchema();
    await sql`update users set wallet_address=${address}, wallet_sig_hash=${sigHash} where id=${userId}`;

    return NextResponse.json({ ok: true, walletAddress: address, sigHash });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Verification failed' }, { status: 400 });
  }
}
