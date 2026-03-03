declare module "react-cytoscapejs" {
  import type { Core, ElementsDefinition, Stylesheet } from "cytoscape";
  export default function CytoscapeComponent(props: {
    elements: Array<{ data: Record<string, unknown> }>;
    style?: React.CSSProperties;
    stylesheet?: Stylesheet[];
    layout?: Record<string, unknown>;
    cy?: (cy: Core) => void;
  }): JSX.Element;
}
