import { OptInForm } from "@/components/opt-in-form";

export default function OptInPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="pt-4 lg:pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">HyperOptimal Management</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Turn scattered team work into a clear weekly management rhythm.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Get the practical checklist for reviewing people, meetings, training, and follow-up without adding another complicated operating system.
          </p>

          <div className="mt-8 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Built for operators who need clarity now</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use it when your team is growing, meetings are happening, and accountability is starting to live in too many places.
              </p>
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-slate-700">
              <li>Map weekly management reviews to concrete people and outcomes.</li>
              <li>Separate start, stop, keep, progress, and training follow-up.</li>
              <li>Give every team member a clear next step after each review.</li>
            </ul>
            <p className="border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
              Designed from real management workflows, not theory. If you already have messy notes, this gives you a cleaner place to start.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-8">
          <OptInForm />
        </aside>
      </section>
    </main>
  );
}
