import { Router } from "express";
import type { AttritionRequest, RestructureRequest } from "../types/api";
import { simulateAttrition, simulateRestructure, simulateSuccession } from "../services/simulationService";

const router = Router();

router.post("/attrition", async (req, res) => {
  const body = req.body as AttritionRequest;
  const ids = Array.isArray(body?.employee_ids) ? body.employee_ids : [];
  if (ids.length < 1 || ids.length > 5) {
    return res.status(400).json({ error: "employee_ids must contain 1 to 5 employee ids" });
  }
  const result = await simulateAttrition(ids);
  res.json(result);
});

router.post("/restructure", async (req, res) => {
  const body = req.body as RestructureRequest;
  const moves = Array.isArray(body?.moves) ? body.moves : [];
  if (moves.length < 1) {
    return res.status(400).json({ error: "moves must be a non-empty array" });
  }
  const result = await simulateRestructure(moves);
  res.json(result);
});

router.post("/succession", async (req, res) => {
  const employeeId = Number(req.body?.employee_id);
  if (!employeeId || isNaN(employeeId)) {
    return res.status(400).json({ error: "employee_id is required" });
  }
  const result = await simulateSuccession(employeeId);
  res.json(result);
});

export default router;

