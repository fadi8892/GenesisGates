"use server";
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
// We use the Service Role here to bypass RLS for generating admin links
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      flowType: 'pkce',
    },
  }
);


export async function sendMagicLink(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` }
    });

    if (error || !data.properties?.action_link) throw new Error(error?.message || "Link gen failed");

    await resend.emails.send({
      from: 'Genesis Gates <auth@genesisgates.com>',
      to: [email],
      subject: 'Enter the Genesis Vault',
      html: `
        <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; text-align: center;">
          <h1 style="letter-spacing: -1px;">GENESIS GATES</h1>
          <p style="color: #888;">Secure Access Request</p>
          <a href="${data.properties.action_link}" style="background: #fff; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">OPEN VAULT</a>
        </div>
      `
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}