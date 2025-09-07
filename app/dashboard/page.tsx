// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-3 text-gray-700">
        Welcome back. Choose an action below.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <a
          href="/trees/new"
          className="rounded-2xl p-6 border hover:shadow"
        >
          <h2 className="text-xl font-medium">Start a New Tree</h2>
          <p className="mt-2 text-sm text-gray-600">Create a brand-new empty tree.</p>
        </a>

        <a
          href="/trees"
          className="rounded-2xl p-6 border hover:shadow"
        >
          <h2 className="text-xl font-medium">View Your Trees</h2>
          <p className="mt-2 text-sm text-gray-600">Open and edit an existing tree.</p>
        </a>
      </div>

      <div className="mt-10">
        <form action="/api/checkout/stripe" method="post">
          <button
            type="submit"
            className="rounded-xl px-4 py-2 border"
          >
            Upgrade (Stripe Checkout)
          </button>
        </form>
      </div>
    </main>
  );
}
