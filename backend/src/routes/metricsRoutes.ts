import { Router } from "express";
import { computeDepartmentMetrics, computePeopleMetrics, CRI_FORMULA } from "../services/metricsService";

const router = Router();

router.get("/people", async (_req, res) => {
  const { kpis, people } = await computePeopleMetrics(new Set());
  res.json({ kpis, people, criFormula: CRI_FORMULA });
});

router.get("/departments", async (_req, res) => {
  const { departments, kpis } = await computeDepartmentMetrics(new Set());
  res.json({ kpis, departments });
});

export default router;

