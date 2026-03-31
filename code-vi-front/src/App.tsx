import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import VisualizationPage from './pages/VisualizationPage/VisualizationPage';

/** 인증 가드 — JWT 토큰이 없으면 /login으로 리디렉트 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  // UI 디자인 테스트를 위해 임시로 인증 체크 비계
  // const token = localStorage.getItem('accessToken');
  // if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/visualization/:snapshotId"
          element={
            <PrivateRoute>
              <VisualizationPage />
            </PrivateRoute>
          }
        />
        {/* 기본 진입점 → 대시보드 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
