import type { NavSection, ThemeName } from "@/components/shell/role-shell";

type Metric = {
  label: string;
  value: string;
};

type RoleOverviewProps = {
  title: string;
  description: string;
  theme: ThemeName;
  metrics: Metric[];
  sections: NavSection[];
};

const themeStyles = {
  indigo: {
    metricValue: "text-indigo-700",
    sectionIcon: "bg-indigo-50 text-indigo-700",
  },
  emerald: {
    metricValue: "text-emerald-700",
    sectionIcon: "bg-emerald-50 text-emerald-700",
  },
  amber: {
    metricValue: "text-amber-700",
    sectionIcon: "bg-amber-50 text-amber-700",
  },
  rose: {
    metricValue: "text-rose-700",
    sectionIcon: "bg-rose-50 text-rose-700",
  },
} as const;

export default function RoleOverview({
  title,
  description,
  theme,
  metrics,
  sections,
}: RoleOverviewProps) {
  const styles = themeStyles[theme];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => (
          <article key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">{m.label}</p>
            <p className={`mt-3 text-xl font-semibold ${styles.metricValue}`}>{m.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <article key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${styles.sectionIcon}`}>
              {s.title.slice(0, 1)}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{s.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
