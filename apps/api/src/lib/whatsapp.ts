import { env } from '../config/env';
import { logger } from './logger';

/** Strip control characters and cap length: user text goes into a message we send onward. */
export const clean = (s: string, max = 300) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

/** Click-to-chat link. Used as a fallback when the Cloud API is not configured or fails. */
export const waLink = (text: string) => `https://wa.me/${env.WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(text)}`;

/**
 * Sends a text to the client's WhatsApp via the official Cloud API.
 * Host is fixed (no user-controlled URL), so there is no SSRF surface (A10).
 * NOTE: free-form text is only delivered inside WhatsApp's 24h customer-service window;
 * for guaranteed delivery create an approved message template and send that instead.
 */
export async function notifyOwner(text: string): Promise<boolean> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: env.WHATSAPP_ADMIN_NUMBER, type: 'text', text: { body: text.slice(0, 4000) } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) logger.warn({ status: res.status }, 'WhatsApp API rejected message');
    return res.ok;
  } catch (err) {
    logger.warn({ err }, 'WhatsApp API unreachable');
    return false;
  }
}
