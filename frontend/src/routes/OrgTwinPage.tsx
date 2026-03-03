import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Filter, AlertTriangle } from "lucide-react";
import { apiGet, apiPost } from "../api/client";
import type {
  DependencyGraphResponse,
  InteractionGraphResponse,
  OrgStructureResponse,
  PeopleMetricsResponse,
  PersonMetric,
  SimulationResponse,
} from "../api/types";
import { CytoscapeGraph, type CytoscapeElements } from "../components/orgTwin/CytoscapeGraph";
import type { Core } from "cytoscape";

type Layer = "structural" | "interaction" | "dependency";

function nodeColor(p: PersonMetric) {
  const hasSPOF = p.tags.includes("SPOF");
  const hasBridge = p.tags.includes("Bridge") || p.tags.includes("Connector");
  if (hasSPOF && hasBridge) return "#fb923c"; // orange
  if (hasSPOF) return "#f87171"; // red
  if (hasBridge) return "#fbbf24"; // amber
  return "#2dd4bf"; // teal
}

function nodeSize(cri: number) {
  return Math.max(12, Math.min(36, 12 + (cri / 100) * 24));
}

export function OrgTwinPage() {
  const [layer, setLayer] = useState<Layer>("interaction");
  const [structure, setStructure] = useState<OrgStructureResponse | null>(null);
  const [interaction, setInteraction] = useState<InteractionGraphResponse | null>(null);
  const [dependency, setDependency] = useState<DependencyGraphResponse | null>(null);
  const [peopleRes, setPeopleRes] = useState<PeopleMetricsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHighlightId, setSearchHighlightId] = useState<number | null>(null);
  const [deptFilter, setDeptFilter] = useState<Set<string>>(new Set());
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [, setCyInstance] = useState<Core | null>(null);
  const [quickSim, setQuickSim] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const [s, i, d, p] = await Promise.all([
          apiGet<OrgStructureResponse>("/api/org/structure"),
          apiGet<InteractionGraphResponse>("/api/org/interaction-graph"),
          apiGet<DependencyGraphResponse>("/api/org/dependency-graph"),
          apiGet<PeopleMetricsResponse>("/api/metrics/people"),
        ]);
        if (!alive) return;
        setStructure(s);
        setInteraction(i);
        setDependency(d);
        setPeopleRes(p);
        setSelectedId(p.people[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const peopleById = useMemo(() => {
    const map = new Map<number, PersonMetric>();
    for (const p of peopleRes?.people ?? []) map.set(p.id, p);
    return map;
  }, [peopleRes]);

  const departments = useMemo(() => {
    const codes = new Set<string>();
    for (const e of structure?.employees ?? []) codes.add(e.department.code);
    return [...codes].sort();
  }, [structure]);

  const elements = useMemo((): CytoscapeElements | null => {
    if (!structure || !interaction || !dependency || !peopleRes) return null;

    const peopleByIdLocal = new Map(peopleRes.people.map((p) => [p.id, p]));
    const nodes: CytoscapeElements["nodes"] = [];
    const edges: CytoscapeElements["edges"] = [];

    const applyDeptFilter = (deptCode: string) =>
      deptFilter.size === 0 || deptFilter.has(deptCode);

    for (const e of structure.employees) {
      const p = peopleByIdLocal.get(e.id);
      const cri = p?.cri ?? 0;
      if (!applyDeptFilter(e.department.code)) continue;
      nodes.push({
        data: {
          id: String(e.id),
          label: e.firstName.split(" ")[0] ?? e.firstName,
          color: p ? nodeColor(p) : "#94a3b8",
          size: nodeSize(cri),
          cri,
          dept: e.department.code,
        },
      });
    }

    if (layer === "structural") {
      let edgeId = 0;
      for (const e of structure.employees) {
        if (!e.managerId) continue;
        if (!applyDeptFilter(e.department.code)) continue;
        const mgr = structure.employees.find((x) => x.id === e.managerId);
        if (!mgr || !applyDeptFilter(mgr.department.code)) continue;
        edges.push({
          data: {
            id: `s${edgeId++}`,
            source: String(e.managerId),
            target: String(e.id),
            weight: 2,
          },
        });
      }
    } else if (layer === "interaction") {
      let edgeId = 0;
      for (const ed of interaction.edges) {
        const s = structure.employees.find((x) => x.id === ed.source);
        const t = structure.employees.find((x) => x.id === ed.target);
        if (!s || !t || !applyDeptFilter(s.department.code) || !applyDeptFilter(t.department.code))
          continue;
        edges.push({
          data: {
            id: `i${edgeId++}`,
            source: String(ed.source),
            target: String(ed.target),
            weight: Math.max(1, Math.min(6, ed.weight / 2)),
          },
        });
      }
    } else {
      let edgeId = 0;
      for (const ed of dependency.edges) {
        const s = structure.employees.find((x) => x.id === ed.source);
        const t = structure.employees.find((x) => x.id === ed.target);
        if (!s || !t || !applyDeptFilter(s.department.code) || !applyDeptFilter(t.department.code))
          continue;
        edges.push({
          data: {
            id: `d${edgeId++}`,
            source: String(ed.source),
            target: String(ed.target),
            weight: Math.max(1, Math.min(5, ed.workflowCount)),
          },
        });
      }
    }

    return { nodes, edges };
  }, [structure, interaction, dependency, peopleRes, layer, deptFilter]);

  const selected = selectedId ? peopleById.get(selectedId) ?? null : null;

  const reports = useMemo(() => {
    if (!structure || !selectedId) return [];
    return structure.employees.filter((e) => e.managerId === selectedId);
  }, [structure, selectedId]);

  const manager = useMemo(() => {
    if (!structure || !selected) return null;
    if (!selected.managerId) return null;
    return structure.employees.find((e) => e.id === selected.managerId);
  }, [structure, selected]);

  const topCollaborators = useMemo(() => {
    if (!interaction || !selectedId) return [];
    const weights = new Map<number, number>();
    for (const e of interaction.edges) {
      if (e.source === selectedId) weights.set(e.target, (weights.get(e.target) ?? 0) + e.weight);
      else if (e.target === selectedId) weights.set(e.source, (weights.get(e.source) ?? 0) + e.weight);
    }
    return [...weights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, w]) => ({ id, w, person: peopleById.get(id) }));
  }, [interaction, selectedId, peopleById]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (structure?.employees ?? []).filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.department.code.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q)
    );
  }, [structure, searchQuery]);

  const handleSearchSelect = useCallback(
    (id: number) => {
      setSearchHighlightId(id);
      setSelectedId(id);
      setSearchQuery("");
      setTimeout(() => setSearchHighlightId(null), 2000);
    },
    []
  );

  const runQuickSim = useCallback(async () => {
    if (!selectedId) return;
    setQuickSim(null);
    try {
      const res = await apiPost<SimulationResponse>("/api/simulate/attrition", {
        employee_ids: [selectedId],
      });
      setQuickSim(res);
    } catch {
      setQuickSim(null);
    }
  }, [selectedId]);

  const toggleDept = useCallback((code: string) => {
    setDeptFilter((prev) => {
      const next = new Set(prev);
      const currentlyIn = prev.size === 0 || prev.has(code);
      if (currentlyIn) {
        if (prev.size === 0) {
          departments.forEach((c) => {
            if (c !== code) next.add(c);
          });
        } else {
          next.delete(code);
        }
      } else {
        next.add(code);
      }
      return next;
    });
  }, [departments]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-50">Org Twin Visualizer</div>
          <div className="mt-1 text-sm text-slate-400">
            Layer-specific layouts: hierarchy, collaboration network, approval dependency. Select a node to inspect.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-white/10 bg-slate-900/60">
            <button
              onClick={() => setLayer("structural")}
              className={`rounded-l-xl px-4 py-2 text-sm font-semibold ${
                layer === "structural" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Structural
            </button>
            <button
              onClick={() => setLayer("interaction")}
              className={`px-4 py-2 text-sm font-semibold ${
                layer === "interaction" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Interaction
            </button>
            <button
              onClick={() => setLayer("dependency")}
              className={`rounded-r-xl px-4 py-2 text-sm font-semibold ${
                layer === "dependency" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Dependency
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={highRiskOnly}
              onChange={(e) => setHighRiskOnly(e.target.checked)}
              className="rounded"
            />
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            High-risk only (CRI ≥ 65)
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-slate-200">
          <div className="font-semibold">Backend not reachable</div>
          <div className="mt-1 text-xs text-slate-300">{error}</div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr_380px]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Filter className="h-4 w-4" />
            Department filter
          </div>
          <div className="mt-3 space-y-2">
            {departments.map((code) => (
              <label key={code} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={deptFilter.size === 0 || deptFilter.has(code)}
                  onChange={() => toggleDept(code)}
                  className="rounded"
                />
                {code}
              </label>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Clear all to show all departments. Select specific codes to isolate.
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search people, departments…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500"
              />
              {searchQuery && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl">
                  {searchResults.slice(0, 8).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => handleSearchSelect(e.id)}
                      className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                    >
                      {e.firstName} {e.lastName} • {e.department.code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-slate-400">
              <span className="font-semibold text-cyan-300">Node size</span> = CRI
              <br />
              <span className="font-semibold text-rose-400">Red</span> SPOF •{" "}
              <span className="font-semibold text-amber-400">Amber</span> Bridge/Connector •{" "}
              <span className="font-semibold text-teal-400">Teal</span> low-risk
            </div>
          </div>

          {elements ? (
            <CytoscapeGraph
              elements={elements}
              layer={layer}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReady={setCyInstance}
              searchHighlightId={searchHighlightId}
              highRiskOnly={highRiskOnly}
            />
          ) : (
            <div className="flex h-[560px] items-center justify-center text-slate-400">Loading graph…</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-slate-200">Person details</div>
            {selected && (
              <span
                className={`rounded-lg border px-2 py-1 text-sm font-extrabold ${
                  selected.cri >= 65 ? "border-rose-400/30 bg-rose-500/15 text-rose-300" : "border-teal-400/30 bg-teal-500/15 text-teal-300"
                }`}
              >
                CRI {selected.cri.toFixed(1)}
              </span>
            )}
          </div>

          {!selected ? (
            <div className="mt-6 text-sm text-slate-400">Select a node to view risk breakdown and quick-sim.</div>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <div className="text-lg font-extrabold text-slate-100">{selected.name}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {selected.title} • {selected.department.name} • {selected.tenureMonths}m tenure
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.tags.length
                    ? selected.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 bg-slate-950/30 px-2 py-1 text-xs font-semibold text-slate-200"
                        >
                          {t}
                        </span>
                      ))
                    : null}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mini org chart</div>
                <div className="mt-2 space-y-2">
                  {manager && (
                    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2 text-xs">
                      <span className="text-slate-500">Reports to:</span>{" "}
                      <span className="font-semibold text-slate-200">{manager.firstName} {manager.lastName}</span>
                    </div>
                  )}
                  {reports.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2 text-xs">
                      <span className="text-slate-500">Direct reports:</span>{" "}
                      <span className="font-semibold text-slate-200">
                        {reports.map((r) => `${r.firstName} ${r.lastName}`).join(", ")}
                      </span>
                    </div>
                  )}
                  {!manager && reports.length === 0 && (
                    <div className="text-xs text-slate-500">No hierarchy context in selected view.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">Tenure</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-500/70"
                      style={{ width: `${Math.min(100, (selected.tenureMonths / 60) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">{selected.tenureMonths} months</span>
                </div>
              </div>

              <div>
                <button
                  onClick={runQuickSim}
                  className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
                >
                  What happens if they leave?
                </button>
                {quickSim && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm">
                    <div className="font-semibold text-slate-200">Quick-sim result</div>
                    <div className="mt-2 text-slate-400">
                      Org CRI delta:{" "}
                      <span className={quickSim.deltas.orgCriAvg > 0 ? "text-rose-300" : "text-teal-300"}>
                        {quickSim.deltas.orgCriAvg >= 0 ? "+" : ""}{quickSim.deltas.orgCriAvg.toFixed(1)}
                      </span>
                    </div>
                    <ul className="mt-2 list-inside list-disc text-xs text-slate-400">
                      {quickSim.explanations.slice(0, 3).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">CRI breakdown</div>
                {[
                  ["Interaction", selected.criBreakdown.interactionPct, "bg-cyan-500/70"],
                  ["Dependency", selected.criBreakdown.workflowPct, "bg-amber-500/70"],
                  ["Tenure", selected.criBreakdown.tenureRisk, "bg-teal-500/70"],
                  ["Coverage", selected.criBreakdown.coverageRisk, "bg-rose-500/70"],
                ].map(([label, val, barClass]) => (
                  <div key={String(label)} className="mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-200">{val}/100</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400">Top collaborators</div>
                <div className="mt-2 space-y-2">
                  {topCollaborators.length
                    ? topCollaborators.map((c) => (
                        <div key={c.id} className="flex justify-between rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs">
                          <span className="font-semibold text-slate-200">{c.person?.name ?? `Employee ${c.id}`}</span>
                          <span className="text-slate-400">weight {c.w}</span>
                        </div>
                      ))
                    : "No interaction edges."}
                </div>
              </div>

              {layer === "dependency" && dependency && (
                <div>
                  <div className="text-xs font-semibold text-slate-400">Workflows (sample)</div>
                  <div className="mt-2 space-y-2">
                    {dependency.workflows
                      .filter((wf) => wf.steps.some((s) => s.approverId === selected.id))
                      .slice(0, 5)
                      .map((wf) => (
                        <div key={wf.id} className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs">
                          <div className="font-semibold text-slate-200">{wf.name}</div>
                          <div className="text-slate-500">{wf.type}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
