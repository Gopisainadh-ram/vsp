// Normalises Indian 10-digit mobiles and E.164 numbers to "+<country><number>".
export function tryNormalizePhone(raw: string): string | null {
  const d = raw.replace(/[\s\-()]/g, '');
  if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
  if (/^\+[1-9]\d{9,14}$/.test(d)) return d;
  return null;
}
