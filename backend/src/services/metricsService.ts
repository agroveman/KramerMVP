import { prisma } from "../config/db";
import type { Department, Employee, Workflow, WorkflowStep } from "@prisma/client";
import {
  articulationPoints,
  betweennessCentralityWeighted,
  clamp,
  percentileRank,
} from "./graphMath";
import type {
  DepartmentMetric,
  DepartmentsMetricsResponse,
  PeopleMetricsResponse,
  PersonMetric,
} from "../types/api";

type PersonComputed = {
  employee: Employee & { department: Department };
  degree: number;
  betweenness: number;
  interactionPct: number;
  workflowAppearances: number;
  approvalStepCount: number;
  workflowPct: number;
  tenureRisk: number;
  coverageRisk: number;
  isSPOF: boolean;
  tags: string[];
  cri: number;
};

export const CRI_FORMULA = {
  weights: {
    interaction: 0.35,
    workflow: 0.35,
    tenure: 0.15,
    coverage: 0.15,
  },
  tenureRationale:
    "Higher tenure implies more institutional knowledge concentration. Losing high-tenure people tends to disrupt continuity.",
  metadataOnly: "ContinuityIQ uses collaboration metadata only (co-attendance), never message content.",
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round0(n: number) {
  return Math.round(n);
}

function fullName(e: Employee) {
  return `${e.firstName} ${e.lastName}`;
}

export async function buildInteractionGraph(excludedEmployeeIds = new Set<number>()) {
  const employees = await prisma.employee.findMany({
    include: { department: true },
  });
  const activeEmployees = employees.filter((e) => !excludedEmployeeIds.has(e.id));
  const nodeIds = activeEmployees.map((e) => e.id);

  const attendees = await prisma.meetingAttendee.findMany({
    where: { employeeId: { notIn: [...excludedEmployeeIds] } },
    include: { meeting: { include: { attendees: true } } },
  });

  // Build meeting->attendees map
  const meetingToEmployeeIds = new Map<number, number[]>();
  for (const a of attendees) {
    const list = meetingToEmployeeIds.get(a.meetingId) ?? [];
    list.push(a.employeeId);
    meetingToEmployeeIds.set(a.meetingId, list);
  }

  // Weighted co-attendance edges
  const edgeWeight = new Map<string, number>();
  for (const [_meetingId, empIdsRaw] of meetingToEmployeeIds.entries()) {
    const empIds = [...new Set(empIdsRaw)];
    for (let i = 0; i < empIds.length; i++) {
      for (let j = i + 1; j < empIds.length; j++) {
        const u = empIds[i];
        const v = empIds[j];
        if (u === undefined || v === undefined) continue;
        const key = u < v ? `${u}-${v}` : `${v}-${u}`;
        edgeWeight.set(key, (edgeWeight.get(key) ?? 0) + 1);
      }
    }
  }

  const edges = [...edgeWeight.entries()]
    .map(([key, w]) => {
      const [aStr, bStr] = key.split("-");
      if (!aStr || !bStr) return null;
      const a = Number(aStr);
      const b = Number(bStr);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return { u: a, v: b, w };
    })
    .filter((e): e is { u: number; v: number; w: number } => e !== null);

  const betweenness = betweennessCentralityWeighted(nodeIds, edges);

  const degree = new Map<number, number>();
  for (const id of nodeIds) degree.set(id, 0);
  for (const e of edges) {
    degree.set(e.u, (degree.get(e.u) ?? 0) + e.w);
    degree.set(e.v, (degree.get(e.v) ?? 0) + e.w);
  }

  return { employees: activeEmployees, edges, degree, betweenness };
}

export async function buildDependencyGraph(excludedEmployeeIds = new Set<number>()) {
  const workflows = await prisma.workflow.findMany({
    include: { steps: true },
    orderBy: { id: "asc" },
  });

  const stepsByWorkflow = new Map<number, WorkflowStep[]>();
  for (const wf of workflows) {
    const steps = wf.steps
      .filter((s) => !excludedEmployeeIds.has(s.approverId))
      .sort((a, b) => a.order - b.order);
    stepsByWorkflow.set(wf.id, steps);
  }

  const appearanceCount = new Map<number, number>(); // employeeId -> workflows appeared in
  const approvalStepCount = new Map<number, number>(); // employeeId -> steps count
  const perWorkflowApprovers = new Map<number, Set<number>>();

  for (const wf of workflows) {
    const steps = stepsByWorkflow.get(wf.id) ?? [];
    const approvers = new Set<number>();
    for (const s of steps) {
      approvers.add(s.approverId);
      approvalStepCount.set(s.approverId, (approvalStepCount.get(s.approverId) ?? 0) + 1);
    }
    perWorkflowApprovers.set(wf.id, approvers);
    for (const empId of approvers) {
      appearanceCount.set(empId, (appearanceCount.get(empId) ?? 0) + 1);
    }
  }

  // Build directed edges between consecutive approvers, aggregated
  const edgeAgg = new Map<string, { count: number; types: Set<string> }>();
  const undirectedEdges: Array<{ u: number; v: number }> = [];

  for (const wf of workflows) {
    const steps = stepsByWorkflow.get(wf.id) ?? [];
    for (let i = 0; i < steps.length - 1; i++) {
      const stepA = steps[i];
      const stepB = steps[i + 1];
      if (!stepA || !stepB) continue;
      const a = stepA.approverId;
      const b = stepB.approverId;
      if (excludedEmployeeIds.has(a) || excludedEmployeeIds.has(b)) continue;
      const key = `${a}->${b}`;
      const entry = edgeAgg.get(key) ?? { count: 0, types: new Set<string>() };
      entry.count += 1;
      entry.types.add(wf.type);
      edgeAgg.set(key, entry);
      undirectedEdges.push({ u: a, v: b });
    }
  }

  const nodeIds = [...new Set(undirectedEdges.flatMap((e) => [e.u, e.v]))];
  const articulation = articulationPoints(nodeIds, undirectedEdges);

  // SPOF heuristic: appears in many workflows OR is an articulation point in dependency network
  const workflowAppearancesValues = [...appearanceCount.values()].sort((a, b) => a - b);
  const spof = new Set<number>();
  for (const [empId, count] of appearanceCount.entries()) {
    const pct = percentileRank(count, workflowAppearancesValues);
    if (count >= 4 || pct >= 0.9) spof.add(empId);
  }
  for (const id of articulation) spof.add(id);

  return {
    workflows,
    stepsByWorkflow,
    appearanceCount,
    approvalStepCount,
    directedEdges: [...edgeAgg.entries()]
      .map(([key, v]) => {
        const [sStr, tStr] = key.split("->");
        if (!sStr || !tStr) return null;
        const source = Number(sStr);
        const target = Number(tStr);
        if (!Number.isFinite(source) || !Number.isFinite(target)) return null;
        return { source, target, workflowCount: v.count, workflowTypes: [...v.types] };
      })
      .filter(
        (e): e is { source: number; target: number; workflowCount: number; workflowTypes: string[] } =>
          e !== null
      ),
    articulation,
    spof,
  };
}

export async function computePeopleMetrics(excludedEmployeeIds = new Set<number>()): Promise<{
  people: PersonMetric[];
  computed: PersonComputed[];
  kpis: PeopleMetricsResponse["kpis"];
}> {
  const employees = await prisma.employee.findMany({
    include: { department: true },
  });
  const active = employees.filter((e) => !excludedEmployeeIds.has(e.id));

  const { edges, degree, betweenness } = await buildInteractionGraph(excludedEmployeeIds);
  const dep = await buildDependencyGraph(excludedEmployeeIds);

  const degreeValues = active.map((e) => degree.get(e.id) ?? 0).sort((a, b) => a - b);
  const betValues = active.map((e) => betweenness.get(e.id) ?? 0).sort((a, b) => a - b);
  const workflowValues = active
    .map((e) => dep.appearanceCount.get(e.id) ?? 0)
    .sort((a, b) => a - b);
  const tenureValues = active.map((e) => e.tenureMonths).sort((a, b) => a - b);

  // Coverage risk: if only one person has this title inside their department
  const titleCountByDept = new Map<string, number>();
  for (const e of active) {
    const key = `${e.departmentId}::${e.title}`;
    titleCountByDept.set(key, (titleCountByDept.get(key) ?? 0) + 1);
  }

  const computed: PersonComputed[] = active.map((e) => {
    const deg = degree.get(e.id) ?? 0;
    const bet = betweenness.get(e.id) ?? 0;
    const interactionPct = 0.5 * percentileRank(deg, degreeValues) + 0.5 * percentileRank(bet, betValues);

    const workflowAppearances = dep.appearanceCount.get(e.id) ?? 0;
    const approvalStepCount = dep.approvalStepCount.get(e.id) ?? 0;
    const workflowPct = percentileRank(workflowAppearances, workflowValues);

    const tenurePct = percentileRank(e.tenureMonths, tenureValues);
    // Tenure risk scaled 0-1 (higher tenure => higher risk)
    const tenureRisk = tenurePct;

    const titleKey = `${e.departmentId}::${e.title}`;
    const isUniqueTitleInDept = (titleCountByDept.get(titleKey) ?? 0) === 1;
    const coverageRisk = isUniqueTitleInDept ? 1 : 0;

    const isSPOF = dep.spof.has(e.id);

    const tags: string[] = [];
    // Tags based on percentiles for a compelling demo
    if (percentileRank(bet, betValues) >= 0.9) tags.push("Bridge");
    if (percentileRank(deg, degreeValues) >= 0.9) tags.push("Connector");
    if (isSPOF) tags.push("SPOF");

    const cri =
      100 *
      (CRI_FORMULA.weights.interaction * interactionPct +
        CRI_FORMULA.weights.workflow * workflowPct +
        CRI_FORMULA.weights.tenure * tenureRisk +
        CRI_FORMULA.weights.coverage * coverageRisk);

    return {
      employee: e,
      degree: deg,
      betweenness: bet,
      interactionPct,
      workflowAppearances,
      approvalStepCount,
      workflowPct,
      tenureRisk,
      coverageRisk,
      isSPOF,
      tags,
      cri: clamp(cri, 0, 100),
    };
  });

  const people: PersonMetric[] = computed
    .map((c) => ({
      id: c.employee.id,
      externalId: c.employee.externalId,
      name: fullName(c.employee),
      department: { id: c.employee.department.id, code: c.employee.department.code, name: c.employee.department.name },
      title: c.employee.title,
      level: c.employee.level,
      tenureMonths: c.employee.tenureMonths,
      managerId: c.employee.managerId,
      tags: c.tags,
      cri: round1(c.cri),
      criBreakdown: {
        interactionPct: round0(c.interactionPct * 100),
        workflowPct: round0(c.workflowPct * 100),
        tenureRisk: round0(c.tenureRisk * 100),
        coverageRisk: round0(c.coverageRisk * 100),
      },
      interaction: { degree: round1(c.degree), betweenness: round1(c.betweenness) },
      workflow: {
        approvalStepCount: c.approvalStepCount,
        workflowAppearances: c.workflowAppearances,
        isSPOF: c.isSPOF,
      },
    }))
    .sort((a, b) => b.cri - a.cri);

  const orgCriAvg = people.length ? people.reduce((acc, p) => acc + p.cri, 0) / people.length : 0;
  const spofCount = people.filter((p) => p.tags.includes("SPOF")).length;
  const bridgeCount = people.filter((p) => p.tags.includes("Bridge")).length;

  // Highest risk department by avg CRI
  const deptAgg = new Map<string, { code: string; name: string; sum: number; n: number }>();
  for (const p of people) {
    const key = p.department.code;
    const entry = deptAgg.get(key) ?? { code: p.department.code, name: p.department.name, sum: 0, n: 0 };
    entry.sum += p.cri;
    entry.n += 1;
    deptAgg.set(key, entry);
  }
  const deptSorted = [...deptAgg.values()]
    .map((d) => ({ ...d, avg: d.n ? d.sum / d.n : 0 }))
    .sort((a, b) => b.avg - a.avg);

  const topDept = deptSorted[0];
  const highestRiskDepartment = topDept
    ? { code: topDept.code, name: topDept.name, criAvg: round1(topDept.avg) }
    : null;

  return {
    computed,
    people,
    kpis: {
      orgCriAvg: round1(orgCriAvg),
      highestRiskDepartment,
      singlePointsOfFailure: spofCount,
      bridgeRoles: bridgeCount,
    },
  };
}

export async function computeDepartmentMetrics(
  excludedEmployeeIds = new Set<number>()
): Promise<DepartmentsMetricsResponse & { kpis: PeopleMetricsResponse["kpis"] }> {
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const { people, computed, kpis } = await computePeopleMetrics(excludedEmployeeIds);

  const computedById = new Map<number, PersonComputed>();
  for (const c of computed) computedById.set(c.employee.id, c);

  const peopleByDept = new Map<number, PersonMetric[]>();
  for (const p of people) {
    const list = peopleByDept.get(p.department.id) ?? [];
    list.push(p);
    peopleByDept.set(p.department.id, list);
  }

  const deptMetrics: DepartmentMetric[] = departments.map((d) => {
    const deptPeople = peopleByDept.get(d.id) ?? [];
    const headcount = deptPeople.length;
    const avg = headcount ? deptPeople.reduce((a, p) => a + p.cri, 0) / headcount : 0;
    const sorted = [...deptPeople].sort((a, b) => a.cri - b.cri);
    let p90 = 0;
    if (headcount) {
      const idx = Math.floor(0.9 * (headcount - 1));
      const item = sorted[idx];
      p90 = item ? item.cri : 0;
    }

    // Driver hints based on dept-average breakdown
    let interactionAvg = 0;
    let workflowAvg = 0;
    let tenureAvg = 0;
    let coverageAvg = 0;
    for (const p of deptPeople) {
      const c = computedById.get(p.id);
      if (!c) continue;
      interactionAvg += c.interactionPct;
      workflowAvg += c.workflowPct;
      tenureAvg += c.tenureRisk;
      coverageAvg += c.coverageRisk;
    }
    const denom = headcount || 1;
    interactionAvg /= denom;
    workflowAvg /= denom;
    tenureAvg /= denom;
    coverageAvg /= denom;

    const drivers = [
      { key: "Interaction concentration", val: interactionAvg },
      { key: "Approval dependency concentration", val: workflowAvg },
      { key: "Institutional knowledge (tenure)", val: tenureAvg },
      { key: "Single-coverage roles", val: coverageAvg },
    ]
      .sort((a, b) => b.val - a.val)
      .slice(0, 2)
      .map((d) => d.key);

    const topRisks = [...deptPeople]
      .sort((a, b) => b.cri - a.cri)
      .slice(0, 5)
      .map((p) => ({ employeeId: p.id, name: p.name, cri: p.cri, tags: p.tags }));

    return {
      id: d.id,
      code: d.code,
      name: d.name,
      headcount,
      criAvg: round1(avg),
      criP90: round1(p90),
      topDrivers: drivers,
      topRisks,
    };
  });

  return { departments: deptMetrics, kpis };
}

