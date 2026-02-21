'use client';

import { useMemo, useState } from 'react';

type Summary = {
  schema: string;
  generatedAt: string;
  metrics: {
    activeSubscriptions: number;
    pendingPayments: number;
    failedPaymentsLast24h: number;
    callbacksLast24h: number;
    expiringNext7d: number;
  };
  findings: Array<{
    code: string;
    severity: string;
    message: string;
    recommendation: string;
  }>;
};

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000';
}

export default function AdminOpsPage() {
  const [token, setToken] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const metrics = useMemo(() => summary?.metrics || null, [summary]);

  async function loadSummary() {
    setError('');
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch(`${getApiBase()}/api/v1/admin/ops/summary`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || `Request failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as Summary;
      setSummary(data);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">Admin Ops Summary</h1>
        <p className="mt-2 text-sm opacity-80">این صفحه فقط با session token ادمین داده معتبر برمی‌گرداند (RBAC روی API enforce می‌شود).</p>

        <div className="mt-6 rounded-xl border border-white/20 bg-white/5 p-4">
          <label className="mb-2 block text-xs opacity-80">Admin Bearer Token</label>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="session token"
            className="w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={loadSummary}
            disabled={!token || loading}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Summary'}
          </button>
          {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
        </div>

        {summary ? (
          <div className="mt-6">
            <div className="mb-3 text-xs opacity-70">
              {summary.schema} | {new Date(summary.generatedAt).toLocaleString('fa-IR')}
            </div>
            {metrics ? (
              <div className="grid gap-3 md:grid-cols-5">
                <MetricCard title="ACTIVE SUBS" value={metrics.activeSubscriptions} />
                <MetricCard title="PENDING PAYMENTS" value={metrics.pendingPayments} />
                <MetricCard title="FAILED 24H" value={metrics.failedPaymentsLast24h} />
                <MetricCard title="CALLBACKS 24H" value={metrics.callbacksLast24h} />
                <MetricCard title="EXPIRING 7D" value={metrics.expiringNext7d} />
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              {summary.findings.map((f) => (
                <div key={`${f.code}-${f.message}`} className="rounded-xl border border-white/20 bg-white/5 p-4">
                  <div className="text-xs opacity-70">
                    {f.code} | {f.severity}
                  </div>
                  <div className="mt-1 text-sm">{f.message}</div>
                  <div className="mt-1 text-xs opacity-80">{f.recommendation}</div>
                </div>
              ))}
              {summary.findings.length === 0 ? <div className="text-sm opacity-75">No active findings.</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-3">
      <div className="text-[10px] opacity-70">{title}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
