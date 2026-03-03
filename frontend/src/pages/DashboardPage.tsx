import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import type {
  DepartmentsMetricsResponse,
  PeopleMetricsResponse,
  PersonMetric,
  DepartmentMetric,
} from "../api/types";
import { RiskGauge } from "../components/dashboard/RiskGauge";
import { DepartmentHeatmap } from "../components/dashboard/DepartmentHeatmap";
import { TopActionsPanel } from "../components/dashboard/TopActionsPanel";

function band(value: number) {
  if (value < 40) return "text-teal-300";
  if (value < 65) return "text-amber-300";
  return "text-rose-300";
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((x) => (x ? x[0].toUpperCase() + x.slice(1) : x))
    .join(" ");
}

function computeDependencyConcentration(people: PersonMetric[]) {
  const total = people.reduce((acc, p) => acc + (p.workflow.approvalStepCount ?? 0), 0);
  const top = [...people].sort((a, b) => (b.workflow.approvalStepCount ?? 0) - (a.workflow.approvalStepCount ?? 0));
  const top3 = top.slice(0, 3);
  const top3Sum = top3.reduce((acc, p) => acc + (p.workflow.approvalStepCount ?? 0), 0);
  const pct = total > 0 ? (top3Sum / total) * 100 : 0;
  return { total, top3, pct };
}

function riskSummary({
  kpis,
  departments,
  people,
}: {
  kpis: PeopleMetricsResponse["kpis"];
  departments: DepartmentMetric[];
  people: PersonMetric[];
}) {
  const highest = kpis.highestRiskDepartment;
  const topDepts = [...departments].sort((a, b) => b.criAvg - a.criAvg).slice(0, 2);
  const dep = computeDependencyConcentration(people);
  const depNames = dep.top3.map((p) => p.name);

  const orgCri = kpis.orgCriAvg.toFixed(1);
  const spof = kpis.singlePointsOfFailure;
  const bridge = kpis.bridgeRoles;

  const deptLine =
    topDepts.length >= 2
      ? `${topDepts[0].name} and ${topDepts[1].name} carry the highest departmental risk.`
      : highest
        ? `${highest.name} carries the highest departmental risk.`
        : "";

  const depLine =
    dep.total > 0
      ? `Three individuals account for ${dep.pct.toFixed(0)}% of critical approval dependencies (${depNames.join(
          ", "
        )}).`
      : "Approval dependency concentration is currently low in the demo workflows.";

  return `Your organization has ${spof} single points of failure and an average CRI of ${orgCri}. ${deptLine} ${depLine} Bridge exposure: ${bridge}.`;
}

