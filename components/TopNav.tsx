'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'


const tabs = [
{ href: '/', label: 'Home' },
{ href: '/legacy', label: 'Legacy Viewers' },
{ href: '/pro', label: 'Go Pro' },
]


export default function TopNav() {
const pathname = usePathname()
return (
<header className="border-b bg-white">
<div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
<Link href="/" className="font-semibold">GenesisGates</Link>
<nav className="flex gap-2">
{tabs.map(t => (
<Link key={t.href} href={t.href} className={`px-3 py-1.5 rounded-2xl text-sm ${pathname===t.href? 'bg-black text-white':'hover:bg-gray-100'}`}>{t.label}</Link>
))}
</nav>
</div>
</header>
)
}
