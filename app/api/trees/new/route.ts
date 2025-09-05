import { NextResponse } from 'next/server'
import { createGenesisTree } from '@/lib/storage'


export async function POST(){
try{
const { cid } = await createGenesisTree()
return NextResponse.json({ cid })
}catch(e:any){
return NextResponse.json({ error: e.message }, { status: 500 })
}
}
