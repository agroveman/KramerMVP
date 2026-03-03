import { useEffect, useState } from "react";
import { Settings, CheckCircle, Clock, Shield, Database } from "lucide-react";
import { apiGet, apiPost } from "../api/client";

type ProviderStatus = "connected" | "configured" | "pending" | "mock";

type Connector = {
  id: string;
  name: string;
  category: "HRIS" | "Collab" | "Productivity";
  status: ProviderStatus;
  lastSync?: string;
  description: string;
};

type ProvidersResponse = {
  providers: Array<{ id: string; name: string; status: "mock" }>;
};

const ALL_CONNECTORS: Connector[] = [
  { id: "workday", name: "Workday", category: "HRIS", status: "connected", lastSync: "2 hours ago", description: "Org structure, headcount, tenure" },
  { id: "adp", name: "ADP", category: "HRIS", status: "configured", lastSync: "1 day ago", description: "Payroll, benefits, employee records" },
  { id: "google_calendar", name: "Google Calendar", category: "Collab", status: "connected", lastSync: "15 min ago", description: "Meetings, attendees, duration" },
  { id: "slack", name: "Slack", category: "Collab", status: "pending", description: "Channels, DMs, presence (planned)" },
  { id: "m365", name: "Microsoft 365", category: "Productivity", status: "pending", description: "Outlook, Teams, SharePoint (planned)" },
  { id: "jira", name: "Jira", category: "Productivity", status: "pending", description: "Workflows, approvals, assignees (planned)" },
];

export function IntegrationsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(ALL_CONNECTORS);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [dataFreshness] = useState({
    lastFullSync: "2 hours ago",
    nextSync: "in 4 hours",
    qualityScore: 94,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setError(null);
        const res = await apiGet<ProvidersResponse>("/api/integrations/providers");
        if (!alive) return;
        const apiIds = new Set(res.providers.map((p) => p.id));
        setConnectors((prev) =>
          prev.map((c) => (apiIds.has(c.id) ? { ...c, status: "mock" as ProviderStatus } : c))
        );
      } catch {
        // keep default connectors on error
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function importHris() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await apiPost<{ ok: boolean; message: string }>("/api/integrations/import/hris-demo", {});
      setMsg(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function importCollab() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await apiPost<{ ok: boolean; message: string }>("/api/integrations/import/collab-demo", {});
      setMsg(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function statusIcon(s: ProviderStatus) {
    if (s === "connected") return <CheckCircle size={16} style={{ color: "var(--primary-2)" }} />;
    if (s === "configured") return <Settings size={16} style={{ color: "var(--warn)" }} />;
    return <Clock size={16} style={{ color: "var(--muted2)" }} />;
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>Integrations</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Enterprise connectors for HRIS, collaboration, and productivity. Demo mode uses one-click reseed.
          </div>
        </div>
        <span className="pill">
          <span style={{ color: "var(--primary)" }}>Demo</span>
          <span className="tiny">mock connectors</span>
        </span>
      </div>

      {error && (
        <div className="card" style={{ marginTop: 14, borderColor: "rgba(251,113,133,0.35)" }}>
          <div className="cardBody">
            <div style={{ fontWeight: 800 }}>Error</div>
            <div className="tiny" style={{ marginTop: 6 }}>{error}</div>
          </div>
        </div>
      )}

      {msg && (
        <div className="card" style={{ marginTop: 14, borderColor: "rgba(34,197,94,0.35)" }}>
          <div className="cardBody">
            <div style={{ fontWeight: 900 }}>Done</div>
            <div className="tiny" style={{ marginTop: 6 }}>{msg}</div>
          </div>
        </div>
      )}

      {/* Data freshness */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={20} style={{ color: "var(--primary)" }} />
            <div>
              <div style={{ fontWeight: 900 }}>Data freshness</div>
              <div className="tiny">Last full sync • Next sync • Quality score</div>
            </div>
          </div>
          <span className="pill" style={{ background: "rgba(34,197,94,0.15)", color: "var(--primary-2)" }}>
            {dataFreshness.qualityScore}% quality
          </span>
        </div>
        <div className="cardBody" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <div className="tiny">Last full sync</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{dataFreshness.lastFullSync}</div>
          </div>
          <div>
            <div className="tiny">Next scheduled sync</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{dataFreshness.nextSync}</div>
          </div>
          <div>
            <div className="tiny">Data quality score</div>
            <div style={{ fontWeight: 800, marginTop: 4 }}>{dataFreshness.qualityScore}%</div>
          </div>
        </div>
      </div>

      {/* Connector cards */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 14, gap: 14 }}>
        {connectors.map((c) => (
          <div key={c.id} className="card">
            <div className="cardHeader">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900 }}>{c.name}</span>
                  {statusIcon(c.status)}
                </div>
                <div className="tiny" style={{ marginTop: 4 }}>
                  {c.category} • {c.status === "connected" || c.status === "configured" ? c.lastSync ?? "—" : "Not connected"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {c.status !== "pending" && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setConfigModal(c.id)}
                    title="Configure"
                  >
                    <Settings size={16} />
                  </button>
                )}
                <span className="pill">{c.category}</span>
              </div>
            </div>
            <div className="cardBody">
              <div className="muted" style={{ fontSize: 13 }}>{c.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Demo imports */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div>
            <div style={{ fontWeight: 900 }}>Demo imports</div>
            <div className="tiny">Re-seed the database to reset demo data.</div>
          </div>
        </div>
        <div className="cardBody" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btnPrimary" onClick={importHris} disabled={busy}>
            Import demo HRIS
          </button>
          <button className="btn btnPrimary" onClick={importCollab} disabled={busy}>
            Import demo collaboration metadata
          </button>
          <span className="tiny">(Runs the seed script again.)</span>
        </div>
      </div>

      {/* Privacy & compliance */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={20} style={{ color: "var(--primary-2)" }} />
            <div>
              <div style={{ fontWeight: 900 }}>Privacy & compliance</div>
              <div className="tiny">Data handling, retention, and security</div>
            </div>
          </div>
        </div>
        <div className="cardBody">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={16} style={{ color: "var(--primary-2)" }} /> GDPR compliant
              </div>
              <div className="tiny" style={{ marginTop: 4 }}>
                Metadata-only processing; no message content ingested.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={16} style={{ color: "var(--primary-2)" }} /> Data retention
              </div>
              <div className="tiny" style={{ marginTop: 4 }}>
                12‑month rolling retention; configurable per connector.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configure modal */}
      {configModal && (
        <>
          <div
            className="commandOverlay"
            onClick={() => setConfigModal(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Escape" && setConfigModal(null)}
          />
          <div className="commandPalette" style={{ top: "50%", transform: "translate(-50%, -50%)" }}>
            <div className="cardBody" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  Configure {connectors.find((c) => c.id === configModal)?.name}
                </div>
                <button type="button" className="btn" onClick={() => setConfigModal(null)}>
                  Close
                </button>
              </div>
              <div className="muted" style={{ marginBottom: 16 }}>
                In production, this would open OAuth or API key configuration. Demo mode uses mock data.
              </div>
              <button type="button" className="btn btnPrimary" onClick={() => setConfigModal(null)}>
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
