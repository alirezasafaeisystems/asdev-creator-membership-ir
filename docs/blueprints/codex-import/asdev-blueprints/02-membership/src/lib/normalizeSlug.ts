// 02-membership/src/lib/normalizeSlug.ts
import crypto from "node:crypto";

export function normalizeCreatorSlug(inputRaw: string): { slug: string; warnings: string[] } {
  const warnings: string[] = [];
  let s = String(inputRaw ?? "").trim().toLowerCase();

  s = s.normalize("NFKD");
  s = s.replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[\s_]+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  if (s.length < 3) {
    const rnd = crypto.randomBytes(4).toString("hex");
    s = `c-${rnd}`;
    warnings.push("SLUG_TOO_SHORT_RANDOMIZED");
  }

  if (s.length > 32) {
    s = s.slice(0, 32).replace(/-+$/g, "");
    warnings.push("SLUG_TRUNCATED");
  }

  return { slug: s, warnings };
}