export function DashboardPage() {
  const [peopleRes, setPeopleRes] = useState<PeopleMetricsResponse | null>(null);
  const [deptRes, setDeptRes] = useState<DepartmentsMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<DepartmentMetric | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const [p, d] = await Promise.all([
          apiGet<PeopleMetricsResponse>("/api/metrics/people"),
          apiGet<DepartmentsMetricsResponse>("/api/metrics/departments"),
        ]);
        if (!alive) return;
        setPeopleRes(p);
        setDeptRes(d);
        setSelectedDept(d.departments.sort((a, b) => b.criAvg - a.criAvg)[0] ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const people = peopleRes?.people ?? [];
  const departments = deptRes?.departments ?? [];
  const kpis = peopleRes?.kpis ?? null;

  const summary = useMemo(() => {
    if (!kpis || departments.length === 0) return null;
    return riskSummary({ kpis, departments, people });
  }, [kpis, departments, people]);

  const topRiskPeople = useMemo(() => {
    return [...people].sort((a, b) => b.cri - a.cri).slice(0, 8);
  }, [people]);

  return (
    <div className="mx-auto w-full max-w-[1220px] px-5 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-50">
              Executive Intelligence Hub
            </div>
            <div className="mt-1 text-sm text-slate-400">
              ContinuityIQ synthesizes structural hierarchy, collaboration co-attendance, and approval dependencies —
              metadata only.
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">Privacy-first</span> • No message content • No behavioral
            monitoring
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-slate-200">
            <div className="font-semibold">Backend not reachable</div>
            <div className="mt-1 text-xs text-slate-300">{error}</div>
            <div className="mt-2 text-xs text-slate-400">
              Start the backend on <span className="font-mono">localhost:4000</span> and refresh.
            </div>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Risk summary</div>
          <div className="mt-2 text-base font-semibold tracking-tight text-slate-100">
            {summary ?? "Loading executive risk summary…"}
          </div>
          {kpis && (
            <div className="mt-3 text-xs text-slate-400">
              Current state:{" "}
              <span className={`font-semibold ${band(kpis.orgCriAvg)}`}>Org CRI {kpis.orgCriAvg.toFixed(1)}</span> •{" "}
              <span className="font-semibold text-slate-200">{kpis.singlePointsOfFailure} SPOFs</span> •{" "}
              <span className="font-semibold text-slate-200">{kpis.bridgeRoles} bridges</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RiskGauge
          label="Organizational continuity risk (CRI)"
          value={kpis?.orgCriAvg ?? 0}
          caption="0–100 composite: interaction + dependency + tenure + coverage"
        />
        <RiskGauge
          label="Highest-risk department (CRI avg)"
          value={kpis?.highestRiskDepartment?.criAvg ?? 0}
          caption={
            kpis?.highestRiskDepartment
              ? `${kpis.highestRiskDepartment.name} (${kpis.highestRiskDepartment.code})`
              : "Loading…"
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartmentHeatmap
            departments={[...departments].sort((a, b) => b.criAvg - a.criAvg)}
            selectedCode={selectedDept?.code ?? null}
            onSelect={(d) => setSelectedDept(d)}
          />
        </div>
        <div className="lg:col-span-1">
          <TopActionsPanel people={people} departments={departments} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 lg:col-span-2">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-200">Top risk roster</div>
              <div className="mt-1 text-xs text-slate-400">
                Individuals most likely to create continuity disruption if removed or disrupted.
              </div>
            </div>
            <div className="text-xs text-slate-400">CRI and tags</div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topRiskPeople.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{p.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {p.department.code} • {titleCase(p.title)} • tenure {p.tenureMonths}m
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.tags.length ? (
                        p.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-white/10 bg-slate-950/30 px-2 py-1 text-[11px] font-semibold text-slate-200"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">No special tags</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={[
                        "rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-lg font-extrabold",
                        band(p.cri),
                      ].join(" ")}
                    >
                      {p.cri.toFixed(1)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">CRI</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-white/10 bg-slate-950/20 p-3">
                    <div className="text-[11px] font-semibold text-slate-400">Interaction</div>
                    <div className="mt-1 font-semibold text-slate-200">{p.criBreakdown.interactionPct}/100</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/20 p-3">
                    <div className="text-[11px] font-semibold text-slate-400">Dependency</div>
                    <div className="mt-1 font-semibold text-slate-200">{p.criBreakdown.workflowPct}/100</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 lg:col-span-1">
          <div className="text-sm font-semibold tracking-tight text-slate-200">Department drill-down</div>
          <div className="mt-1 text-xs text-slate-400">
            Selected: <span className="font-semibold text-slate-200">{selectedDept?.name ?? "—"}</span>
          </div>

          {!selectedDept ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Select a department tile to view details.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-400">CRI average</div>
                  <div className={`text-lg font-extrabold ${band(selectedDept.criAvg)}`}>
                    {selectedDept.criAvg.toFixed(1)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-300">
                  Drivers: <span className="font-semibold">{selectedDept.topDrivers.slice(0, 2).join(" • ")}</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold text-slate-400">Top risk drivers (people)</div>
                <div className="mt-3 grid gap-2">
                  {selectedDept.topRisks.slice(0, 5).map((r) => (
                    <div key={r.employeeId} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-200">{r.name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {r.tags.length ? r.tags.join(" • ") : "—"}
                        </div>
                      </div>
                      <div className={`shrink-0 font-mono font-semibold ${band(r.cri)}`}>{r.cri.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

