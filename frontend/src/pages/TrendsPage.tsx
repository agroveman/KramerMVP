import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/** Synthetic 12-month history for demo. */
function useSyntheticTrends() {
  return useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
    }

    const baseOrgCri = 54;
    const baseSpof = 4;
    const deptCodes = ["ENG", "OPS", "SAL", "CS", "MKT", "FIN"];

    return {
      orgCri: months.map((m, i) => ({
        month: m,
        cri: Math.round((baseOrgCri + Math.sin(i * 0.4) * 4 + (i / 12) * 2) * 10) / 10,
      })),
      spof: months.map((m, i) => ({
        month: m,
        spof: baseSpof + Math.floor(Math.sin(i * 0.3) * 1.5) + (i >= 8 ? 1 : 0),
      })),
      riskVelocity: months.map((m, i) => ({
        month: m,
        velocity: Math.round((2.1 + Math.sin(i * 0.5) * 0.6 + (i / 12) * 0.4) * 10) / 10,
      })),
      deptTrends: months.map((m, i) => {
        const entry: Record<string, string | number> = { month: m };
        deptCodes.forEach((code, j) => {
          const base = 48 + j * 4 + Math.sin((i + j) * 0.35) * 6;
          entry[code] = Math.round(Math.max(20, Math.min(85, base + (i / 12) * 3)) * 10) / 10;
        });
        return entry;
      }),
      deptCodes,
    };
  }, []);
}

export function TrendsPage() {
  const { orgCri, spof, riskVelocity, deptTrends, deptCodes } = useSyntheticTrends();

  const colors: Record<string, string> = {
    ENG: "#6ee7ff",
    OPS: "#22c55e",
    SAL: "#fbbf24",
    CS: "#a78bfa",
    MKT: "#f472b6",
    FIN: "#fb7185",
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Trends</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Synthetic 12‑month history: Org CRI, department trends, SPOF count, risk velocity.
          </div>
        </div>
        <span className="pill">
          <span style={{ color: "var(--primary)" }}>Demo data</span>
          <span className="tiny">simulated history</span>
        </span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 20, gap: 20 }}>
        <div className="card">
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>Organization CRI</div>
              <div className="tiny">Rolling 12 months</div>
            </div>
          </div>
          <div className="cardBody" style={{ paddingTop: 10 }}>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orgCri}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis domain={[40, 70]} stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cri"
                    stroke="rgba(110, 231, 255, 0.9)"
                    fill="rgba(110, 231, 255, 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>SPOF count</div>
              <div className="tiny">Single points of failure</div>
            </div>
          </div>
          <div className="cardBody" style={{ paddingTop: 10 }}>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spof}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis domain={[0, 8]} stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spof"
                    stroke="rgba(251, 113, 133, 0.9)"
                    strokeWidth={2}
                    dot={{ fill: "rgba(251,113,133,0.6)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>Department CRI trends</div>
              <div className="tiny">Average CRI by department over 12 months</div>
            </div>
          </div>
          <div className="cardBody" style={{ paddingTop: 10 }}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deptTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis domain={[20, 90]} stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                    }}
                  />
                  <Legend />
                  {deptCodes.map((code) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={code}
                      stroke={colors[code] ?? "rgba(255,255,255,0.6)"}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div style={{ fontWeight: 900 }}>Risk velocity</div>
              <div className="tiny">Change rate (CRI pts / month)</div>
            </div>
          </div>
          <div className="cardBody" style={{ paddingTop: 10 }}>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskVelocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis domain={[1, 4]} stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="velocity"
                    stroke="rgba(251, 191, 36, 0.9)"
                    fill="rgba(251, 191, 36, 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
