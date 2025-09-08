import DashboardClient from './client';
import { requireSession } from '@/lib/auth';

export default function DashboardPage() {
  const { email } = requireSession();
  return <DashboardClient email={email} />;
}