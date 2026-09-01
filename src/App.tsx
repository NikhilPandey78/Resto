import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';

import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { OtpPage } from '@/pages/auth/OtpPage';
import { SsoCallbackPage } from '@/pages/auth/SsoCallbackPage';

import { DashboardPage } from '@/pages/DashboardPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';
import { ItemDetailPage } from '@/pages/inventory/ItemDetailPage';
import { StockInPage } from '@/pages/StockInPage';
import { StockOutPage } from '@/pages/StockOutPage';
import { StockTransferPage } from '@/pages/StockTransferPage';
import { StockAdjustmentPage } from '@/pages/StockAdjustmentPage';
import { StockCountPage } from '@/pages/StockCountPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { UnitsPage } from '@/pages/UnitsPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { PurchaseReturnsPage } from '@/pages/PurchaseReturnsPage';
import { KitchenRequisitionsPage } from '@/pages/KitchenRequisitionsPage';
import { RecipesPage } from '@/pages/RecipesPage';
import { MenuItemsPage } from '@/pages/MenuItemsPage';
import { ConsumptionPage } from '@/pages/ConsumptionPage';
import { WastagePage } from '@/pages/WastagePage';
import { ExpiryPage } from '@/pages/ExpiryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { BranchesPage } from '@/pages/BranchesPage';
import { UsersPage } from '@/pages/UsersPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ActivityLogPage } from '@/pages/ActivityLogPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { HelpPage } from '@/pages/HelpPage';
import { FoodCostPage } from '@/pages/FoodCostPage';
import { FeaturePendingPage } from '@/pages/FeaturePendingPage';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 animate-pulse" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/sso/callback" element={<SsoCallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/:id" element={<ItemDetailPage />} />
          <Route path="/stock-in" element={<StockInPage />} />
          <Route path="/stock-out" element={<StockOutPage />} />
          <Route path="/stock-transfer" element={<StockTransferPage />} />
          <Route path="/stock-adjustment" element={<StockAdjustmentPage />} />
          <Route path="/stock-count" element={<StockCountPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/purchase-returns" element={<PurchaseReturnsPage />} />
          <Route path="/kitchen-requisitions" element={<KitchenRequisitionsPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/menu-items" element={<MenuItemsPage />} />
          <Route path="/consumption" element={<ConsumptionPage />} />
          <Route path="/food-cost" element={<FoodCostPage />} />
          <Route path="/ai-insights" element={<FeaturePendingPage title="BhojMitra Intelligence" description="Data-backed restaurant insights" />} />
          <Route path="/sales" element={<FeaturePendingPage title="Sales / POS" description="Sales and point-of-sale management" />} />
          <Route path="/kot" element={<FeaturePendingPage title="Kitchen Order Tickets" description="Kitchen order management" />} />
          <Route path="/tables" element={<FeaturePendingPage title="Tables" description="Restaurant table management" />} />
          <Route path="/wastage" element={<WastagePage />} />
          <Route path="/expiry" element={<ExpiryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/activity-log" element={<ActivityLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
