# ContinuityIQ (Local MVP Demo)

ContinuityIQ is a demo enterprise SaaS app that builds a **3-layer organizational digital twin** using **metadata only**:

- **Structural layer**: org chart (manager/report), role, tenure
- **Interaction layer**: collaboration **metadata** (meeting co-attendance frequency)
- **Dependency layer**: decision dependencies (approval chains / escalations)

It computes and displays:

- **Continuity Risk Index (CRI)** per person + department (0–100)
- **Single points of failure (SPOF)** in approval dependencies
- **Bridge roles / connectors** in collaboration networks
- **Simulation**: “what happens if X leaves / restructure”

> **Hard requirement honored**: the app **does not use message content**. It only uses co-attendance metadata and workflow step metadata.

---

## Super simple: run the demo (Windows)

### 0) Install prerequisites (one time)

- Install **Node.js LTS** (so `node` and `npm` work)

To check if you already have it:

1. Open **PowerShell**
2. Type this and press Enter:

```bash
node -v
```

If you see a version number, you’re good.

---

## 1) Start the backend (the “data server”)

1. Open **PowerShell**
2. Copy/paste this and press Enter:

```bash
cd "C:\Users\andre\Documents\UCLA\Winter 2026\Tech MGMT\Group 4 Demo\KramerMVP\backend"
```

3. Install backend packages:

```bash
npm install
```

4. Create the database tables:

```bash
npx prisma migrate dev
```

5. Fill the database with demo data:

```bash
npx prisma db seed
```

6. Start the backend:

```bash
npm run dev
```

Backend should print something like:

- `ContinuityIQ backend listening on http://localhost:4000`

Quick check (optional):

- Open `http://localhost:4000/health` in your browser → you should see `{"status":"ok"}`

Leave this backend window open.

---

## 2) Start the frontend (the “website UI”)

1. Open **a second PowerShell window** (keep backend running in the first one)
2. Copy/paste this and press Enter:

```bash
cd "C:\Users\andre\Documents\UCLA\Winter 2026\Tech MGMT\Group 4 Demo\KramerMVP\frontend"
```

3. Install frontend packages:

```bash
npm install
```

4. Start the frontend:

```bash
npm run dev
```

It will print a “Local:” URL, usually one of these:

- `http://localhost:5173/` (or 5174/5175 if ports are busy)

Open that URL in your browser.

---

## 3) Demo flow (what to click)

### Dashboard

- Land on **Dashboard**
- Click a high-risk employee in the table
- Use the right-side **Risk explainer** panel to see CRI breakdown:
  - Interaction layer
  - Dependency layer
  - Tenure knowledge risk
  - Coverage / redundancy

### Org Twin

- Go to **Org Twin**
- Toggle layers:
  - **Structural** (org chart)
  - **Interaction** (co-attendance network)
  - **Dependency** (approval dependency network)
- Click a node to open the **Person details** side panel

### Simulation

- Go to **Simulation**
- Attrition:
  - Select **Riley Nguyen** (Principal Architect) or **Ana Silva** (Controller) or **Jordan Wells** (Head of Ops)
  - Click **Run attrition**
  - Observe department CRI deltas + explanation bullets
- Restructure:
  - Move a high-risk person to a different department
  - Click **Run restructure**

### Integrations (Mock)

- Go to **Integrations**
- Click:
  - **Import demo HRIS**
  - **Import demo collaboration metadata**
- This re-seeds the database back to a known state.

---

## CRI formula (transparent)

Continuity Risk Index is computed as a 0–100 score:

\[
\text{CRI} = 100 \times (0.35 \cdot \text{InteractionPct} + 0.35 \cdot \text{WorkflowPct} + 0.15 \cdot \text{TenureRisk} + 0.15 \cdot \text{CoverageRisk})
\]

- **InteractionPct**: percentile from degree + betweenness in co-attendance graph
- **WorkflowPct**: percentile from how often someone appears in approval chains + dependency criticality (SPOF heuristic)
- **TenureRisk**: higher tenure ⇒ higher knowledge concentration risk
- **CoverageRisk**: 100 when the role is single-coverage within a department (no redundancy)

---

## Repo structure

- `backend/`
  - Express REST API (`/api/...`)
  - Prisma + SQLite (`backend/dev.db`)
  - Seed data generator: `backend/prisma/seed.ts`
- `frontend/`
  - React + Vite UI
  - Graph visualizer uses `react-force-graph`

---

## API endpoints (minimum set)

- `GET /api/org/structure`
- `GET /api/org/interaction-graph`
- `GET /api/org/dependency-graph`
- `GET /api/metrics/people`
- `GET /api/metrics/departments`
- `POST /api/simulate/attrition` body: `{ "employee_ids": number[] }`
- `POST /api/simulate/restructure` body: `{ "moves": [{ "employee_id": number, "new_department_id"?: number, "new_manager_id"?: number|null }] }`

---

## Stop the demo

In each PowerShell window (backend + frontend), press:

- `Ctrl + C`

