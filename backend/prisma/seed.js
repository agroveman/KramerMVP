"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const db_1 = require("../src/config/db");
async function main() {
    console.log("Seeding demo data for ContinuityIQ...");
    await db_1.prisma.meetingAttendee.deleteMany();
    await db_1.prisma.meeting.deleteMany();
    await db_1.prisma.workflowStep.deleteMany();
    await db_1.prisma.workflow.deleteMany();
    await db_1.prisma.employee.deleteMany();
    await db_1.prisma.department.deleteMany();
    const departments = await db_1.prisma.department.createManyAndReturn({
        data: [
            { name: "Engineering", code: "ENG", description: "Product engineering" },
            { name: "Product", code: "PRD", description: "Product management" },
            { name: "Sales", code: "SAL", description: "New business sales" },
            { name: "Customer Success", code: "CS", description: "Account management and support" },
            { name: "Operations", code: "OPS", description: "Internal operations" },
            { name: "Finance", code: "FIN", description: "Finance and FP&A" },
        ],
    });
    const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));
    const employeesSeed = [];
    function addEmployee(input) {
        employeesSeed.push(input);
    }
    // C-level and execs
    addEmployee({
        externalId: "E001",
        firstName: "Alex",
        lastName: "Kramer",
        title: "CEO",
        level: "L8",
        tenureMonths: 60,
        departmentCode: "OPS",
    });
    addEmployee({
        externalId: "E002",
        firstName: "Jamie",
        lastName: "Chen",
        title: "VP Engineering",
        level: "L7",
        tenureMonths: 48,
        departmentCode: "ENG",
        managerExternalId: "E001",
    });
    addEmployee({
        externalId: "E003",
        firstName: "Priya",
        lastName: "Nair",
        title: "VP Product",
        level: "L7",
        tenureMonths: 42,
        departmentCode: "PRD",
        managerExternalId: "E001",
    });
    addEmployee({
        externalId: "E004",
        firstName: "Marcus",
        lastName: "Reed",
        title: "VP Sales",
        level: "L7",
        tenureMonths: 36,
        departmentCode: "SAL",
        managerExternalId: "E001",
    });
    addEmployee({
        externalId: "E005",
        firstName: "Sara",
        lastName: "Lopez",
        title: "VP Customer Success",
        level: "L7",
        tenureMonths: 30,
        departmentCode: "CS",
        managerExternalId: "E001",
    });
    addEmployee({
        externalId: "E006",
        firstName: "Daniel",
        lastName: "Park",
        title: "VP Finance",
        level: "L7",
        tenureMonths: 40,
        departmentCode: "FIN",
        managerExternalId: "E001",
    });
    // Bridge roles across departments
    addEmployee({
        externalId: "E010",
        firstName: "Riley",
        lastName: "Nguyen",
        title: "Principal Architect",
        level: "L6",
        tenureMonths: 28,
        departmentCode: "ENG",
        managerExternalId: "E002",
    });
    addEmployee({
        externalId: "E011",
        firstName: "Taylor",
        lastName: "Morgan",
        title: "Lead Program Manager",
        level: "L6",
        tenureMonths: 24,
        departmentCode: "OPS",
        managerExternalId: "E001",
    });
    // Helper to generate a team under a manager
    function addTeam(manager, count, prefix, level, departmentCode) {
        for (let i = 0; i < count; i++) {
            const id = `${prefix}${i + 1}`.padStart(3, "0");
            addEmployee({
                externalId: id,
                firstName: `${departmentCode}Person${i + 1}`,
                lastName: "Demo",
                title: level === "L4" ? "Senior IC" : "IC",
                level,
                tenureMonths: 6 + i * 3,
                departmentCode,
                managerExternalId: manager.externalId,
            });
        }
    }
    // Engineering teams
    const engMgr1 = {
        externalId: "E020",
        firstName: "Nina",
        lastName: "Singh",
        title: "Engineering Manager",
        level: "L5",
        tenureMonths: 18,
        departmentCode: "ENG",
        managerExternalId: "E002",
    };
    addEmployee(engMgr1);
    addTeam(engMgr1, 10, "E1", "L4", "ENG");
    const engMgr2 = {
        externalId: "E021",
        firstName: "Omar",
        lastName: "Hassan",
        title: "Engineering Manager",
        level: "L5",
        tenureMonths: 10,
        departmentCode: "ENG",
        managerExternalId: "E002",
    };
    addEmployee(engMgr2);
    addTeam(engMgr2, 8, "E2", "L3", "ENG");
    // Product team
    const prodMgr = {
        externalId: "P020",
        firstName: "Lena",
        lastName: "Hughes",
        title: "Director of Product",
        level: "L6",
        tenureMonths: 20,
        departmentCode: "PRD",
        managerExternalId: "E003",
    };
    addEmployee(prodMgr);
    addTeam(prodMgr, 6, "P1", "L4", "PRD");
    // Sales team
    const salesMgr = {
        externalId: "S020",
        firstName: "Ethan",
        lastName: "Brooks",
        title: "Sales Director",
        level: "L6",
        tenureMonths: 16,
        departmentCode: "SAL",
        managerExternalId: "E004",
    };
    addEmployee(salesMgr);
    addTeam(salesMgr, 10, "S1", "L3", "SAL");
    // CS team
    const csMgr = {
        externalId: "C020",
        firstName: "Maya",
        lastName: "Patel",
        title: "Customer Success Director",
        level: "L6",
        tenureMonths: 22,
        departmentCode: "CS",
        managerExternalId: "E005",
    };
    addEmployee(csMgr);
    addTeam(csMgr, 10, "C1", "L3", "CS");
    // Ops & Finance ICs
    const opsMgr = {
        externalId: "O020",
        firstName: "Jordan",
        lastName: "Wells",
        title: "Head of Operations",
        level: "L6",
        tenureMonths: 26,
        departmentCode: "OPS",
        managerExternalId: "E001",
    };
    addEmployee(opsMgr);
    addTeam(opsMgr, 4, "O1", "L4", "OPS");
    const finMgr = {
        externalId: "F020",
        firstName: "Ana",
        lastName: "Silva",
        title: "Controller",
        level: "L6",
        tenureMonths: 32,
        departmentCode: "FIN",
        managerExternalId: "E006",
    };
    addEmployee(finMgr);
    addTeam(finMgr, 4, "F1", "L4", "FIN");
    // Create employees without manager links first
    const createdEmployees = await db_1.prisma.employee.createManyAndReturn({
        data: employeesSeed.map((e) => {
            const dept = deptByCode[e.departmentCode];
            if (!dept) {
                throw new Error(`Unknown departmentCode in seed: ${e.departmentCode}`);
            }
            return {
                externalId: e.externalId,
                firstName: e.firstName,
                lastName: e.lastName,
                title: e.title,
                level: e.level,
                tenureMonths: e.tenureMonths,
                departmentId: dept.id,
                managerId: null,
            };
        }),
    });
    const employeeByExternalId = new Map();
    createdEmployees.forEach((e) => {
        employeeByExternalId.set(e.externalId, e);
    });
    // Update manager relationships
    for (const seed of employeesSeed) {
        if (!seed.managerExternalId)
            continue;
        const emp = employeeByExternalId.get(seed.externalId);
        const mgr = employeeByExternalId.get(seed.managerExternalId);
        if (emp && mgr) {
            await db_1.prisma.employee.update({
                where: { id: emp.id },
                data: { managerId: mgr.id },
            });
        }
    }
    // Create repeating cross-functional meetings to create bridges and connectors.
    const riley = employeeByExternalId.get("E010");
    const taylor = employeeByExternalId.get("E011");
    const vpEng = employeeByExternalId.get("E002");
    const vpProd = employeeByExternalId.get("E003");
    const vpSales = employeeByExternalId.get("E004");
    const vpCS = employeeByExternalId.get("E005");
    const vpFin = employeeByExternalId.get("E006");
    if (!riley || !taylor || !vpEng || !vpProd || !vpSales || !vpCS || !vpFin) {
        throw new Error("Missing key bridge roles in seed data");
    }
    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d;
    }
    // Weekly product council (Riley as key architect bridge).
    for (let i = 0; i < 12; i++) {
        const meeting = await db_1.prisma.meeting.create({
            data: {
                topic: "Product Council",
                startedAt: daysAgo(7 * i),
                durationMin: 60,
            },
        });
        const attendees = [vpEng, vpProd, vpCS, riley];
        for (const emp of attendees) {
            await db_1.prisma.meetingAttendee.create({
                data: {
                    meetingId: meeting.id,
                    employeeId: emp.id,
                },
            });
        }
    }
    // Monthly go-to-market sync (Taylor as cross-department program manager).
    for (let i = 0; i < 6; i++) {
        const meeting = await db_1.prisma.meeting.create({
            data: {
                topic: "Go-to-Market Sync",
                startedAt: daysAgo(30 * i),
                durationMin: 45,
            },
        });
        const attendees = [vpSales, vpCS, vpProd, taylor];
        for (const emp of attendees) {
            await db_1.prisma.meetingAttendee.create({
                data: {
                    meetingId: meeting.id,
                    employeeId: emp.id,
                },
            });
        }
    }
    // Architecture reviews where Riley is the main cross-team bridge (VPs mostly absent).
    const engMgr1Emp = employeeByExternalId.get("E020");
    const engMgr2Emp = employeeByExternalId.get("E021");
    const prodDir = employeeByExternalId.get("P020");
    const opsHead = employeeByExternalId.get("O020");
    if (!engMgr1Emp || !engMgr2Emp || !prodDir || !opsHead) {
        throw new Error("Missing leadership roles for seed meetings");
    }
    for (let i = 0; i < 10; i++) {
        const meeting = await db_1.prisma.meeting.create({
            data: {
                topic: "Architecture Review",
                startedAt: daysAgo(14 * i + 2),
                durationMin: 50,
            },
        });
        const attendees = [riley, engMgr1Emp, engMgr2Emp, prodDir, opsHead];
        for (const emp of attendees) {
            await db_1.prisma.meetingAttendee.create({
                data: { meetingId: meeting.id, employeeId: emp.id },
            });
        }
    }
    // Escalation triage where Taylor bridges revenue ops and delivery without message content.
    const salesDir = employeeByExternalId.get("S020");
    const csDir = employeeByExternalId.get("C020");
    if (!salesDir || !csDir) {
        throw new Error("Missing Sales/CS directors for seed meetings");
    }
    for (let i = 0; i < 12; i++) {
        const meeting = await db_1.prisma.meeting.create({
            data: {
                topic: "Escalation Triage",
                startedAt: daysAgo(7 * i + 1),
                durationMin: 25,
            },
        });
        const attendees = [taylor, salesDir, csDir, opsHead];
        for (const emp of attendees) {
            await db_1.prisma.meetingAttendee.create({
                data: { meetingId: meeting.id, employeeId: emp.id },
            });
        }
    }
    // Departmental standups and team meetings to create high-degree connectors (managers).
    async function createDeptStandups(managerExternalId, teamPrefix, label) {
        const manager = employeeByExternalId.get(managerExternalId);
        if (!manager)
            return;
        const teamMembers = createdEmployees.filter((e) => e.externalId.startsWith(teamPrefix));
        for (let w = 0; w < 8; w++) {
            const meeting = await db_1.prisma.meeting.create({
                data: {
                    topic: `${label} Weekly Standup`,
                    startedAt: daysAgo(7 * w),
                    durationMin: 30,
                },
            });
            for (const emp of [manager, ...teamMembers]) {
                await db_1.prisma.meetingAttendee.create({
                    data: {
                        meetingId: meeting.id,
                        employeeId: emp.id,
                    },
                });
            }
        }
    }
    await createDeptStandups("E020", "E1", "ENG Team 1");
    await createDeptStandups("E021", "E2", "ENG Team 2");
    await createDeptStandups("P020", "P1", "Product Team");
    await createDeptStandups("S020", "S1", "Sales Team");
    await createDeptStandups("C020", "C1", "CS Team");
    // Workflows with concentrated approvers to create SPOFs.
    const cfo = vpFin;
    const vpOps = employeeByExternalId.get("O020");
    const controller = employeeByExternalId.get(finMgr.externalId);
    if (!vpOps || !controller) {
        throw new Error("Missing Ops/Finance leaders in seed data");
    }
    async function createWorkflow(name, type, approverExternalIds) {
        const wf = await db_1.prisma.workflow.create({
            data: {
                name,
                type,
            },
        });
        for (let i = 0; i < approverExternalIds.length; i++) {
            const approverExternalId = approverExternalIds[i];
            if (!approverExternalId)
                continue;
            const approver = employeeByExternalId.get(approverExternalId);
            if (!approver)
                continue;
            await db_1.prisma.workflowStep.create({
                data: {
                    workflowId: wf.id,
                    approverId: approver.id,
                    order: i,
                    isEscalation: i > 1,
                },
            });
        }
    }
    // Budget approvals: many rely on Controller and CFO as SPOFs.
    for (let i = 0; i < 8; i++) {
        await createWorkflow(`Budget Request ${i + 1}`, client_1.WorkflowType.BUDGET, [
            "O020", // Ops head
            controller.externalId,
            cfo.externalId,
        ]);
    }
    // Vendor contracts: rely on Ops + Finance.
    for (let i = 0; i < 5; i++) {
        await createWorkflow(`Vendor Contract ${i + 1}`, client_1.WorkflowType.VENDOR_CONTRACT, [
            "O020",
            controller.externalId,
        ]);
    }
    // Production launches: rely heavily on Riley as SPOF architect.
    for (let i = 0; i < 5; i++) {
        await createWorkflow(`Production Launch ${i + 1}`, client_1.WorkflowType.PRODUCTION_LAUNCH, [
            "E020", // Eng mgr
            riley.externalId,
            vpEng.externalId,
        ]);
    }
    console.log("Seed complete.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await db_1.prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map