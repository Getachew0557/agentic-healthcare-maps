import { Navigate, Route, Routes } from "react-router-dom";
import { PatientHomePage } from "../pages/patient/PatientHomePage";
import { AdminLoginPage } from "../pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/patient" replace />} />
      <Route path="/patient" element={<PatientHomePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="*" element={<div className="p-6">Not found</div>} />
    </Routes>
  );
}

