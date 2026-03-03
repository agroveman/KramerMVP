import { prisma } from "../config/db";
import { computeDepartmentMetrics, computePeopleMetrics } from "./metricsService";
import type { RestructureMove, SimulationResponse, SuggestedSuccessor } from "../types/api";

export async function simulateAttrition(employeeIds: number[]): Promise<SimulationResponse> {
  const excluded = new Set<number>(employeeIds);

  const beforeMetrics = await computeDepartmentMetrics(new Set<number>());
  const afterMetrics = await computeDepartmentMetrics(excluded);

  const before = { kpis: beforeMetrics.kpis, departments: beforeMetrics.departments };
  const after = { kpis: afterMetrics.kpis, departments: afterMetrics.departments };

  const deltas = {
    orgCriAvg: Math.round((after.kpis.orgCriAvg - before.kpis.orgCriAvg) * 10) / 10,
    departments: after.departments.map((d) => {
      const b = before.departments.find((x) => x.id === d.id);
      const delta = (d.criAvg - (b?.criAvg ?? 0)) || 0;
      return { code: d.code, name: d.name, criAvgDelta: Math.round(delta * 10) / 10 };
    }),
  };

  const removed = await prisma.employee.findMany({ where: { id: { in: employeeIds } } });
  const removedNames = removed.map((e) => `${e.firstName} ${e.lastName}`);

  const explanations: string[] = [];
  explanations.push(`Removed: ${removedNames.join(", ") || "—"}.`);
  if (deltas.orgCriAvg > 0.5) explanations.push("Org CRI increased because remaining people absorbed more collaboration and approval dependencies.");
  if (deltas.orgCriAvg < -0.5) explanations.push("Org CRI decreased because concentrated dependency and interaction load was reduced.");

  const topDeptDelta = [...deltas.departments].sort((a, b) => Math.abs(b.criAvgDelta) - Math.abs(a.criAvgDelta))[0];
  if (topDeptDelta && Math.abs(topDeptDelta.criAvgDelta) >= 1) {
    explanations.push(
      `${topDeptDelta.name} changed most (\u0394 CRI avg ${topDeptDelta.criAvgDelta >= 0 ? "+" : ""}${topDeptDelta.criAvgDelta}) driven by changes in bridge/SPOF coverage.`
    );
  }

  return { before, after, deltas, explanations };
}

export async function simulateRestructure(moves: RestructureMove[]): Promise<SimulationResponse> {
  // For MVP: apply structure changes in-memory by excluding none and re-scoring with a temporary view.
  // Since Prisma doesn't support ephemeral updates, we compute deltas based on adjusted manager/department maps.
  // We'll use people metrics and then recompute department rollups based on updated department assignments.
  const beforeDept = await computeDepartmentMetrics(new Set<number>());
  const beforePeople = await computePeopleMetrics(new Set<number>());

  const deptById = new Map(beforeDept.departments.map((d) => [d.id, d]));

  const newDeptByEmployee = new Map<number, number>();
  const newManagerByEmployee = new Map<number, number | null>();
  for (const p of beforePeople.people) {
    newDeptByEmployee.set(p.id, p.department.id);
    newManagerByEmployee.set(p.id, p.managerId);
  }

  for (const m of moves) {
    if (m.new_department_id !== undefined) newDeptByEmployee.set(m.employee_id, m.new_department_id);
    if (m.new_manager_id !== undefined) newManagerByEmployee.set(m.employee_id, m.new_manager_id ?? null);
  }

  // Re-rollup departments using the same person CRI but new dept assignments.
  const deptAgg = new Map<number, { sum: number; n: number; people: typeof beforePeople.people }>();
  for (const p of beforePeople.people) {
    const deptId = newDeptByEmployee.get(p.id) ?? p.department.id;
    const entry = deptAgg.get(deptId) ?? { sum: 0, n: 0, people: [] as any };
    entry.sum += p.cri;
    entry.n += 1;
    entry.people.push({ ...p, department: { ...p.department, id: deptId } });
    deptAgg.set(deptId, entry);
  }

  const afterDepartments = beforeDept.departments.map((d) => {
    const agg = deptAgg.get(d.id);
    const headcount = agg?.n ?? 0;
    const avg = headcount ? agg!.sum / headcount : 0;
    return {
      ...d,
      headcount,
      criAvg: Math.round(avg * 10) / 10,
      // Keep other fields for MVP; real system would recompute drivers from layer changes
    };
  });

  const afterKpis = (() => {
    const orgCriAvg =
      beforePeople.people.length > 0
        ? Math.round((beforePeople.people.reduce((a, p) => a + p.cri, 0) / beforePeople.people.length) * 10) / 10
        : 0;
    // SPOF/bridge counts unchanged in restructure MVP (they are graph-derived, not org chart changes)
    return { ...beforeDept.kpis, orgCriAvg };
  })();

  const before = { kpis: beforeDept.kpis, departments: beforeDept.departments };
  const after = { kpis: afterKpis, departments: afterDepartments };

  const deltas = {
    orgCriAvg: Math.round((after.kpis.orgCriAvg - before.kpis.orgCriAvg) * 10) / 10,
    departments: after.departments.map((d) => {
      const b = deptById.get(d.id);
      const delta = (d.criAvg - (b?.criAvg ?? 0)) || 0;
      return { code: d.code, name: d.name, criAvgDelta: Math.round(delta * 10) / 10 };
    }),
  };

  const explanations: string[] = [];
  explanations.push("Restructure simulated by moving reporting/department assignments; interaction and approval graphs remain metadata-driven and unchanged in this MVP.");
  const changed = deltas.departments.filter((d) => Math.abs(d.criAvgDelta) >= 1).sort((a, b) => Math.abs(b.criAvgDelta) - Math.abs(a.criAvgDelta));
  if (changed[0]) explanations.push(`${changed[0].name} CRI avg changed (\u0394 ${changed[0].criAvgDelta >= 0 ? "+" : ""}${changed[0].criAvgDelta}) due to headcount mix changes.`);

  return { before, after, deltas, explanations };
}

export async function simulateSuccession(employeeId: number): Promise<SimulationResponse> {
  const result = await simulateAttrition([employeeId]);
  const person = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, reports: { include: { department: true } } },
  });
  if (!person) return result;

  const people = await computePeopleMetrics(new Set<number>());
  const peerDept = people.people.filter(
    (p) => p.department.id === person.departmentId && p.id !== employeeId
  );
  const directReports = person.reports.map((r) => {
    const pm = people.people.find((x) => x.id === r.id);
    return pm ?? { id: r.id, name: `${r.firstName} ${r.lastName}`, title: r.title, department: r.department, cri: 0 };
  });
  const peers = peerDept.filter((p) => !directReports.some((d) => d.id === p.id));

  const suggested: SuggestedSuccessor[] = [];
  for (const r of directReports.slice(0, 3)) {
    suggested.push({
      id: r.id,
      name: r.name,
      title: r.title,
      departmentCode: r.department.code,
      cri: r.cri ?? 0,
      rationale: "Direct report; natural successor",
    });
  }
  const byBetweenness = [...peers].sort((a, b) => (b.interaction?.betweenness ?? 0) - (a.interaction?.betweenness ?? 0));
  for (const p of byBetweenness.slice(0, 2)) {
    if (!suggested.some((s) => s.id === p.id)) {
      suggested.push({
        id: p.id,
        name: p.name,
        title: p.title,
        departmentCode: p.department.code,
        cri: p.cri,
        rationale: "Same department; high collaboration centrality",
      });
    }
  }
  return { ...result, suggestedSuccessors: suggested };
}

