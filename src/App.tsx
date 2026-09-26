// ============================================================
// PlacementOS — App Entry Point
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ResumePage from './pages/ResumePage';
import JobsPage from './pages/JobsPage';
import SkillGapPage from './pages/SkillGapPage';
import AssessmentListPage from './pages/AssessmentListPage';
import AssessmentTakePage from './pages/AssessmentTakePage';
import SimulationPage from './pages/SimulationPage';
import WeaknessHunterPage from './pages/WeaknessHunterPage';
import WhatIfPage from './pages/WhatIfPage';
import PlanPage from './pages/PlanPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/weaknesses" element={<WeaknessHunterPage />} />
            <Route path="/what-if" element={<WhatIfPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/skill-gap" element={<SkillGapPage />} />
            <Route path="/assessment" element={<AssessmentListPage />} />
            <Route path="/assessment/:id" element={<AssessmentTakePage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
