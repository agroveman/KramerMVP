import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import type { DepartmentsMetricsResponse, PeopleMetricsResponse, PersonMetric } from "../api/types";

type SortKey = "cri" | "name" | "department" | "title";
type SortDir = "asc" | "desc";

function riskColor(cri: number) {
  if (cri >= 75) return "rgba(251, 113, 133, 0.22)";
  if (cri >= 55) return "rgba(251, 191, 36, 0.18)";
  return "rgba(34, 197, 94, 0.16)";
}

export function DashboardPage() {
  const [peopleRes, setPeopleRes] = useState<PeopleMetricsResponse | null>(null);
  const [deptRes, setDeptRes] = useState<DepartmentsMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PersonMetric | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("cri");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
        setSelected(p.people[0] ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const people = peopleRes?.people ?? [];

  const sortedPeople = useMemo(() => {
    const copy = [...people];
    const factor = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const av =
        sortKey === "cri"
          ? a.cri
          : sortKey === "name"
            ? a.name
            : sortKey === "department"
              ? a.department.name
              : a.title;
      const bv =
        sortKey === "cri"
          ? b.cri
          : sortKey === "name"
            ? b.name
            : sortKey === "department"
              ? b.department.name
              : b.title;
      if (typeof av === "number" && typeof bv === "number") return factor * (av - bv);
      return factor * String(av).localeCompare(String(bv));
    });
    return copy;
  }, [people, sortKey, sortDir]);

  const kpis = peopleRes?.kpis;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Overview Dashboard</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Metadata-only digital twin: org structure + collaboration co-attendance + approval dependencies.
          </div>
        </div>
        <div className="pill">
          <span style={{ color: "var(--primary)" }}>Metadata-only</span>
          <span className="tiny">No message content</span>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, borderColor: "rgba(251,113,133,0.35)" }}>
          <div className="cardBody">
            <div style={{ fontWeight: 800 }}>Backend not reachable</div>
            <div className="tiny" style={{ marginTop: 6 }}>
              {error}
            </div>
            <div className="tiny" style={{ marginTop: 10 }}>
              Make sure backend is running on port 4000, then refresh.
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 14 }}>
        <div className="card">
          <div className="cardBody">
            <div className="kpiValue">{kpis ? kpis.orgCriAvg.toFixed(1) : "—"}</div>
            <div className="kpiLabel">Org CRI average (0–100)</div>
          </div>
        </div>
        <div className="card">
          <div className="cardBody">
            <div className="kpiValue">{kpis?.highestRiskDepartment?.code ?? "—"}</div>
            <div className="kpiLabel">
              Highest-risk department{" "}
              <span className="tiny">
                {kpis?.highestRiskDepartment ? `(${kpis.highestRiskDepartment.criAvg.toFixed(1)})` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="cardBody">
            <div className="kpiValue">{kpis ? kpis.singlePointsOfFailure : "—"}</div>
            <div className="kpiLabel">Single points of failure (SPOF)</div>
          </div>
        </div>
        <div className="card">
          <div className="cardBody">
            <div className="kpiValue">{kpis ? kpis.bridgeRoles : "—"}</div>
            <div className="kpiLabel">Bridge roles (high betweenness)</div>
          </div>
        </div>
      </div>

      <div className="split" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>People risk table</div>
              <div className="tiny">Click a person to see why their CRI is high.</div>
            </div>
            <div className="pill">
              <span style={{ fontFamily: "var(--mono)" }}>CRI</span>
              <span className="tiny">
                weights: I {peopleRes?.criFormula.weights.interaction ?? "—"} / W{" "}
                {peopleRes?.criFormula.weights.workflow ?? "—"} / T {peopleRes?.criFormula.weights.tenure ?? "—"} / C{" "}
                {peopleRes?.criFormula.weights.coverage ?? "—"}
              </span>
            </div>
          </div>
          <div className="cardBody" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th
                    onClick={() => {
                      setSortKey("name");
                      setSortDir(sortKey === "name" && sortDir === "asc" ? "desc" : "asc");
                    }}
                  >
                    Name
                  </th>
                  <th
                    onClick={() => {
                      setSortKey("department");
                      setSortDir(sortKey === "department" && sortDir === "asc" ? "desc" : "asc");
                    }}
                  >
                    Dept
                  </th>
                  <th
                    onClick={() => {
                      setSortKey("title");
                      setSortDir(sortKey === "title" && sortDir === "asc" ? "desc" : "asc");
                    }}
                  >
                    Title
                  </th>
                  <th
                    onClick={() => {
                      setSortKey("cri");
                      setSortDir(sortKey === "cri" && sortDir === "asc" ? "desc" : "asc");
                    }}
                  >
                    CRI
                  </th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {sortedPeople.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    style={{
                      cursor: "pointer",
                      background:
                        selected?.id === p.id ? "rgba(110,231,255,0.08)" : "transparent",
                    }}
                  >
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td className="muted">{p.department.code}</td>
                    <td className="muted">{p.title}</td>
                    <td>
                      <span className="pill pillStrong" style={{ background: riskColor(p.cri) }}>
                        {p.cri.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {p.tags.length ? (
                          p.tags.map((t) => (
                            <span key={t} className="pill">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="tiny">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card sidePanel">
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>Risk explainer</div>
              <div className="tiny">Transparent CRI breakdown.</div>
            </div>
            {selected ? (
              <span className="pill pillStrong" style={{ background: riskColor(selected.cri) }}>
                CRI {selected.cri.toFixed(1)}
              </span>
            ) : (
              <span className="pill">Select a person</span>
            )}
          </div>
          <div className="cardBody">
            {!selected ? (
              <div className="muted">Select a person from the table.</div>
            ) : (
              <>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.name}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {selected.title} • {selected.department.name} • tenure {selected.tenureMonths} months
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800 }}>Interaction layer</div>
                    <div className="tiny">{selected.criBreakdown.interactionPct}/100</div>
                  </div>
                  <div className="bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${selected.criBreakdown.interactionPct}%` }} />
                  </div>
                  <div className="tiny" style={{ marginTop: 6 }}>
                    Degree {selected.interaction.degree} • Betweenness {selected.interaction.betweenness}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800 }}>Dependency layer</div>
                    <div className="tiny">{selected.criBreakdown.workflowPct}/100</div>
                  </div>
                  <div className="bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${selected.criBreakdown.workflowPct}%`, background: "rgba(251,191,36,0.7)" }} />
                  </div>
                  <div className="tiny" style={{ marginTop: 6 }}>
                    Workflows appeared in: {selected.workflow.workflowAppearances} • Approval steps:{" "}
                    {selected.workflow.approvalStepCount}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800 }}>Tenure knowledge risk</div>
                    <div className="tiny">{selected.criBreakdown.tenureRisk}/100</div>
                  </div>
                  <div className="bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${selected.criBreakdown.tenureRisk}%`, background: "rgba(34,197,94,0.7)" }} />
                  </div>
                  <div className="tiny" style={{ marginTop: 6 }}>
                    Rationale: {peopleRes?.criFormula.tenureRationale}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800 }}>Coverage / redundancy</div>
                    <div className="tiny">{selected.criBreakdown.coverageRisk}/100</div>
                  </div>
                  <div className="bar" style={{ marginTop: 8 }}>
                    <div style={{ width: `${selected.criBreakdown.coverageRisk}%`, background: "rgba(251,113,133,0.75)" }} />
                  </div>
                  <div className="tiny" style={{ marginTop: 6 }}>
                    100 means single-coverage role in department (no redundancy).
                  </div>
                </div>

                <div style={{ marginTop: 14 }} className="card" />
                <div className="tiny" style={{ marginTop: 12 }}>
                  {peopleRes?.criFormula.metadataOnly}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div>
            <div style={{ fontWeight: 900 }}>Department risk heatmap</div>
            <div className="tiny">CRI avg and top drivers (rollup of individual CRI).</div>
          </div>
        </div>
        <div className="cardBody" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Headcount</th>
                <th>CRI avg</th>
                <th>P90</th>
                <th>Top drivers</th>
              </tr>
            </thead>
            <tbody>
              {(deptRes?.departments ?? []).map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 800 }}>{d.name}</td>
                  <td className="muted">{d.headcount}</td>
                  <td>
                    <span className="pill pillStrong" style={{ background: riskColor(d.criAvg) }}>
                      {d.criAvg.toFixed(1)}
                    </span>
                  </td>
                  <td className="muted">{d.criP90.toFixed(1)}</td>
                  <td className="muted">{d.topDrivers.join(" • ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

