import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000';
}

async function fetchCreator(slug: string) {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/creators/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPlans(slug: string) {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/creators/${encodeURIComponent(slug)}/plans`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params;
  const creator = await fetchCreator(p.slug);
  const title = creator ? `${creator.display_name} | اشتراک کریتور` : `Creator ${p.slug}`;
  const description = creator?.bio || 'صفحه عمومی کریتور';
  return { title, description };
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params;
  const creator = await fetchCreator(p.slug);
  const plans = await fetchPlans(p.slug);

  if (!creator) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl text-sm opacity-75">کریتور پیدا نشد.</div>
      </main>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creator.display_name,
    description: creator.bio || '',
    url: `/creators/${creator.slug}`,
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">{creator.display_name}</h1>
        <p className="mt-2 text-sm opacity-80">@{creator.slug}</p>
        <p className="mt-4 text-sm leading-7 opacity-90">{creator.bio || 'بدون بیوگرافی'}</p>
        <h2 className="mt-8 text-xl font-semibold">پلن‌ها</h2>
        <div className="mt-4 grid gap-3">
          {plans.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
              <div className="font-semibold">{p.title}</div>
              <div className="mt-1 text-sm opacity-80">{p.description || 'بدون توضیح'}</div>
              <div className="mt-2 text-xs opacity-70">
                {p.price_amount} {p.currency} / {p.interval}
              </div>
            </div>
          ))}
          {plans.length === 0 ? <div className="text-sm opacity-70">پلن فعالی وجود ندارد.</div> : null}
        </div>
      </div>
    </main>
  );
}
