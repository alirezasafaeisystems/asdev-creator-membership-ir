// 02-membership/src/lib/normalizeReturnUrl.ts
// ضد Open Redirect: فقط relative path
export function normalizeReturnUrl(returnUrlRaw: string | null | undefined): string {
  const s = String(returnUrlRaw ?? "").trim();

  if (!s.startsWith("/")) return "/";
  if (s.startsWith("//")) return "/";
  if (s.startsWith("/api/")) return "/";

  return s;
}
