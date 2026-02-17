import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import type { User } from '@/types';

// Pages - these will be created by Agent 8
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import StoresPage from '@/pages/StoresPage';
import StoreDetailPage from '@/pages/StoreDetailPage';
import CartPage from '@/pages/CartPage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductManagementPage from '@/pages/ProductManagementPage';
import OrderManagementPage from '@/pages/OrderManagementPage';
import FavoritesPage from '@/pages/FavoritesPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminStoresPage from '@/pages/admin/AdminStoresPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';

// Layout - created by Agent 9
import Layout from '@/components/layout/Layout';

// ProtectedRoute component - checks auth state and optionally role
function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: User['role'];
}) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Layout wraps all routes and uses <Outlet /> internally */}
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/stores/:id" element={<StoreDetailPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Protected customer routes */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />

        {/* Protected store owner routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="STORE_OWNER">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/products"
          element={
            <ProtectedRoute requiredRole="STORE_OWNER">
              <ProductManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/orders"
          element={
            <ProtectedRoute requiredRole="STORE_OWNER">
              <OrderManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/integrations"
          element={
            <ProtectedRoute requiredRole="STORE_OWNER">
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />

        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stores"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminStoresPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminCategoriesPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
