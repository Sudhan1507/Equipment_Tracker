import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EquipmentPage from "./pages/EquipmentPage";
import RequestsPage from "./pages/RequestsPage";
import ReturnsPage from "./pages/ReturnsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route element={<ProtectedRoute roles={["TECHNICIAN"]} />}>
            <Route path="/my-requests" element={<RequestsPage mode="mine" />} />
          </Route>
          <Route element={<ProtectedRoute roles={["SUPERVISOR"]} />}>
            <Route path="/requests" element={<RequestsPage mode="all" />} />
            <Route path="/returns" element={<ReturnsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
