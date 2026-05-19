import Link from "next/link";

export default function DqPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Not the right fit yet</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Thanks for taking a look. When the management workflow is a better match, you can come back any time.
        </p>
        <Link className="mt-6 inline-flex rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700" href="/opt-in">
          Back
        </Link>
      </section>
    </main>
  );
}
