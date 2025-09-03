'use client';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card">
      <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-600 mb-4">
        {error?.message || 'Unexpected error on the dashboard.'}
      </p>
      <div className="flex gap-2">
        <button className="btn" onClick={() => reset()}>Try again</button>
        <a className="btn" href="/">Go home</a>
      </div>
    </div>
  );
}
