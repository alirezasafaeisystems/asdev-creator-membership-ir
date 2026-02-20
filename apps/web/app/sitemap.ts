import type { MetadataRoute } from 'next';

function getWebBase() {
  return process.env.NEXT_PUBLIC_WEB_BASE_URL || 'http://127.0.0.1:3000';
}

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000';
}

async function fetchCreatorSlugs() {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/creators?limit=200`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((x: any) => String(x.slug || '')).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getWebBase().replace(/\/+$/, '');
  const slugs = await fetchCreatorSlugs();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/creators`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...slugs.map((slug: string) => ({
      url: `${base}/creators/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
