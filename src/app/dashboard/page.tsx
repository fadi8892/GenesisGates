// src/app/dashboard/page.tsx
import { requireSession } from '@/lib/auth';
import DashboardClient from './client';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  try {
    const session = requireSession();
    return <DashboardClient email={session.email} />;
  } catch {
    redirect('/');
  }
}
