import { Web3Storage, File } from 'web3.storage';

export interface PublishOptions {
  provider?: 'web3storage' | 'storacha';
  mode?: 'byo' | 'managed';
  byoToken?: string;
  json: any;
}

export async function publishSnapshot(opts: PublishOptions): Promise<{ cid: string; bytes: number }> {
  const raw = Buffer.from(JSON.stringify(opts.json, null, 2));
  const bytes = raw.byteLength;

  const provider = opts.provider || 'web3storage';
  if (provider !== 'web3storage') throw new Error('Only web3.storage supported in this build');

  const token = opts.mode === 'byo'
    ? (opts.byoToken || '')
    : (process.env.WEB3_TOKEN || '');

  if (!token) throw new Error('No token available for upload');

  const client = new Web3Storage({ token });
  const file = new File([raw], 'tree.json', { type: 'application/json' });
  const cid = await client.put([file], { wrapWithDirectory: false });
  return { cid, bytes };
}
