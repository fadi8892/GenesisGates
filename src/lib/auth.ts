import { getStore } from "./db";

export function issueOtp(email: string) {
  const code = Math.floor(100000 + Math.random()*900000).toString();
  getStore().otps.set(email, code);
  return code;
}

export function verifyOtp(email: string, code: string) {
  const match = getStore().otps.get(email);
  if (match && match === code) {
    getStore().otps.delete(email);
    return true;
  }
  return false;
}

export function createSession(email: string) {
  const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
  getStore().sessions.set(sid, email);
  return sid;
}

export function emailFromSession(cookieHeader?: string) {
  if (!cookieHeader) return null;
  const cookie = Object.fromEntries(cookieHeader.split(";").map(s => s.trim().split("=").map(decodeURIComponent)));
  const sid = cookie["gg_session"];
  if (!sid) return null;
  return getStore().sessions.get(sid) ?? null;
}
