import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, FlaskConical, Plug, TrendingUp, ChevronLeft, ChevronRight, Search, Bell } from "lucide-react";
import { NavLink } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `railLink ${isActive ? "railLinkActive" : ""}`;

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/twin", label: "Org Twin", icon: GitBranch },
  { to: "/simulate", label: "Simulation", icon: FlaskConical },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/integrations", label: "Integrations", icon: Plug },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifCount] = useState(3);
  const navigate = useNavigate();
  const location = useLocation();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleCommandSelect(path: string) {
    navigate(path);
    closeSearch();
  }

  return (
    <div className="appLayout">
      <aside className={`rail ${railCollapsed ? "railCollapsed" : ""}`}>
        <div className="railBrand">
          <div className="brandMark" title="ContinuityIQ" />
          {!railCollapsed && (
            <div className="railBrandText">
              <span className="railBrandName">ContinuityIQ</span>
              <span className="tiny">Continuity digital twin</span>
            </div>
          )}
        </div>
        <nav className="railNav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass} end={to === "/"}>
              <Icon size={20} strokeWidth={2} />
              {!railCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="railCollapseBtn"
          onClick={() => setRailCollapsed((c) => !c)}
          title={railCollapsed ? "Expand" : "Collapse"}
          aria-label={railCollapsed ? "Expand" : "Collapse"}
        >
          {railCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <div className="appMain">
        <header className="topHeader">
          <button type="button" className="headerSearchBtn" onClick={openSearch} title="Search (Ctrl+K)">
            <Search size={18} />
            <span>Search…</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="headerRight">
            <button type="button" className="headerIconBtn" title="Notifications" aria-label="Notifications">
              <Bell size={20} />
              {notifCount > 0 && <span className="notifBadge">{notifCount}</span>}
            </button>
          </div>
        </header>

        <main className="appContent">{children}</main>
      </div>

      <CommandPalette
        open={searchOpen}
        onClose={closeSearch}
        onSelect={handleCommandSelect}
        currentPath={location.pathname}
        items={navItems}
      />
    </div>
  );
}
