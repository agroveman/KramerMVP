import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { apiGet, apiPost } from "../api/client";
import type {
  OrgStructureResponse,
  PeopleMetricsResponse,
  SimulationResponse,
  SuggestedSuccessor,
} from "../api/types";

const SAVED_KEY = "continuityiq-saved-scenarios";

type SavedScenario = {
  id: string;
  type: "attrition" | "restructure" | "succession";
  name: string;
  timestamp: number;
  config: Record<string, unknown>;
  result: SimulationResponse;
};

function loadSaved(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveScenario(scenario: SavedScenario) {
  const list = loadSaved();
  list.unshift(scenario);
  const trimmed = list.slice(0, 50);
  localStorage.setItem(SAVED_KEY, JSON.stringify(trimmed));
}

function riskColor(cri: number) {
  if (cri >= 75) return "rgba(251, 113, 133, 0.22)";
  if (cri >= 55) return "rgba(251, 191, 36, 0.18)";
  return "rgba(34, 197, 94, 0.16)";
}

type Tab = "attrition" | "restructure" | "succession" | "saved";

export function SimulationPage() {
  const [peopleRes, setPeopleRes] = useState<PeopleMetricsResponse | null>(null);
  const [org, setOrg] = useState<OrgStructureResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sim, setSim] = useState<SimulationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveEmployeeId, setMoveEmployeeId] = useState<number | "">("");
  const [moveDeptId, setMoveDeptId] = useState<number | "">("");
  const [tab, setTab] = useState<Tab>("attrition");
  const [successionId, setSuccessionId] = useState<number | "">("");
  const [saved, setSaved] = useState<SavedScenario[]>(loadSaved);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([
          apiGet<PeopleMetricsResponse>("/api/metrics/people"),
          apiGet<OrgStructureResponse>("/api/org/structure"),
        ]);
        if (!alive) return;
        setPeopleRes(p);
        setOrg(s);
        const riley = p.people.find((x) => x.name.includes("Riley Nguyen"));
        setSelectedIds(riley ? [riley.id] : p.people.slice(0, 1).map((x) => x.id));
        setMoveEmployeeId(riley?.id ?? p.people[0]?.id ?? "");
        setSuccessionId(riley?.id ?? p.people[0]?.id ?? "");
        setMoveDeptId(s.departments.find((d) => d.code === "OPS")?.id ?? s.departments[0]?.id ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedPeople = useMemo(() => {
    const map = new Map((peopleRes?.people ?? []).map((p) => [p.id, p]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean);
  }, [peopleRes, selectedIds]);

  async function runAttrition() {
    if (selectedIds.length < 1 || selectedIds.length > 5) {
      setError("Pick 1 to 5 people to remove.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<SimulationResponse>("/api/simulate/attrition", {
        employee_ids: selectedIds,
      });
      setSim(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runRestructure() {
    if (!moveEmployeeId || !moveDeptId) {
      setError("Pick an employee and a destination department.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<SimulationResponse>("/api/simulate/restructure", {
        moves: [{ employee_id: moveEmployeeId, new_department_id: moveDeptId }],
      });
      setSim(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runSuccession() {
    if (!successionId) {
      setError("Pick a key person who might leave.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiPost<SimulationResponse>("/api/simulate/succession", {
        employee_id: successionId,
      });
      setSim(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (!sim || !saveName.trim()) return;
    const scenario: SavedScenario = {
      id: crypto.randomUUID(),
      type: tab === "succession" ? "succession" : tab === "restructure" ? "restructure" : "attrition",
      name: saveName.trim(),
      timestamp: Date.now(),
      config:
        tab === "attrition"
          ? { employee_ids: selectedIds }
          : tab === "restructure"
            ? { moveEmployeeId, moveDeptId }
            : { successionId },
      result: sim,
    };
    saveScenario(scenario);
    setSaved(loadSaved());
    setSaveName("");
  }

  function viewSaved(s: SavedScenario) {
    setSim(s.result);
  }

  const chartData = useMemo(() => {
    if (!sim) return [];
    return sim.before.departments.map((d) => {
      const after = sim.after.departments.find((x) => x.id === d.id);
      return {
        name: d.code,
        before: d.criAvg,
        after: after?.criAvg ?? d.criAvg,
        delta: (after?.criAvg ?? d.criAvg) - d.criAvg,
      };
    });
  }, [sim]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "attrition", label: "Attrition" },
    { id: "restructure", label: "Restructure" },
    { id: "succession", label: "Succession" },
    { id: "saved", label: "Saved" },
  ];

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Scenario Simulator</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Run what-if simulations: attrition, restructure, or succession planning.
          </div>
        </div>
        <span className="pill">
          <span style={{ color: "var(--warn)" }}>Demo tip</span>
          <span className="tiny">Remove a SPOF (Controller / Ops / Architect) to see impact</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="btn"
            style={{
              background: tab === t.id ? "rgba(110, 231, 255, 0.18)" : "rgba(255,255,255,0.06)",
              borderColor: tab === t.id ? "rgba(110, 231, 255, 0.5)" : "rgba(255,255,255,0.12)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, borderColor: "rgba(251,113,133,0.35)" }}>
          <div className="cardBody">
            <div style={{ fontWeight: 800 }}>Error</div>
            <div className="tiny" style={{ marginTop: 6 }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {tab === "attrition" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14, gap: 14 }}>
          <div className="card">
            <div className="cardHeader">
              <div>
                <div style={{ fontWeight: 900 }}>Attrition scenario</div>
                <div className="tiny">Remove 1–5 people; recompute org + department CRI.</div>
              </div>
              <button className="btn btnPrimary" onClick={runAttrition} disabled={busy}>
                {busy ? "Simulating…" : "Run attrition"}
              </button>
            </div>
            <div className="cardBody">
              <div className="tiny">Selected ({selectedIds.length}/5)</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedPeople.length
                  ? selectedPeople.map((p) => (
                      <span
                        key={p!.id}
                        className="pill pillStrong"
                        style={{ background: riskColor(p!.cri) }}
                      >
                        {p!.name} • {p!.department.code}
                      </span>
                    ))
                  : null}
              </div>
              <div style={{ marginTop: 12, maxHeight: 320, overflow: "auto", display: "grid", gap: 6 }}>
                {(peopleRes?.people ?? []).slice(0, 60).map((p) => {
                  const checked = selectedIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      data-person-row={p.name.toLowerCase()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: checked ? "rgba(110,231,255,0.08)" : "rgba(255,255,255,0.04)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                            if (prev.length >= 5) return prev;
                            return [...prev, p.id];
                          });
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800 }}>{p.name}</div>
                        <div className="tiny">
                          {p.department.code} • CRI {p.cri.toFixed(1)}{" "}
                          {p.tags.length ? `• ${p.tags.join(", ")}` : ""}
                        </div>
                      </div>
                      <span className="pill">{p.cri.toFixed(1)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <SimResultsPanel
            sim={sim}
            chartData={chartData}
            onSave={handleSave}
            saveName={saveName}
            onSaveNameChange={setSaveName}
          />
        </div>
      )}

      {tab === "restructure" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14, gap: 14 }}>
          <div className="card">
            <div className="cardHeader">
              <div>
                <div style={{ fontWeight: 900 }}>Restructure scenario</div>
                <div className="tiny">Move someone to a different department.</div>
              </div>
              <button className="btn btnPrimary" onClick={runRestructure} disabled={busy}>
                {busy ? "Simulating…" : "Run restructure"}
              </button>
            </div>
            <div className="cardBody" style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="tiny">Employee</div>
                <select
                  value={moveEmployeeId}
                  onChange={(e) => setMoveEmployeeId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select employee…</option>
                  {(peopleRes?.people ?? []).slice(0, 60).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.department.code}) • CRI {p.cri.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="tiny">New department</div>
                <select
                  value={moveDeptId}
                  onChange={(e) => setMoveDeptId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select department…</option>
                  {(org?.departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <SimResultsPanel
            sim={sim}
            chartData={chartData}
            onSave={handleSave}
            saveName={saveName}
            onSaveNameChange={setSaveName}
          />
        </div>
      )}

      {tab === "succession" && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14, gap: 14 }}>
          <div className="card">
            <div className="cardHeader">
              <div>
                <div style={{ fontWeight: 900 }}>Succession scenario</div>
                <div className="tiny">Key person leaves—impact and suggested successors.</div>
              </div>
              <button className="btn btnPrimary" onClick={runSuccession} disabled={busy}>
                {busy ? "Simulating…" : "Run succession"}
              </button>
            </div>
            <div className="cardBody">
              <div className="tiny">Key person who might leave</div>
              <select
                value={successionId}
                onChange={(e) => setSuccessionId(e.target.value ? Number(e.target.value) : "")}
                style={{ marginTop: 8, width: "100%" }}
              >
                <option value="">Select person…</option>
                {(peopleRes?.people ?? []).slice(0, 60).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.department.code}) • {p.title} • CRI {p.cri.toFixed(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SimResultsPanel
            sim={sim}
            chartData={chartData}
            onSave={handleSave}
            saveName={saveName}
            onSaveNameChange={setSaveName}
            suggestedSuccessors={sim?.suggestedSuccessors}
          />
        </div>
      )}

      {tab === "saved" && (
        <div className="grid" style={{ gridTemplateColumns: saved.length > 0 ? "1fr 1fr" : "1fr", marginTop: 14, gap: 14 }}>
        <div className="card">
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>Saved scenarios</div>
              <div className="tiny">Previously run simulations stored locally.</div>
            </div>
          </div>
          <div className="cardBody">
            {saved.length === 0 ? (
              <div className="muted">No saved scenarios yet. Run a simulation and use Save to add one.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {saved.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => viewSaved(s)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{s.name}</div>
                      <div className="tiny">
                        {s.type} • {new Date(s.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className="pill">{s.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {sim && (
          <SimResultsPanel
            sim={sim}
            chartData={chartData}
            onSave={handleSave}
            saveName={saveName}
            onSaveNameChange={setSaveName}
            suggestedSuccessors={sim.suggestedSuccessors}
          />
        )}
        </div>
      )}
    </div>
  );
}

function SimResultsPanel({
  sim,
  chartData,
  onSave,
  saveName,
  onSaveNameChange,
  suggestedSuccessors,
}: {
  sim: SimulationResponse | null;
  chartData: { name: string; before: number; after: number; delta: number }[];
  onSave: () => void;
  saveName: string;
  onSaveNameChange: (v: string) => void;
  suggestedSuccessors?: SuggestedSuccessor[];
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div style={{ fontWeight: 900 }}>Before / After</div>
          <div className="tiny">Department CRI averages and impact.</div>
        </div>
        <span className="pill">
          <span className="tiny">Org Δ</span>
          <span
            className={sim && sim.deltas.orgCriAvg > 0 ? "deltaUp" : "deltaDown"}
            style={{ fontWeight: 900 }}
          >
            {sim ? `${sim.deltas.orgCriAvg >= 0 ? "+" : ""}${sim.deltas.orgCriAvg.toFixed(1)}` : "—"}
          </span>
        </span>
      </div>
      <div className="cardBody">
        {!sim ? (
          <div className="muted">Run a simulation to see results.</div>
        ) : (
          <>
            {chartData.length > 0 && (
              <div style={{ height: 220, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 40, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={36} stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                      }}
                      formatter={(value: number | undefined) => [(value ?? 0).toFixed(1), ""]}
                      labelFormatter={(label) => `Dept ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="before" name="Before" fill="rgba(148,163,184,0.6)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="after" name="After" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.delta > 0 ? "rgba(251,113,133,0.7)" : "rgba(110,231,255,0.6)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 900 }}>Impact summary</div>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {sim.explanations.map((x, idx) => (
                  <li key={idx} className="tiny" style={{ marginBottom: 6 }}>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            {suggestedSuccessors && suggestedSuccessors.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 900 }}>Suggested successors</div>
                <div className="tiny" style={{ marginTop: 4, marginBottom: 8 }}>
                  Based on direct reports and department peers with high collaboration centrality.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {suggestedSuccessors.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(110,231,255,0.06)",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{u.name}</div>
                      <div className="tiny">
                        {u.title} • {u.departmentCode} • CRI {u.cri.toFixed(1)}
                      </div>
                      <div className="tiny" style={{ marginTop: 4 }}>{u.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
              <input
                placeholder="Scenario name"
                value={saveName}
                onChange={(e) => onSaveNameChange(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btnPrimary" onClick={onSave} disabled={!saveName.trim()}>
                Save scenario
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
