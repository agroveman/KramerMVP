import { Router } from "express";
import { getOrgStructure } from "../services/orgService";
import { buildDependencyGraph, buildInteractionGraph } from "../services/metricsService";

const router = Router();

router.get("/structure", async (_req, res) => {
  const data = await getOrgStructure();
  res.json(data);
});

router.get("/interaction-graph", async (_req, res) => {
  const { employees, edges } = await buildInteractionGraph();
  res.json({
    nodes: employees.map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}`,
      departmentCode: e.department.code,
      title: e.title,
      level: e.level,
    })),
    edges: edges.map((e) => ({ source: e.u, target: e.v, weight: e.w })),
  });
});

router.get("/dependency-graph", async (_req, res) => {
  const { employees } = await buildInteractionGraph(); // reuse employee+dept lookup
  const dep = await buildDependencyGraph();
  res.json({
    nodes: employees.map((e) => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}`,
      departmentCode: e.department.code,
      title: e.title,
      level: e.level,
    })),
    edges: dep.directedEdges,
    workflows: dep.workflows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      type: wf.type,
      steps: (dep.stepsByWorkflow.get(wf.id) ?? []).map((s) => ({
        order: s.order,
        approverId: s.approverId,
        isEscalation: s.isEscalation,
      })),
    })),
  });
});

export default router;

