import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000';
}

async function fetchCreators(q: string) {
  const url = new URL('/api/v1/creators', getApiBase());
  if (q) url.searchParams.set('q', q);
  url.searchParams.set('limit', '24');
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

export default async function CreatorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = String(sp?.q || '');
  const creators = await fetchCreators(q);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">کشف کریتور‌ها</h1>
        <form className="mt-5" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="جستجو بر اساس نام یا slug"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm outline-none"
          />
        </form>
        <div className="mt-6 grid gap-3">
          {creators.map((c: any) => (
            <Link key={c.id} href={`/creators/${c.slug}`} className="rounded-xl border border-white/15 bg-white/5 p-4 hover:bg-white/10">
              <div className="text-lg font-semibold">{c.display_name}</div>
              <div className="mt-1 text-xs opacity-75">@{c.slug}</div>
              <div className="mt-2 text-sm opacity-80">{c.bio || 'بدون بیوگرافی'}</div>
            </Link>
          ))}
          {creators.length === 0 ? <div className="text-sm opacity-70">نتیجه‌ای پیدا نشد.</div> : null}
        </div>
      </div>
    </main>
  );
}
