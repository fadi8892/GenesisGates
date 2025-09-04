// src/lib/ids.ts
// Simple URL-safe short id for Tree IDs
export function shortTreeId() {
  // 10-char base36 random
  return Math.random().toString(36).slice(2, 12).toUpperCase();
}
