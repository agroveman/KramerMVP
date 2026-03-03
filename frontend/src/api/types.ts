export type Id = number;

export type DashboardKpis = {
  orgCriAvg: number;
  highestRiskDepartment: { code: string; name: string; criAvg: number } | null;
  singlePointsOfFailure: number;
  bridgeRoles: number;
};

export type PersonMetric = {
  id: Id;
  externalId: string;
  name: string;
  department: { id: Id; code: string; name: string };
  title: string;
  level: string;
  tenureMonths: number;
  managerId: Id | null;
  tags: string[];
  cri: number;
  criBreakdown: {
    interactionPct: number;
    workflowPct: number;
    tenureRisk: number;
    coverageRisk: number;
  };
  interaction: { degree: number; betweenness: number };
  workflow: { approvalStepCount: number; workflowAppearances: number; isSPOF: boolean };
};

export type PeopleMetricsResponse = {
  kpis: DashboardKpis;
  people: PersonMetric[];
  criFormula: {
    weights: { interaction: number; workflow: number; tenure: number; coverage: number };
    tenureRationale: string;
    metadataOnly: string;
  };
};

export type DepartmentMetric = {
  id: Id;
  code: string;
  name: string;
  headcount: number;
  criAvg: number;
  criP90: number;
  topDrivers: string[];
  topRisks: Array<{ employeeId: Id; name: string; cri: number; tags: string[] }>;
};

export type DepartmentsMetricsResponse = {
  kpis: DashboardKpis;
  departments: DepartmentMetric[];
};

export type OrgStructureResponse = {
  departments: Array<{ id: Id; name: string; code: string; description?: string | null }>;
  employees: Array<{
    id: Id;
    externalId: string;
    firstName: string;
    lastName: string;
    title: string;
    level: string;
    tenureMonths: number;
    managerId: Id | null;
    department: { id: Id; name: string; code: string };
  }>;
};

export type InteractionGraphResponse = {
  nodes: Array<{ id: Id; label: string; departmentCode: string; title: string; level: string }>;
  edges: Array<{ source: Id; target: Id; weight: number }>;
};

export type DependencyGraphResponse = {
  nodes: Array<{ id: Id; label: string; departmentCode: string; title: string; level: string }>;
  edges: Array<{ source: Id; target: Id; workflowCount: number; workflowTypes: string[] }>;
  workflows: Array<{
    id: Id;
    name: string;
    type: string;
    steps: Array<{ order: number; approverId: Id; isEscalation: boolean }>;
  }>;
};

export type SuggestedSuccessor = {
  id: Id;
  name: string;
  title: string;
  departmentCode: string;
  cri: number;
  rationale: string;
};

export type SimulationResponse = {
  before: { kpis: DashboardKpis; departments: DepartmentMetric[] };
  after: { kpis: DashboardKpis; departments: DepartmentMetric[] };
  deltas: { orgCriAvg: number; departments: Array<{ code: string; name: string; criAvgDelta: number }> };
  explanations: string[];
  suggestedSuccessors?: SuggestedSuccessor[];
};

