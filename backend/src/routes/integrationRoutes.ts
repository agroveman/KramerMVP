import { Router } from "express";
import { execSync } from "node:child_process";
import path from "node:path";

const router = Router();

router.get("/providers", async (_req, res) => {
  res.json({
    providers: [
      { id: "workday", name: "Workday", status: "mock" },
      { id: "adp", name: "ADP", status: "mock" },
      { id: "google_calendar", name: "Google Calendar", status: "mock" },
      { id: "slack", name: "Slack", status: "mock" },
    ],
  });
});

function runSeed() {
  const backendRoot = process.cwd();
  const seedPath = path.join(backendRoot, "prisma", "seed.ts");
  execSync(`npx ts-node "${seedPath}"`, { stdio: "inherit" });
}

router.post("/import/hris-demo", async (_req, res) => {
  runSeed();
  res.json({ ok: true, message: "Demo HRIS imported (seeded)." });
});

router.post("/import/collab-demo", async (_req, res) => {
  runSeed();
  res.json({ ok: true, message: "Demo collaboration metadata imported (seeded)." });
});

export default router;

