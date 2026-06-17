import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { prisma } from "@/lib/prisma";
import AlgorithmConfigForm from "@/components/roles/admin/algorithm-config-form";
import RunRiskEngineButton from "@/components/roles/admin/run-risk-engine-button";

export type AlgorithmConfigRow = {
  id: string;
  version: number;
  weights: unknown;
  thresholds: unknown;
  ruleConfig: unknown;
  biasThresholds: unknown;
  isActive: boolean;
  changedById: string | null;
  changedAt: Date;
  justification: string | null;
};

export default async function AdminAlgorithmPage() {
  await requireRole("ADMIN");
  const sy = await getActiveSchoolYear();

  const configs = await prisma.algorithmConfig.findMany({
    orderBy: { version: "desc" },
    take: 10,
  });

  const active = configs.find((c) => c.isActive) ?? configs[0];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Algorithm Configuration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage risk scoring weights, band thresholds, and pattern detection rules.
          Each save creates an immutable versioned record.
        </p>
      </header>

      {/* Run engine button */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Risk engine</h2>
        <p className="text-xs text-slate-500 mb-4">
          Triggers computation for all students in the active school year using the current config.
          Results are stored and visible immediately to counselors, teachers, and the principal.
        </p>
        {sy ? (
          <RunRiskEngineButton schoolYearId={sy.id} />
        ) : (
          <p className="text-xs text-rose-500">No active school year — activate one in School Setup first.</p>
        )}
      </div>

      {/* Config editor */}
      {active ? (
        <>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              Active: v{active.version}
            </span>
            <span className="text-slate-400">
              Last changed {new Date(active.changedAt).toLocaleDateString()}
              {active.justification && ` — "${active.justification}"`}
            </span>
          </div>

          <AlgorithmConfigForm current={active} />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <p className="text-sm text-slate-600">No configuration exists yet. Run the seed script.</p>
        </div>
      )}

      {/* Version history */}
      {configs.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Version history</h2>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Version</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Justification</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono font-semibold text-slate-700">v{c.version}</td>
                  <td className="px-3 py-2 text-slate-600">{new Date(c.changedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    {c.isActive ? (
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">Active</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Superseded</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-xs truncate">{c.justification ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
