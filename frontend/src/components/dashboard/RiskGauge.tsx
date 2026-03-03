import { useEffect, useMemo, useState } from "react";

function riskBand(value: number) {
  if (value < 40) return { label: "Low", color: "text-teal-300", ring: "stroke-teal-400" };
  if (value < 65) return { label: "Moderate", color: "text-amber-300", ring: "stroke-amber-400" };
  return { label: "High", color: "text-rose-300", ring: "stroke-rose-500" };
}

export function RiskGauge({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const band = useMemo(() => riskBand(v), [v]);
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = animated;
    const to = v;
    const dur = 650;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = (animated / 100) * circumference;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-200">{label}</div>
          <div className="mt-1 text-xs text-slate-400">{caption}</div>
        </div>
        <div className={`rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs ${band.color}`}>
          {band.label}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="stroke-white/10"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            className={band.ring}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" className="fill-slate-100">
            <tspan className="text-2xl font-extrabold">{Math.round(animated)}</tspan>
          </text>
          <text x="60" y="82" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400">
            <tspan className="text-[11px] font-medium">/ 100</tspan>
          </text>
        </svg>

        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-300">Traffic-light thresholds</div>
          <div className="mt-2 grid gap-1 text-xs text-slate-400">
            <div>
              <span className="text-teal-300">Low</span> <span className="font-mono">{"< 40"}</span>
            </div>
            <div>
              <span className="text-amber-300">Moderate</span> <span className="font-mono">{"40–65"}</span>
            </div>
            <div>
              <span className="text-rose-300">High</span> <span className="font-mono">{"> 65"}</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            CRI summarizes interaction concentration, approval dependencies, tenure knowledge risk, and role coverage.
          </div>
        </div>
      </div>
    </div>
  );
}

