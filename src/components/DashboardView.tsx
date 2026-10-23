import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  FileText,
  PackagePlus,
  Plus,
  QrCode,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { WorkspaceData, formatCurrency } from '../types';
import { ModuleKey } from '../utils/accounting';

interface DashboardViewProps {
  data: WorkspaceData;
  onNavigate: (module: ModuleKey) => void;
  onOpenInvoicePrint: (type: 'sale' | 'purchase', id: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onOpenInvoicePrint,
}) => {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>('all');
  const currency = data.settings?.currencySymbol || '₹';
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);

  const inStockDevices = useMemo(
    () => data.devices.filter((d) => d.status === 'In Stock'),
    [data.devices]
  );

  const filteredPurchases = useMemo(() => {
    const confirmed = data.purchases.filter((p) => p.status === 'Confirmed');
    if (dateFilter === 'today') {
      return confirmed.filter((p) => p.purchaseDate === todayStr);
    }
    if (dateFilter === 'month') {
      return confirmed.filter((p) => p.purchaseDate.startsWith(currentMonthPrefix));
    }
    return confirmed;
  }, [data.purchases, dateFilter, todayStr, currentMonthPrefix]);

  const filteredSales = useMemo(() => {
    const completed = data.sales.filter((s) => s.status === 'Completed');
    if (dateFilter === 'today') {
      return completed.filter((s) => s.saleDate === todayStr);
    }
    if (dateFilter === 'month') {
      return completed.filter((s) => s.saleDate.startsWith(currentMonthPrefix));
    }
    return completed;
  }, [data.sales, dateFilter, todayStr, currentMonthPrefix]);

  const filteredExpenses = useMemo(() => {
    if (dateFilter === 'today') {
      return data.expenses.filter((e) => e.expenseDate === todayStr);
    }
    if (dateFilter === 'month') {
      return data.expenses.filter((e) => e.expenseDate.startsWith(currentMonthPrefix));
    }
    return data.expenses;
  }, [data.expenses, dateFilter, todayStr, currentMonthPrefix]);

  const todaySalesTotal = useMemo(
    () =>
      data.sales
        .filter((s) => s.status === 'Completed' && s.saleDate === todayStr)
        .reduce((sum, s) => sum + s.grandTotal, 0),
    [data.sales, todayStr]
  );

  const todayPurchasesTotal = useMemo(
    () =>
      data.purchases
        .filter((p) => p.status === 'Confirmed' && p.purchaseDate === todayStr)
        .reduce((sum, p) => sum + p.grandTotal, 0),
    [data.purchases, todayStr]
  );

  const totalPurchaseVal = useMemo(
    () => filteredPurchases.reduce((sum, p) => sum + p.grandTotal, 0),
    [filteredPurchases]
  );

  const totalSalesVal = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.grandTotal, 0),
    [filteredSales]
  );

  const estimatedGrossProfit = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.grossProfit, 0),
    [filteredSales]
  );

  const totalOperatingExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const netProfitVal = estimatedGrossProfit - totalOperatingExpenses;

  const outstandingCustomerDues = useMemo(
    () =>
      data.customers.reduce(
        (sum, c) => sum + Math.max(0, Number(c.outstandingBalance) || 0),
        0
      ),
    [data.customers]
  );

  const outstandingSupplierDues = useMemo(
    () =>
      data.suppliers.reduce(
        (sum, s) => sum + Math.max(0, Number(s.outstandingBalance) || 0),
        0
      ),
    [data.suppliers]
  );

  // Stock by Brand calculation
  const stockByBrand = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const dev of inStockDevices) {
      const current = map.get(dev.brand) || { count: 0, value: 0 };
      current.count += 1;
      current.value += dev.landedCost;
      map.set(dev.brand, current);
    }
    return Array.from(map.entries())
      .map(([brand, info]) => ({ brand, ...info }))
      .sort((a, b) => b.count - a.count);
  }, [inStockDevices]);

  // Low Stock Alerts by Model/Brand threshold
  const lowStockAlerts = useMemo(() => {
    const threshold = data.settings?.lowStockThreshold || 3;
    const modelMap = new Map<
      string,
      { brand: string; model: string; inStock: number; sold: number }
    >();
    for (const dev of data.devices) {
      const key = `${dev.brand}|||${dev.model}`;
      const entry = modelMap.get(key) || {
        brand: dev.brand,
        model: dev.model,
        inStock: 0,
        sold: 0,
      };
      if (dev.status === 'In Stock') entry.inStock += 1;
      if (dev.status === 'Sold') entry.sold += 1;
      modelMap.set(key, entry);
    }
    return Array.from(modelMap.values()).filter((m) => m.inStock < threshold);
  }, [data.devices, data.settings]);

  const summaryCards = [
    {
      label: 'Total Stock Quantity',
      value: `${inStockDevices.length} Units`,
      sub: `${data.devices.length} Total IMEIs Recorded`,
      icon: Smartphone,
      tone: 'text-[#0066FF] bg-blue-50',
      action: () => onNavigate('inventory'),
    },
    {
      label: 'Total Purchase Value',
      value: formatCurrency(totalPurchaseVal, currency),
      sub: `${filteredPurchases.length} Confirmed Purchases`,
      icon: ShoppingCart,
      tone: 'text-indigo-600 bg-indigo-50',
      action: () => onNavigate('purchase'),
    },
    {
      label: 'Total Sales Value',
      value: formatCurrency(totalSalesVal, currency),
      sub: `${filteredSales.length} Completed Invoices`,
      icon: ShoppingBag,
      tone: 'text-emerald-600 bg-emerald-50',
      action: () => onNavigate('sales'),
    },
    {
      label: "Today's Sales",
      value: formatCurrency(todaySalesTotal, currency),
      sub: `Date: ${todayStr}`,
      icon: TrendingUp,
      tone: 'text-sky-600 bg-sky-50',
      action: () => onNavigate('sales'),
    },
    {
      label: "Today's Purchases",
      value: formatCurrency(todayPurchasesTotal, currency),
      sub: `Date: ${todayStr}`,
      icon: PackagePlus,
      tone: 'text-violet-600 bg-violet-50',
      action: () => onNavigate('purchase'),
    },
    {
      label: 'Estimated Gross Profit',
      value: formatCurrency(estimatedGrossProfit, currency),
      sub: 'Net Revenue (Ex-Tax) − Landed Cost',
      icon: BarChart3,
      tone:
        estimatedGrossProfit >= 0
          ? 'text-emerald-700 bg-emerald-50'
          : 'text-red-700 bg-red-50',
      action: () => onNavigate('reports'),
    },
    {
      label: 'Net Profit (After Expenses)',
      value: formatCurrency(netProfitVal, currency),
      sub: `Expenses: ${formatCurrency(totalOperatingExpenses, currency)}`,
      icon: Wallet,
      tone:
        netProfitVal >= 0
          ? 'text-teal-700 bg-teal-50'
          : 'text-red-700 bg-red-50',
      action: () => onNavigate('reports'),
    },
    {
      label: 'Outstanding Customer Payments',
      value: formatCurrency(outstandingCustomerDues, currency),
      sub: 'Customer Receivables Due',
      icon: CreditCard,
      tone: 'text-amber-700 bg-amber-50',
      action: () => onNavigate('payments'),
    },
    {
      label: 'Outstanding Supplier Payments',
      value: formatCurrency(outstandingSupplierDues, currency),
      sub: 'Supplier Payables Due',
      icon: Receipt,
      tone: 'text-rose-700 bg-rose-50',
      action: () => onNavigate('payments'),
    },
    {
      label: 'Total Customers',
      value: String(data.customers.length),
      sub: 'Registered Buyers',
      icon: Users,
      tone: 'text-blue-700 bg-blue-50',
      action: () => onNavigate('customers'),
    },
    {
      label: 'Total Suppliers',
      value: String(data.suppliers.length),
      sub: `${data.suppliers.filter((s) => s.status === 'Active').length} Active Agents`,
      icon: Boxes,
      tone: 'text-slate-700 bg-slate-100',
      action: () => onNavigate('suppliers'),
    },
    {
      label: 'Low Stock Alerts',
      value: `${lowStockAlerts.length} Models`,
      sub: `Threshold < ${data.settings?.lowStockThreshold || 3} units`,
      icon: AlertTriangle,
      tone:
        lowStockAlerts.length > 0
          ? 'text-amber-700 bg-amber-50'
          : 'text-emerald-700 bg-emerald-50',
      action: () => onNavigate('inventory'),
    },
  ];

  const quickActions: { label: string; module: ModuleKey; icon: any; primary?: boolean }[] = [
    { label: 'Add New Purchase', module: 'purchase', icon: ShoppingCart, primary: true },
    { label: 'Create Sales Invoice', module: 'sales', icon: Plus, primary: true },
    { label: 'Add New Mobile', module: 'purchase', icon: Smartphone },
    { label: 'Add New Supplier', module: 'suppliers', icon: UserPlus },
    { label: 'Add New Customer', module: 'customers', icon: Users },
    { label: 'Generate QR Code', module: 'qr', icon: QrCode },
    { label: 'View Inventory', module: 'inventory', icon: Boxes },
    { label: 'View Reports', module: 'reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter & Quick Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Executive Business Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time IMEI stock valuation, purchase payables, customer receivables, and net profit metrics.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2 mr-1" />
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  dateFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                onClick={() => onNavigate(qa.module)}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  qa.primary
                    ? 'bg-[#0066FF] hover:bg-blue-700 text-white border-[#0066FF] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 12 KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.action}
              className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-blue-300 transition-colors flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">
                    {card.label}
                  </span>
                  <span className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1.5 block">
                    {card.value}
                  </span>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{card.sub}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0066FF] transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts Row: Sales vs Purchase Overview + Stock by Brand */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales & Purchase Financial Comparison Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Sales &amp; Purchase Overview Chart
                </h3>
                <p className="text-xs text-slate-500">
                  Visual comparison of Purchase Outflow, Sales Revenue, Landed Cost, and Net Profit
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-[#0066FF] hover:underline"
              >
                Detailed P&amp;L Report
              </button>
            </div>

            {(() => {
              const maxVal = Math.max(
                totalPurchaseVal,
                totalSalesVal,
                data.financials.totalSoldLandedCost,
                Math.abs(estimatedGrossProfit),
                1
              );
              const bars = [
                {
                  label: 'Total Purchases',
                  amount: totalPurchaseVal,
                  color: 'bg-indigo-600',
                  pct: Math.max(6, Math.round((totalPurchaseVal / maxVal) * 100)),
                },
                {
                  label: 'Total Sales Billed',
                  amount: totalSalesVal,
                  color: 'bg-[#0066FF]',
                  pct: Math.max(6, Math.round((totalSalesVal / maxVal) * 100)),
                },
                {
                  label: 'Cost of Sold Devices (Landed)',
                  amount: data.financials.totalSoldLandedCost,
                  color: 'bg-slate-600',
                  pct: Math.max(
                    6,
                    Math.round((data.financials.totalSoldLandedCost / maxVal) * 100)
                  ),
                },
                {
                  label: 'Customer Cash/UPI Received',
                  amount: data.financials.amountReceived,
                  color: 'bg-emerald-600',
                  pct: Math.max(6, Math.round((data.financials.amountReceived / maxVal) * 100)),
                },
                {
                  label: 'Gross Profit',
                  amount: estimatedGrossProfit,
                  color: 'bg-teal-600',
                  pct: Math.max(6, Math.round((Math.abs(estimatedGrossProfit) / maxVal) * 100)),
                },
              ];

              return (
                <div className="space-y-4 pt-2">
                  {bars.map((b) => (
                    <div key={b.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{b.label}</span>
                        <span className="font-mono font-bold tabular-nums text-slate-900">
                          {formatCurrency(b.amount, currency)}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${b.color}`}
                          style={{ width: `${Math.min(100, b.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">In-Stock Valuation</span>
              <span className="font-mono font-bold tabular-nums text-slate-900 text-sm">
                {formatCurrency(
                  inStockDevices.reduce((acc, d) => acc + d.landedCost, 0),
                  currency
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Expected Retail Value</span>
              <span className="font-mono font-bold tabular-nums text-[#0066FF] text-sm">
                {formatCurrency(
                  inStockDevices.reduce((acc, d) => acc + d.sellingPrice, 0),
                  currency
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Projected Stock Margin</span>
              <span className="font-mono font-bold tabular-nums text-emerald-700 text-sm">
                {formatCurrency(
                  inStockDevices.reduce(
                    (acc, d) => acc + (d.sellingPrice - d.landedCost),
                    0
                  ),
                  currency
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Stock by Brand + Low Stock Alerts */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Stock by Brand</h3>
                <p className="text-xs text-slate-500">
                  Available IMEI units and landed cost by manufacturer
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-[#0066FF] hover:underline"
              >
                View All Stock
              </button>
            </div>

            {stockByBrand.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">
                No phones currently in stock.
              </div>
            ) : (
              <div className="space-y-3">
                {stockByBrand.map((item) => (
                  <div
                    key={item.brand}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{item.brand}</div>
                      <div className="text-[11px] text-slate-500">
                        Landed Value: {formatCurrency(item.value, currency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold font-mono tabular-nums text-[#0066FF]">
                        {item.count} {item.count === 1 ? 'Unit' : 'Units'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alerts Box */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Low Stock Alerts (Threshold &lt; {data.settings?.lowStockThreshold || 3})
              </span>
              <button
                type="button"
                onClick={() => onNavigate('purchase')}
                className="text-[11px] font-semibold text-[#0066FF] hover:underline"
              >
                + Restock
              </button>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {lowStockAlerts.slice(0, 5).map((alert) => (
                <div
                  key={`${alert.brand}-${alert.model}`}
                  className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-amber-50/70 text-slate-800"
                >
                  <span className="font-medium truncate">
                    {alert.brand} {alert.model}
                  </span>
                  <span className="font-mono font-bold text-amber-800 shrink-0 ml-2">
                    {alert.inStock} left in stock
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Purchases & Recent Sales Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Purchases</h3>
              <p className="text-xs text-slate-500">Latest supplier stock inward entries</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('purchase')}
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              View All Purchases
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-3 font-semibold">Supplier</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.purchases.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-blue-700">
                      <button
                        type="button"
                        onClick={() => onOpenInvoicePrint('purchase', p.id)}
                        className="hover:underline"
                      >
                        {p.purchaseInvoiceNo}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {p.supplierName}
                      <span className="block text-[11px] text-slate-500">{p.purchaseDate}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {p.totalPhones}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatCurrency(p.grandTotal, currency)}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-semibold text-slate-700">
                      {p.paymentStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Sales</h3>
              <p className="text-xs text-slate-500">Latest customer bills and profit realized</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              View All Sales
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Billed</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Profit</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.sales.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-blue-700">
                      {s.salesInvoiceNo}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {s.customerName}
                      <span className="block text-[11px] text-slate-500">{s.saleDate}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatCurrency(s.grandTotal, currency)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                        s.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(s.grossProfit, currency)}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenInvoicePrint('sale', s.id)}
                        className="inline-flex items-center gap-1 text-[#0066FF] font-semibold hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Payments, Recently Generated Invoices & Recent User Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Payments</h3>
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              All Payments
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {data.payments.slice(0, 5).map((pay) => (
              <div key={pay.id} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900">{pay.partyName}</div>
                  <div className="text-[11px] text-slate-500">
                    {pay.paymentType} · {pay.paymentMethod} · {pay.paymentDate}
                  </div>
                </div>
                <div
                  className={`font-mono font-bold tabular-nums ${
                    pay.paymentType === 'Customer Receipt'
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(pay.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Generated Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Recently Generated Invoices
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              Billing Center
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {data.sales.slice(0, 3).map((s) => (
              <div key={`s-${s.id}`} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-blue-700">
                    {s.salesInvoiceNo}
                  </span>
                  <span className="text-slate-500 ml-2">Sale · {s.customerName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenInvoicePrint('sale', s.id)}
                  className="text-xs font-semibold text-[#0066FF] hover:underline"
                >
                  Print PDF
                </button>
              </div>
            ))}
            {data.purchases.slice(0, 2).map((p) => (
              <div key={`p-${p.id}`} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-700">
                    {p.purchaseInvoiceNo}
                  </span>
                  <span className="text-slate-500 ml-2">Purchase · {p.supplierName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenInvoicePrint('purchase', p.id)}
                  className="text-xs font-semibold text-[#0066FF] hover:underline"
                >
                  Print GRN
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent User Activities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Recent User Activities</h3>
            <button
              type="button"
              onClick={() => onNavigate('logs')}
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              Audit Trail
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {data.auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800">
                    @{log.username} ({log.userRole})
                  </span>
                  <span>{log.module}</span>
                </div>
                <div className="text-slate-700 mt-0.5 line-clamp-1">{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
