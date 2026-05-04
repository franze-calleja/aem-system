import Link from "next/link";

const modules = [
  "Risk overview",
  "Attendance trends",
  "Intervention queue",
  "Consent and audit log",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#07111a] px-6 py-10 text-slate-50 md:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/5 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/75">AEM System</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace ready</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              This placeholder dashboard gives the login flow a destination while the rest of the
              modular front end is built out.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950/50 px-5 text-sm font-medium text-slate-100 transition hover:border-cyan-300/50 hover:bg-slate-950/80"
          >
            Back to login
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <article key={module} className="rounded-[1.75rem] border border-slate-200 bg-white/5 p-5">
              <p className="text-sm font-medium text-slate-200">{module}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Hook the next page here when the module data is ready.
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}