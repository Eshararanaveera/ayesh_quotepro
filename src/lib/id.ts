/**
 * Unique ID that works everywhere. `crypto.randomUUID()` only exists in secure
 * contexts (HTTPS or localhost), so testing on a phone over the LAN would crash without the fallback.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
