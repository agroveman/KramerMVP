import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/Layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { OrgTwinPage } from "./pages/OrgTwinPage";
import { SimulationPage } from "./pages/SimulationPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { TrendsPage } from "./pages/TrendsPage";

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/twin" element={<OrgTwinPage />} />
          <Route path="/simulate" element={<SimulationPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App
