import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SenderLayout from './components/layout/SenderLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewDeliveryPage from './pages/NewDeliveryPage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import ContactsPage from './pages/ContactsPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import RecipientDownloadPage from './pages/recipient/RecipientDownloadPage';
import RecipientRegisterPage from './pages/recipient/RecipientRegisterPage';
import RecipientExpiredPage from './pages/recipient/RecipientExpiredPage';
import RecipientNotFoundPage from './pages/recipient/RecipientNotFoundPage';
import RecipientFileDownloadPage from './pages/recipient/RecipientFileDownloadPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-surface-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50">
        <div className="h-10 w-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route path="/d/:token" element={<RecipientDownloadPage />} />
      <Route path="/d/:token/f/:fileToken" element={<RecipientFileDownloadPage />} />
      <Route path="/d/:token/register" element={<RecipientRegisterPage />} />
      <Route path="/d/:token/expired" element={<RecipientExpiredPage />} />
      <Route path="/d/invalid" element={<RecipientNotFoundPage />} />

      <Route element={<ProtectedRoute><SenderLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/delivery/new" element={<NewDeliveryPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryDetailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
