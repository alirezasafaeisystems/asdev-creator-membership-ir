export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">پلتفرم عضویت کریتور (Local‑First)</h1>
        <p className="mt-4 text-sm opacity-80">
          این یک اسکلت اولیه UI است (فونت‌ها self‑hosted) و برای شروع توسعه ماژول‌ها استفاده می‌شود.
        </p>
        <ul className="mt-6 list-disc pr-6 text-sm leading-7 opacity-90">
          <li>بدون وابستگی runtime به CDN</li>
          <li>فونت‌های محلی از PersianToolbox</li>
          <li>آماده برای توسعه Dashboard / Payments / Subscriptions</li>
        </ul>
      </div>
    </main>
  );
}

