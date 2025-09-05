import './globals.css'
import type { Metadata } from 'next'
import TopNav from '@/components/TopNav'


export const metadata: Metadata = {
title: 'GenesisGates',
description: 'Family trees, maps, and more',
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body>
<TopNav />
<main className="max-w-6xl mx-auto p-4">{children}</main>
</body>
</html>
)
}
