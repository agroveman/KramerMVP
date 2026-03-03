export type Id = number;

export type GraphNode = {
  id: Id;
  label: string;
  departmentCode: string;
  title: string;
  level: string;
};

export type GraphEdge = {
  source: Id;
  target: Id;
  weight: number;
};

export type InteractionGraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type DependencyGraphEdge = {
  source: Id;
  target: Id;
  workflowCount: number;
  workflowTypes: string[];
};

export type DependencyGraphResponse = {
  nodes: GraphNode[];
  edges: DependencyGraphEdge[];
  workflows: Array<{
    id: Id;
    name: string;
    type: string;
    steps: Array<{
      order: number;
      approverId: Id;
      isEscalation: boolean;
    }>;
  }>;
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
  interaction: {
    degree: number;
    betweenness: number;
  };
  workflow: {
    approvalStepCount: number;
    workflowAppearances: number;
    isSPOF: boolean;
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

export type DashboardKpis = {
  orgCriAvg: number;
  highestRiskDepartment: { code: string; name: string; criAvg: number } | null;
  singlePointsOfFailure: number;
  bridgeRoles: number;
};

export type PeopleMetricsResponse = {
  kpis: DashboardKpis;
  people: PersonMetric[];
};

export type DepartmentsMetricsResponse = {
  departments: DepartmentMetric[];
};

export type AttritionRequest = {
  employee_ids: Id[];
};

export type RestructureMove = {
  employee_id: Id;
  new_manager_id?: Id | null;
  new_department_id?: Id;
};

export type RestructureRequest = {
  moves: RestructureMove[];
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
  before: {
    kpis: DashboardKpis;
    departments: DepartmentMetric[];
  };
  after: {
    kpis: DashboardKpis;
    departments: DepartmentMetric[];
  };
  deltas: {
    orgCriAvg: number;
    departments: Array<{ code: string; name: string; criAvgDelta: number }>;
  };
  explanations: string[];
  suggestedSuccessors?: SuggestedSuccessor[];
};

