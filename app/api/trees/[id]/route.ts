import { NextResponse } from 'next/server'
import { readTree } from '@/lib/storage'


export async function GET(_req: Request, { params }: { params: { id: string } }){
const tree = await readTree(params.id)
if (!tree) return new NextResponse('Not found', { status: 404 })
return NextResponse.json(tree)
}
