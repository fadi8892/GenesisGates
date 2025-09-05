'use client'
import { useState } from 'react'


export default function StartNewButton(){
const [busy, setBusy] = useState(false)
async function start(){
setBusy(true)
try{
const r = await fetch('/api/trees/new', { method:'POST' })
const j = await r.json()
if (j.error) throw new Error(j.error)
window.location.href = `/tree/${j.cid}`
}catch(e:any){
alert(e.message)
}finally{ setBusy(false) }
}
return (
<button onClick={start} disabled={busy} className="px-3 py-2 rounded-xl bg-black text-white">
{busy? 'Creating…' : 'Start New Tree'}
</button>
)
}
