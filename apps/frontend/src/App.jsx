import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CampaignDetailPage from "./pages/CampaignDetailPage.jsx";
import CampaignsPage from "./pages/CampaignsPage.jsx";
import GridPage from "./pages/GridPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import WikiPage from "./pages/WikiPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/mapa" element={<GridPage />} />
        <Route path="/wiki/*" element={<WikiPage />} />
        <Route path="/campanhas" element={<CampaignsPage />} />
        <Route path="/campanhas/:id" element={<CampaignDetailPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/config" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
