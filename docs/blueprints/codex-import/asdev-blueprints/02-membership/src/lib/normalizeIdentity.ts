// 02-membership/src/lib/normalizeIdentity.ts
const faDigits = "۰۱۲۳۴۵۶۷۸۹";
const arDigits = "٠١٢٣٤٥٦٧٨٩";

function toEnDigits(s: string) {
  return s.replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)))
          .replace(/[٠-٩]/g, (d) => String(arDigits.indexOf(d)));
}

export function normalizeEmail(emailRaw: string) {
  return String(emailRaw ?? "").trim().toLowerCase();
}

// خروجی پیشنهادی: 09xxxxxxxxx
export function normalizeIranMobile(phoneRaw: string): string | null {
  let p = toEnDigits(String(phoneRaw ?? "")).trim();
  p = p.replace(/[\s()-]/g, "");

  if (p.startsWith("+98")) p = "0" + p.slice(3);
  if (p.startsWith("98")) p = "0" + p.slice(2);

  if (!/^09\d{9}$/.test(p)) return null;
  return p;
}
