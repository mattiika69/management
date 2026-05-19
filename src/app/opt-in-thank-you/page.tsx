import Link from "next/link";

export default function OptInThankYouPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your checklist request was saved. Watch for the next email with the download and setup steps.
        </p>
        <Link className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-medium text-white" href="/">
          Back to HyperOptimal
        </Link>
      </section>
    </main>
  );
}
