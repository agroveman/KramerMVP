import type { DepartmentMetric } from "../../api/types";

function tileBg(criAvg: number) {
  if (criAvg >= 65) return "bg-rose-500/15 border-rose-400/20";
  if (criAvg >= 40) return "bg-amber-500/12 border-amber-400/20";
  return "bg-teal-500/10 border-teal-400/20";
}

export function DepartmentHeatmap({
  departments,
  onSelect,
  selectedCode,
}: {
  departments: DepartmentMetric[];
  selectedCode?: string | null;
  onSelect: (dept: DepartmentMetric) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-200">Department risk heatmap</div>
          <div className="mt-1 text-xs text-slate-400">
            Color intensity encodes department CRI average. Select a tile to drill in.
          </div>
        </div>
        <div className="text-xs text-slate-400">
          <span className="font-mono">CRI avg</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => {
          const active = selectedCode === d.code;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              className={[
                "text-left rounded-xl border p-4 transition",
                tileBg(d.criAvg),
                active ? "ring-2 ring-cyan-400/40" : "hover:border-white/20 hover:bg-white/5",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-100">{d.name}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {d.headcount} people • P90 {d.criP90.toFixed(1)}
                  </div>
                </div>
                <div className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm font-extrabold text-slate-100">
                  {d.criAvg.toFixed(1)}
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-300">
                <span className="text-slate-400">Top drivers:</span>{" "}
                <span className="font-medium">{d.topDrivers.slice(0, 2).join(" • ")}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

