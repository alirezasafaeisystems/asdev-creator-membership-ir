import crypto from 'crypto';

const faDigits = '۰۱۲۳۴۵۶۷۸۹';
const arDigits = '٠١٢٣٤٥٦٧٨٩';

function toEnDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String(faDigits.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arDigits.indexOf(d)));
}

export function normalizeCreatorSlug(input: unknown): { slug: string; warnings: string[] } {
  const warnings: string[] = [];
  let slug = String(input ?? '').trim().toLowerCase();

  slug = slug.normalize('NFKD');
  slug = slug.replace(/[\u0300-\u036f]/g, '');
  slug = slug.replace(/[\s_]+/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (slug.length < 3) {
    const seed = String(input ?? '').trim();
    const suffix = crypto.createHash('sha256').update(seed || 'creator').digest('hex').slice(0, 8);
    slug = `c-${suffix}`;
    warnings.push('SLUG_TOO_SHORT_FALLBACK');
  }

  if (slug.length > 32) {
    slug = slug.slice(0, 32).replace(/-+$/g, '');
    warnings.push('SLUG_TRUNCATED');
  }

  return { slug, warnings };
}

export function normalizeEmail(input: unknown): string {
  return String(input ?? '').trim().toLowerCase();
}

export function normalizeIranMobile(input: unknown): string | null {
  let phone = toEnDigits(String(input ?? '')).trim();
  phone = phone.replace(/[\s()-]/g, '');

  if (phone.startsWith('+98')) phone = `0${phone.slice(3)}`;
  if (phone.startsWith('98')) phone = `0${phone.slice(2)}`;

  if (!/^09\d{9}$/.test(phone)) return null;
  return phone;
}

export function normalizeReturnUrl(input: unknown): string {
  const url = String(input ?? '').trim();
  if (!url.startsWith('/')) return '/';
  if (url.startsWith('//')) return '/';
  if (url.startsWith('/api') && (url === '/api' || url.startsWith('/api/'))) return '/';
  return url;
}
