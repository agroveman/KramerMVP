import { useCallback, useRef, useEffect } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import type { Core } from "cytoscape";

export type CytoscapeElements = {
  nodes: Array<{ data: { id: string; label: string; color: string; size: number; cri: number; dept: string } }>;
  edges: Array<{ data: { id: string; source: string; target: string; weight: number } }>;
};
type Layer = "structural" | "interaction" | "dependency";

export function CytoscapeGraph({
  elements,
  layer,
  selectedId: _selectedId,
  onSelect,
  onReady,
  searchHighlightId,
  highRiskOnly,
}: {
  elements: CytoscapeElements;
  layer: Layer;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onReady: (cy: Core) => void;
  searchHighlightId: number | null;
  highRiskOnly: boolean;
}) {
  const cyRef = useRef<Core | null>(null);

  const layoutName = layer === "structural" ? "breadthfirst" : "cose";

  const handleSelect = useCallback(
    (evt: { target: { isNode?: () => boolean; data: (key?: string) => unknown } }) => {
      const target = evt.target;
      if (!target?.isNode?.()) return;
      const raw = target.data("id");
      const id = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : null;
      onSelect(id != null && !Number.isNaN(id) ? id : null);
    },
    [onSelect]
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.on("tap", "node", handleSelect);
    return () => {
      cy.removeListener("tap", "node", handleSelect);
    };
  }, [handleSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    if (searchHighlightId != null) {
      cy.elements().removeClass("highlight");
      const node = cy.getElementById(String(searchHighlightId));
      if (node.length) {
        node.addClass("highlight");
        cy.animate({ center: { eles: node } }, { duration: 400 });
      }
    } else {
      cy.elements().removeClass("highlight");
    }
  }, [searchHighlightId]);

  const stylesheet = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": 10,
        color: "#e2e8f0",
        "background-color": "data(color)",
        width: "data(size)",
        height: "data(size)",
        "border-width": 2,
        "border-color": "#475569",
        "text-margin-y": 2,
      },
    },
    {
      selector: "node.highlight",
      style: {
        "border-width": 4,
        "border-color": "#22d3ee",
      },
    },
    {
      selector: "edge",
      style: {
        width: "data(weight)",
        "line-color": "rgba(148, 163, 184, 0.5)",
        "target-arrow-color": "rgba(148, 163, 184, 0.6)",
        "target-arrow-shape": layer === "dependency" ? "triangle" : "none",
        "curve-style": "bezier",
      },
    },
  ];

  const highRiskIds = new Set(
    highRiskOnly ? elements.nodes.filter((n) => n.data.cri >= 65).map((n) => n.data.id) : elements.nodes.map((n) => n.data.id)
  );
  const filteredNodes = elements.nodes.filter((n) => highRiskIds.has(n.data.id));
  const filteredEdges = elements.edges.filter(
    (e) => highRiskIds.has(e.data.source) && highRiskIds.has(e.data.target)
  );
  const flatElements = [
    ...filteredNodes.map((n) => ({ data: n.data })),
    ...filteredEdges.map((e) => ({ data: e.data })),
  ];

  const rootId = elements.nodes.length
    ? elements.nodes.find((n) => !elements.edges.some((e) => e.data.target === n.data.id))?.data.id ??
      elements.nodes[0]?.data.id
    : undefined;
  const layoutOpts =
    layoutName === "breadthfirst" && rootId
      ? {
          name: "breadthfirst",
          directed: true,
          spacingFactor: 1.2,
          roots: `#${rootId}`,
        }
      : {
          name: "cose",
          animate: true,
          animationDuration: 500,
          nodeRepulsion: 8000,
          idealEdgeLength: 80,
        };

  const cyCallback = useCallback(
    (cy: Core) => {
      cyRef.current = cy;
      onReady(cy);
    },
    [onReady]
  );

  return (
    <CytoscapeComponent
      elements={flatElements}
      style={{ width: "100%", height: 560 }}
      stylesheet={stylesheet}
      layout={layoutOpts as Record<string, unknown>}
      cy={cyCallback}
    />
  );
}
