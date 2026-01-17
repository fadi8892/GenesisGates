'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createTree() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Check Limits again (Security)
  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
  const { count } = await supabase.from('trees').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  
  const limit = (profile?.tier === 'pro') ? 10 : 2;
  if ((count || 0) >= limit) return; // Silent fail or handle error

  // 2. Create Tree
  const { data, error } = await supabase.from('trees').insert({
    user_id: user.id,
    name: 'My New Family Tree'
  }).select().single();

  if (error) console.error(error);
  
  // 3. Redirect to the editor
  if (data) redirect(`/dashboard/tree/${data.id}`);
}