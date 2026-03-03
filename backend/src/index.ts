import express from "express";
import cors from "cors";

import orgRoutes from "./routes/orgRoutes";
import metricsRoutes from "./routes/metricsRoutes";
import simulationRoutes from "./routes/simulationRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/org", orgRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/simulate", simulationRoutes);
app.use("/api/integrations", integrationRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`ContinuityIQ backend listening on http://localhost:${port}`);
});

