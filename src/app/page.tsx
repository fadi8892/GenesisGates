import { redirect } from 'next/navigation';
import { getSessionOrNull } from '@/lib/auth';
import LoginClient from './LoginClient';

export default function Landing() {
  const session = getSessionOrNull();
  if (session) redirect('/dashboard');
  return <LoginClient />;
}