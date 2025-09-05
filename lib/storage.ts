import { TreeData } from './types'
if (!r.ok) throw new Error(`Fetch failed ${r.status}`)
return await r.json()
}
}


/**
* StorachaAdapter: calls your existing Storacha API/gateway.
* Implementations below assume you expose two endpoints on your infra:
* - POST STORACHA_SERVICE_URL/put-json -> { cid }
* - GET STORACHA_GATEWAY/<cid> -> raw JSON
* Replace with your actual endpoints if different.
*/
class StorachaAdapter implements StorageAdapter {
private service = process.env.STORACHA_SERVICE_URL || ''
private gateway = process.env.STORACHA_GATEWAY || 'https://ipfs.io/ipfs'
async putJSON(payload: unknown): Promise<string> {
const r = await fetch(`${this.service}/put-json`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'x-agent-key': process.env.STORACHA_AGENT_KEY || '' },
body: JSON.stringify({ space: process.env.STORACHA_SPACE_DID, payload })
})
if (!r.ok) throw new Error(`Storacha put failed ${r.status}`)
const j = await r.json() as { cid: string }
return j.cid
}
async getJSON(cidOrId: string): Promise<any> {
const r = await fetch(`${this.gateway}/${cidOrId}`, { cache: 'no-store' })
if (!r.ok) throw new Error(`Storacha get failed ${r.status}`)
return await r.json()
}
}


export function storage(): StorageAdapter {
if (BACKEND === 'web3') return new Web3StorageAdapter()
return new StorachaAdapter() // default to storacha
}


export async function createGenesisTree(label = 'new-tree'): Promise<{ cid: string; tree: TreeData }>{
const tree: TreeData = { id: 'pending', people: [] }
const cid = await storage().putJSON(tree)
return { cid, tree: { ...tree, id: cid } }
}


export async function readTree(cidOrId: string): Promise<TreeData | null> {
try {
const j = await storage().getJSON(cidOrId)
// normalize
return { id: cidOrId, people: Array.isArray(j.people) ? j.people : [] }
} catch {
return null
}
}
