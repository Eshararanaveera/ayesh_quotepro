import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';
import QuotationsPage from '../pages/dashboard/QuotationsPage';
import CreateQuotationPage from '../pages/dashboard/CreateQuotationPage';
import QuotationDetailPage from '../pages/dashboard/QuotationDetailPage';
import CustomersPage from '../pages/dashboard/CustomersPage';
import InvoicesPage from '../pages/dashboard/InvoicesPage';
import SettingsPage from '../pages/dashboard/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginPage from '../pages/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';

/** All app routes. /login is public; every other page needs a login and renders inside DashboardLayout. */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Everything else needs an admin login */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />

        <Route path="quotations">
          <Route index element={<QuotationsPage />} />
          <Route path="new" element={<CreateQuotationPage />} />
          <Route path=":id" element={<QuotationDetailPage />} />
          <Route path=":id/edit" element={<EditQuotationRoute />} />
        </Route>

        <Route path="customers" element={<CustomersPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** Keyed by id so the form resets when moving from one quotation's edit page to another. */
function EditQuotationRoute() {
  const { id } = useParams();
  return <CreateQuotationPage key={id} />;
}
