import { useEffect, useMemo, useState } from "react";
import type { DepartmentMetric, PersonMetric } from "../../api/types";

type ActionCard = {
  id: string;
  urgency: "Immediate" | "Short-term";
  title: string;
  detail: string;
};

const STORAGE_KEY = "ciq_dismissed_actions_v1";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function TopActionsPanel({
  people,
  departments,
}: {
  people: PersonMetric[];
  departments: DepartmentMetric[];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const actions = useMemo(() => {
    const byCri = [...people].sort((a, b) => b.cri - a.cri);
    const spofs = byCri.filter((p) => p.tags.includes("SPOF"));
    const bridges = byCri.filter((p) => p.tags.includes("Bridge"));

    const highRiskDepts = [...departments].sort((a, b) => b.criAvg - a.criAvg).slice(0, 2);

    const cards: ActionCard[] = [];

    const topSpof = spofs[0];
    if (topSpof) {
      cards.push({
        id: `succession_${topSpof.id}`,
        urgency: "Immediate",
        title: `Create a succession plan for ${topSpof.name}`,
        detail: `${topSpof.department.code} • CRI ${topSpof.cri.toFixed(1)} • SPOF with concentrated approval ownership.`,
      });
    }

    const controller = spofs.find((p) => p.title.toLowerCase().includes("controller"));
    if (controller) {
      cards.push({
        id: `workflow_docs_${controller.id}`,
        urgency: "Immediate",
        title: `Document critical approvals owned by ${controller.name}`,
        detail: `Reduce dependency concentration by mapping approvals and delegations for ${controller.department.name}.`,
      });
    }

    const bridge = bridges[0];
    if (bridge) {
      cards.push({
        id: `cross_train_${bridge.id}`,
        urgency: "Short-term",
        title: `Cross-train a backup for ${bridge.name}`,
        detail: `Bridge roles can fragment collaboration networks if they leave. Prioritize shadowing and shared ownership.`,
      });
    }

    if (highRiskDepts.length) {
      cards.push({
        id: `dept_focus_${highRiskDepts.map((d) => d.code).join("_")}`,
        urgency: "Short-term",
        title: `Run targeted continuity review for ${highRiskDepts.map((d) => d.name).join(" + ")}`,
        detail: `Top drivers: ${highRiskDepts[0].topDrivers.slice(0, 2).join(", ")}. Validate coverage plans and escalation paths.`,
      });
    }

    // Ensure 5 cards by adding high-CRI general recommendations
    for (const p of byCri) {
      if (cards.length >= 5) break;
      const id = `reduce_cri_${p.id}`;
      if (cards.some((c) => c.id === id)) continue;
      cards.push({
        id,
        urgency: p.cri >= 65 ? "Immediate" : "Short-term",
        title: `Reduce risk concentration around ${p.name}`,
        detail: `Shift approvals and key meetings to increase redundancy; current CRI ${p.cri.toFixed(1)}.`,
      });
    }

    return cards.filter((c) => !dismissed.has(c.id)).slice(0, 5);
  }, [people, departments, dismissed]);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-200">Top 5 actions</div>
          <div className="mt-1 text-xs text-slate-400">
            Prioritized recommendations generated from current continuity risk signals.
          </div>
        </div>
        <div className="text-xs text-slate-400">Dismiss to curate your agenda</div>
      </div>

      <div className="mt-4 grid gap-3">
        {actions.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            All current recommendations have been dismissed.
            <button
              className="ml-2 text-cyan-300 underline underline-offset-4"
              onClick={() => {
                const empty = new Set<string>();
                setDismissed(empty);
                saveDismissed(empty);
              }}
            >
              Reset
            </button>
          </div>
        ) : (
          actions.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-400">{a.urgency}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-100">{a.title}</div>
                  <div className="mt-2 text-xs text-slate-300">{a.detail}</div>
                </div>
                <button
                  className="shrink-0 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  onClick={() => {
                    const next = new Set(dismissed);
                    next.add(a.id);
                    setDismissed(next);
                    saveDismissed(next);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

