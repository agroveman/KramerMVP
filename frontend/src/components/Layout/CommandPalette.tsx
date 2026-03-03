import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, GitBranch, FlaskConical, Plug, TrendingUp } from "lucide-react";

type Item = { to: string; label: string; icon: typeof LayoutDashboard };

const icons: Record<string, typeof LayoutDashboard> = {
  "/": LayoutDashboard,
  "/twin": GitBranch,
  "/simulate": FlaskConical,
  "/trends": TrendingUp,
  "/integrations": Plug,
};

export function CommandPalette({
  open,
  onClose,
  onSelect,
  currentPath,
  items,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath: string;
  items: Item[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(q) || i.to.toLowerCase().includes(q)
  );

  if (!open) return null;

  return (
    <>
      <div
        className="commandOverlay"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close"
      />
      <div className="commandPalette" role="dialog" aria-label="Command palette">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="commandInput"
        />
        <div className="commandList">
          {filtered.length === 0 ? (
            <div className="commandEmpty">No matches</div>
          ) : (
            filtered.map((item) => {
              const Icon = icons[item.to] ?? LayoutDashboard;
              const active = currentPath === item.to;
              return (
                <button
                  key={item.to}
                  type="button"
                  className={`commandItem ${active ? "commandItemActive" : ""}`}
                  onClick={() => onSelect(item.to)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
