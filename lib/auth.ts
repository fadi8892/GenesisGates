import { supabase } from './supabase';

/**
 * Request a magic link for login. This sends an email to the user with a one-time link.
 *
 * @param email - The user email
 * @returns Response from Supabase
 */
export async function signInWithMagicLink(email: string) {
  return supabase.auth.signInWithOtp({ email });
}

/**
 * Load the current authenticated session, if available.
 */
export async function getSession() {
  return supabase.auth.getSession();
}