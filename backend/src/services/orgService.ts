import { prisma } from "../config/db";

export async function getOrgStructure() {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });

  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: [{ departmentId: "asc" }, { lastName: "asc" }],
  });

  return {
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
    })),
    employees: employees.map((e) => ({
      id: e.id,
      externalId: e.externalId,
      firstName: e.firstName,
      lastName: e.lastName,
      title: e.title,
      level: e.level,
      tenureMonths: e.tenureMonths,
      managerId: e.managerId,
      department: {
        id: e.department.id,
        name: e.department.name,
        code: e.department.code,
      },
    })),
  };
}

