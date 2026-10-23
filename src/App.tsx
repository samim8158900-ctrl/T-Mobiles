/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  QrCode,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Truck,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { PurchaseModule } from './components/PurchaseModule';
import { InventoryModule } from './components/InventoryModule';
import { SalesModule } from './components/SalesModule';
import { BillingModule } from './components/BillingModule';
import { QrGeneratorModule } from './components/QrGeneratorModule';
import {
  CustomersModule,
  ExpensesModule,
  PaymentsModule,
  SuppliersModule,
} from './components/DirectoryAndFinanceModules';
import {
  ActivityLogsModule,
  ReportsModule,
  RolesModule,
  SettingsModule,
  UsersModule,
} from './components/ReportsAndAdminModules';
import {
  InventoryDeviceRecord,
  UserProfile,
  WorkspaceData,
} from './types';
import { ModuleKey } from './utils/accounting';

interface NavItem {
  id: ModuleKey;
  label: string;
  icon: React.FC<{ className?: string }>;
  group: 'Operations' | 'Directories & Finance' | 'Reports & Admin';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Operations',
  },
  {
    id: 'purchase',
    label: 'Mobile Purchases',
    icon: PackagePlus,
    group: 'Operations',
  },
  {
    id: 'inventory',
    label: 'IMEI Inventory',
    icon: Boxes,
    group: 'Operations',
  },
  {
    id: 'sales',
    label: 'Sales & POS',
    icon: ShoppingCart,
    group: 'Operations',
  },
  {
    id: 'billing',
    label: 'Invoices & Bills',
    icon: FileText,
    group: 'Operations',
  },
  {
    id: 'qr',
    label: 'QR Code Labels',
    icon: QrCode,
    group: 'Operations',
  },
  {
    id: 'suppliers',
    label: 'Suppliers & Agents',
    icon: Truck,
    group: 'Directories & Finance',
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    group: 'Directories & Finance',
  },
  {
    id: 'payments',
    label: 'Payments & Dues',
    icon: CreditCard,
    group: 'Directories & Finance',
  },
  {
    id: 'expenses',
    label: 'Operating Expenses',
    icon: Wallet,
    group: 'Directories & Finance',
  },
  {
    id: 'reports',
    label: 'Profit, Loss & Reports',
    icon: BarChart3,
    group: 'Reports & Admin',
  },
  {
    id: 'users',
    label: 'Employee Accounts',
    icon: UserCheck,
    group: 'Reports & Admin',
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    icon: Shield,
    group: 'Reports & Admin',
  },
  {
    id: 'logs',
    label: 'Audit & Activity Logs',
    icon: Activity,
    group: 'Reports & Admin',
  },
  {
    id: 'settings',
    label: 'Store Settings',
    icon: Settings,
    group: 'Reports & Admin',
  },
];

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'login' | 'workspace'>(
    'landing'
  );
  const [loginPortalType, setLoginPortalType] = useState<'admin' | 'staff'>(
    'admin'
  );
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('tmobiles_token') || '';
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [publicSummary, setPublicSummary] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Deep-link states for Invoice Printing and QR Label Generation
  const [billingDocType, setBillingDocType] = useState<'sale' | 'purchase'>(
    'sale'
  );
  const [billingDocId, setBillingDocId] = useState<number | null>(null);
  const [qrTargetDevice, setQrTargetDevice] =
    useState<InventoryDeviceRecord | null>(null);

  const fetchPublicSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/public/summary');
      if (res.ok) {
        const json = await res.json();
        setPublicSummary(json);
      }
    } catch {
      // Ignore transient network errors on initial boot
    }
  }, []);

  const fetchWorkspace = useCallback(
    async (authToken: string) => {
      if (!authToken) return;
      setLoadingWorkspace(true);
      setWorkspaceError(null);
      try {
        const res = await fetch('/api/workspace', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('tmobiles_token');
            setToken('');
            setCurrentUser(null);
            setWorkspaceData(null);
            setViewMode('login');
          }
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to load workspace data');
        }
        const data: WorkspaceData = await res.json();
        setWorkspaceData(data);
        setCurrentUser(data.currentUser);
        setViewMode('workspace');
      } catch (err: any) {
        setWorkspaceError(err.message || 'Unable to load workspace');
      } finally {
        setLoadingWorkspace(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPublicSummary();
    const params = new URLSearchParams(window.location.search);
    const savedToken = localStorage.getItem('tmobiles_token');
    if (savedToken) {
      fetchWorkspace(savedToken);
    } else if (params.get('login') === 'admin') {
      setLoginPortalType('admin');
      setViewMode('login');
    } else if (params.get('login') === 'staff') {
      setLoginPortalType('staff');
      setViewMode('login');
    }
  }, [fetchPublicSummary, fetchWorkspace]);

  const handleLoginSuccess = async (newToken: string, user: UserProfile) => {
    localStorage.setItem('tmobiles_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
    // Pick the first module the user is permitted to access
    const firstAllowed =
      (user.permissions.includes('dashboard')
        ? 'dashboard'
        : (user.permissions[0] as ModuleKey)) || 'dashboard';
    setActiveModule(firstAllowed);
    await fetchWorkspace(newToken);
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout network error
    } finally {
      localStorage.removeItem('tmobiles_token');
      setToken('');
      setCurrentUser(null);
      setWorkspaceData(null);
      setViewMode('landing');
      fetchPublicSummary();
    }
  };

  const permittedNavItems = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.roleName === 'Super Admin') return NAV_ITEMS;
    return NAV_ITEMS.filter((item) =>
      currentUser.permissions.includes(item.id)
    );
  }, [currentUser]);

  const handleNavigate = (mod: ModuleKey) => {
    setActiveModule(mod);
    setMobileMenuOpen(false);
  };

  const handleOpenInvoicePrint = (type: 'sale' | 'purchase', id: number) => {
    setBillingDocType(type);
    setBillingDocId(id);
    setActiveModule('billing');
    setMobileMenuOpen(false);
  };

  const handleOpenQrForDevice = (device: InventoryDeviceRecord) => {
    setQrTargetDevice(device);
    setActiveModule('qr');
    setMobileMenuOpen(false);
  };

  // Render Public Landing Page
  if (viewMode === 'landing') {
    return (
      <LandingPage
        settings={publicSummary?.settings}
        stats={
          publicSummary?.stats || {
            inStockCount: 6,
            totalCatalogTracked: 8,
            customerCount: 4,
            supplierCount: 3,
          }
        }
        featuredStock={publicSummary?.featuredStock || []}
        onOpenLogin={(portal) => {
          setLoginPortalType(portal);
          setViewMode('login');
        }}
      />
    );
  }

  // Render Admin / Staff Login Page
  if (viewMode === 'login' || !workspaceData || !currentUser) {
    return (
      <LoginScreen
        initialPortalType={loginPortalType}
        storeName={publicSummary?.settings?.storeName || 'T Mobiles'}
        onLoginSuccess={handleLoginSuccess}
        onBackToHome={() => setViewMode('landing')}
      />
    );
  }

  const storeName = workspaceData.settings?.storeName || 'T Mobiles';
  const isPermittedCurrentModule =
    currentUser.roleName === 'Super Admin' ||
    currentUser.permissions.includes(activeModule);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row">
      {/* Dark Navy Sidebar (#0A1628) */}
      <aside
        className={`w-64 bg-[#0A1628] text-white flex-col border-r border-slate-800 shrink-0 no-print ${
          mobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 flex'
            : 'hidden lg:flex lg:static'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <BrandLogo theme="dark" size="sm" storeName={storeName} />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Role Badge */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#0F213C]/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              {currentUser.roleName}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {currentUser.portalType.toUpperCase()}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
            {currentUser.fullName} (@{currentUser.username})
          </div>
        </div>

        {/* Navigation Links Grouped */}
        <nav
          aria-label="Workspace Modules"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
        >
          {(
            ['Operations', 'Directories & Finance', 'Reports & Admin'] as const
          ).map((groupName) => {
            const itemsInGroup = permittedNavItems.filter(
              (i) => i.group === groupName
            );
            if (itemsInGroup.length === 0) return null;
            return (
              <div key={groupName} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {groupName}
                </div>
                {itemsInGroup.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-[#0066FF] text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Public Storefront</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden no-print"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {NAV_ITEMS.find((n) => n.id === activeModule)?.label ||
                  'Workspace'}
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {storeName} · {workspaceData.settings?.cityStatePin} · GSTIN:{' '}
                <span className="font-mono">
                  {workspaceData.settings?.gstin || 'N/A'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentUser.permissions.includes('purchase') && (
              <button
                type="button"
                onClick={() => handleNavigate('purchase')}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50/50 text-slate-800 text-xs font-bold transition-colors"
              >
                <PackagePlus className="w-3.5 h-3.5 text-[#0066FF]" />
                <span>+ New Purchase</span>
              </button>
            )}
            {currentUser.permissions.includes('sales') && (
              <button
                type="button"
                onClick={() => handleNavigate('sales')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Create Sales Bill</span>
              </button>
            )}
          </div>
        </header>

        {/* Main View Container */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {workspaceError && (
            <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between">
              <span>{workspaceError}</span>
              <button
                type="button"
                onClick={() => fetchWorkspace(token)}
                className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {loadingWorkspace && !workspaceData ? (
            <div className="py-16 text-center text-sm font-semibold text-slate-500">
              Loading {storeName} records...
            </div>
          ) : !isPermittedCurrentModule ? (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-lg mx-auto my-8 space-y-3">
              <Shield className="w-10 h-10 text-red-500 mx-auto" />
              <h2 className="text-lg font-extrabold text-slate-900">
                Unauthorized Module Access
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your current role (<strong>{currentUser.roleName}</strong>) does
                not have permission to access this module. Contact the Super
                Admin to request module privileges.
              </p>
              <button
                type="button"
                onClick={() =>
                  handleNavigate(
                    (permittedNavItems[0]?.id as ModuleKey) || 'dashboard'
                  )
                }
                className="px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold"
              >
                Return to Permitted Workspace
              </button>
            </div>
          ) : (
            <>
              {activeModule === 'dashboard' && (
                <DashboardView
                  data={workspaceData}
                  onNavigate={handleNavigate}
                  onOpenInvoicePrint={handleOpenInvoicePrint}
                />
              )}
              {activeModule === 'purchase' && (
                <PurchaseModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                  onOpenInvoicePrint={handleOpenInvoicePrint}
                />
              )}
              {activeModule === 'inventory' && (
                <InventoryModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                  onOpenQrForDevice={handleOpenQrForDevice}
                />
              )}
              {activeModule === 'sales' && (
                <SalesModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                  onOpenInvoicePrint={handleOpenInvoicePrint}
                />
              )}
              {activeModule === 'billing' && (
                <BillingModule
                  data={workspaceData}
                  token={token}
                  initialDocType={billingDocType}
                  initialDocId={billingDocId}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'qr' && (
                <QrGeneratorModule
                  data={workspaceData}
                  initialDevice={qrTargetDevice}
                />
              )}
              {activeModule === 'suppliers' && (
                <SuppliersModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'customers' && (
                <CustomersModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'payments' && (
                <PaymentsModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'expenses' && (
                <ExpensesModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'reports' && (
                <ReportsModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'users' && (
                <UsersModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'roles' && (
                <RolesModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
              {activeModule === 'logs' && (
                <ActivityLogsModule data={workspaceData} />
              )}
              {activeModule === 'settings' && (
                <SettingsModule
                  data={workspaceData}
                  token={token}
                  onRefresh={() => fetchWorkspace(token)}
                />
              )}
            </>
          )}
        </main>

        {/* Application Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 no-print">
          <div className="font-semibold text-slate-700">
            {storeName} — Buy · Sell · Manage | IMEI Inventory &amp; POS Billing
            System
          </div>
          <div>
            Support: {workspaceData.settings?.phone} ·{' '}
            {workspaceData.settings?.email}
          </div>
        </footer>
      </div>
    </div>
  );
}
