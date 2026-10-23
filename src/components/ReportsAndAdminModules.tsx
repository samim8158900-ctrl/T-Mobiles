import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Download,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Printer,
  Save,
  Search,
  Shield,
  Square,
  UserCheck,
  UserX,
} from 'lucide-react';
import { WorkspaceData, formatCurrency } from '../types';
import { ALL_MODULES } from '../utils/accounting';

interface AdminModuleProps {
  data: WorkspaceData;
  token: string;
  onRefresh: () => Promise<void>;
}

const REPORT_TYPES = [
  { id: 'gross_pl', label: 'Gross Profit and Loss Report' },
  { id: 'net_profit', label: 'Net Profit & Financial Statement' },
  { id: 'daily_sales', label: 'Daily Sales Report' },
  { id: 'monthly_sales', label: 'Monthly Sales Report' },
  { id: 'purchase', label: 'Purchase Report' },
  { id: 'current_stock', label: 'Current Stock Report (All Statuses)' },
  { id: 'available_stock', label: 'Available Stock Report (In Stock)' },
  { id: 'sold_mobile', label: 'Sold Mobile Report' },
  { id: 'imei_history', label: 'IMEI Movement History Report' },
  { id: 'supplier_purchase', label: 'Supplier Purchase Report' },
  { id: 'customer_sales', label: 'Customer Sales Report' },
  { id: 'customer_due', label: 'Customer Due Report (Receivables)' },
  { id: 'supplier_due', label: 'Supplier Due Report (Payables)' },
  { id: 'payment', label: 'Payment Collection & Outflow Report' },
  { id: 'expense', label: 'Operating Expense Report' },
  { id: 'employee_activity', label: 'Employee Activity & Audit Report' },
] as const;

// ============================================================================
// 1. REPORTS & EXPORTS MODULE (All 16 Reports + Accounting Summary)
// ============================================================================
export const ReportsModule: React.FC<AdminModuleProps> = ({ data }) => {
  const currency = data.settings?.currencySymbol || '₹';
  const [activeReport, setActiveReport] = useState<string>('gross_pl');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');

  const fin = data.financials;

  const uniqueBrands = useMemo(
    () => Array.from(new Set(data.devices.map((d) => d.brand))).sort(),
    [data.devices]
  );

  const inDateRange = (dateStr: string) => {
    if (!dateStr) return true;
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  };

  const reportTable = useMemo(() => {
    switch (activeReport) {
      case 'gross_pl': {
        const items = data.saleItems.filter((item) => {
          if (brandFilter !== 'All' && item.brand !== brandFilter) return false;
          const sale = data.sales.find((s) => s.id === item.saleId);
          return sale && sale.status === 'Completed' && inDateRange(sale.saleDate);
        });
        return {
          title: 'Transaction-Level Gross Profit & Loss Report',
          headers: [
            'Inventory ID',
            'Mobile Brand & Model',
            'IMEI 1',
            'Purchase Price',
            'Addl Cost',
            'Landed Cost',
            'Net Sale (Ex-Tax)',
            'Tax Collected',
            'Profit / Loss',
          ],
          rows: items.map((i) => [
            i.inventoryCode,
            `${i.brand} ${i.model}`,
            i.imei1,
            formatCurrency(i.purchaseCost, currency),
            formatCurrency(i.additionalCost, currency),
            formatCurrency(i.landedCost, currency),
            formatCurrency(i.netSaleAmount, currency),
            formatCurrency(i.taxAmount, currency),
            formatCurrency(i.profitOrLoss, currency),
          ]),
        };
      }
      case 'net_profit': {
        return {
          title: 'Net Profit & Accounting Statement',
          headers: ['Accounting Metric', 'Formula / Basis', 'Amount'],
          rows: [
            [
              'Total Purchase Cost (Inward Stock)',
              'Confirmed Supplier Purchases',
              formatCurrency(fin.totalPurchaseCost, currency),
            ],
            [
              'Total Sales Revenue (Excluding Taxes)',
              'Unit Selling Price − Discounts',
              formatCurrency(fin.totalSalesRevenueExTax, currency),
            ],
            [
              'Landed Cost of Sold Phones',
              'Purchase Price + Allocated Additional Costs',
              formatCurrency(fin.totalSoldLandedCost, currency),
            ],
            [
              'Gross Profit (Profitable Units)',
              'Net Sale Revenue Ex-Tax − Landed Cost',
              formatCurrency(fin.grossProfit, currency),
            ],
            [
              'Gross Loss (Below-Cost Units)',
              'Sold Below Landed Cost',
              formatCurrency(fin.grossLoss, currency),
            ],
            [
              'Net Gross Margin',
              'Gross Profit − Gross Loss',
              formatCurrency(fin.netGrossMargin, currency),
            ],
            [
              'Operating Expenses',
              'Rent, Salaries, Transport, Packaging, Repairs',
              formatCurrency(fin.operatingExpenses, currency),
            ],
            [
              'Net Profit / Loss',
              'Net Gross Margin − Operating Expenses',
              formatCurrency(fin.netProfit, currency),
            ],
            [
              'Actual Cash / UPI / Bank Received',
              'Verified Customer Receipts (Excludes Unpaid Dues)',
              formatCurrency(fin.amountReceived, currency),
            ],
            [
              'Customer Receivables (Unpaid Dues)',
              'Outstanding Customer Invoice Balances',
              formatCurrency(fin.customerReceivables, currency),
            ],
            [
              'Supplier Payables (Unpaid Dues)',
              'Outstanding Supplier Purchase Balances',
              formatCurrency(fin.supplierPayables, currency),
            ],
          ],
        };
      }
      case 'daily_sales':
      case 'monthly_sales':
      case 'customer_sales': {
        const rows = data.sales
          .filter((s) => inDateRange(s.saleDate))
          .map((s) => [
            s.salesInvoiceNo,
            s.saleDate,
            s.customerName,
            String(s.totalPhones),
            formatCurrency(s.totalLandedCost, currency),
            formatCurrency(s.grandTotal, currency),
            formatCurrency(s.amountReceived, currency),
            formatCurrency(s.outstandingAmount, currency),
            formatCurrency(s.grossProfit, currency),
            s.status,
          ]);
        return {
          title: REPORT_TYPES.find((r) => r.id === activeReport)?.label || 'Sales Report',
          headers: [
            'Invoice No',
            'Date',
            'Customer',
            'Phones',
            'Landed Cost',
            'Grand Total',
            'Received',
            'Balance Due',
            'Gross Profit',
            'Status',
          ],
          rows,
        };
      }
      case 'purchase':
      case 'supplier_purchase': {
        const rows = data.purchases
          .filter((p) => inDateRange(p.purchaseDate))
          .map((p) => [
            p.purchaseInvoiceNo,
            p.purchaseDate,
            p.supplierName,
            p.supplierInvoiceNo || '-',
            String(p.totalPhones),
            formatCurrency(p.grandTotal, currency),
            formatCurrency(p.amountPaid, currency),
            formatCurrency(p.outstandingAmount, currency),
            p.status,
          ]);
        return {
          title: 'Supplier Purchase Report',
          headers: [
            'Purchase No',
            'Date',
            'Supplier',
            'Supplier Inv',
            'Phones',
            'Grand Total',
            'Paid',
            'Payable Due',
            'Status',
          ],
          rows,
        };
      }
      case 'current_stock':
      case 'available_stock':
      case 'sold_mobile': {
        const list = data.devices.filter((d) => {
          if (brandFilter !== 'All' && d.brand !== brandFilter) return false;
          if (activeReport === 'available_stock') return d.status === 'In Stock';
          if (activeReport === 'sold_mobile') return d.status === 'Sold';
          return true;
        });
        return {
          title: REPORT_TYPES.find((r) => r.id === activeReport)?.label || 'Stock Report',
          headers: [
            'Inventory ID',
            'Brand & Model',
            'IMEI 1',
            'Condition',
            'Supplier',
            'Landed Cost',
            'Selling Price',
            'Status',
            'Date Received',
          ],
          rows: list.map((d) => [
            d.inventoryCode,
            `${d.brand} ${d.model} (${d.ram}/${d.storage})`,
            d.imei1,
            d.condition,
            d.supplierName,
            formatCurrency(d.landedCost, currency),
            formatCurrency(d.sellingPrice, currency),
            d.status,
            d.dateReceived,
          ]),
        };
      }
      case 'imei_history': {
        return {
          title: 'IMEI Movement & Lifecycle History Report',
          headers: [
            'Inventory ID',
            'IMEI 1',
            'Movement Type',
            'From Status',
            'To Status',
            'Reference',
            'Performed By',
            'Notes',
          ],
          rows: data.movements.map((m) => [
            m.inventoryCode,
            m.imei1,
            m.movementType,
            m.fromStatus,
            m.toStatus,
            m.referenceNo,
            m.performedBy,
            m.notes,
          ]),
        };
      }
      case 'customer_due': {
        return {
          title: 'Customer Due Report (Receivables)',
          headers: [
            'Customer ID',
            'Customer Name',
            'Phone',
            'Total Purchased',
            'Total Paid',
            'Outstanding Balance',
          ],
          rows: data.customers
            .filter((c) => c.outstandingBalance > 0)
            .map((c) => [
              c.customerCode,
              c.name,
              c.phone,
              formatCurrency(c.totalPurchases, currency),
              formatCurrency(c.totalPaid, currency),
              formatCurrency(c.outstandingBalance, currency),
            ]),
        };
      }
      case 'supplier_due': {
        return {
          title: 'Supplier Due Report (Payables)',
          headers: [
            'Supplier ID',
            'Supplier Name',
            'Business Name',
            'Phone',
            'Total Purchased',
            'Total Paid',
            'Outstanding Payable',
          ],
          rows: data.suppliers
            .filter((s) => s.outstandingBalance > 0)
            .map((s) => [
              s.supplierCode,
              s.name,
              s.businessName,
              s.phone,
              formatCurrency(s.totalPurchased, currency),
              formatCurrency(s.totalPaid, currency),
              formatCurrency(s.outstandingBalance, currency),
            ]),
        };
      }
      case 'payment': {
        return {
          title: 'Payment Collection & Supplier Outflow Report',
          headers: [
            'Payment ID',
            'Date',
            'Type',
            'Party Name',
            'Invoice Ref',
            'Method',
            'Amount',
            'Recorded By',
          ],
          rows: data.payments
            .filter((p) => inDateRange(p.paymentDate))
            .map((p) => [
              p.paymentCode,
              p.paymentDate,
              p.paymentType,
              p.partyName,
              p.invoiceNo || 'Direct',
              p.paymentMethod,
              formatCurrency(p.amount, currency),
              p.createdBy,
            ]),
        };
      }
      case 'expense': {
        return {
          title: 'Store Operating Expense Report',
          headers: [
            'Expense ID',
            'Date',
            'Category',
            'Description',
            'Payment Method',
            'Amount',
            'Created By',
          ],
          rows: data.expenses
            .filter((e) => inDateRange(e.expenseDate))
            .map((e) => [
              e.expenseCode,
              e.expenseDate,
              e.category,
              e.description,
              e.paymentMethod,
              formatCurrency(e.amount, currency),
              e.createdBy,
            ]),
        };
      }
      default: {
        return {
          title: 'Employee Activity & Security Audit Report',
          headers: ['Log ID', 'Username', 'Role', 'Module', 'Action', 'Entity', 'Details'],
          rows: data.auditLogs.map((l) => [
            String(l.id),
            l.username,
            l.userRole,
            l.module,
            l.action,
            l.entityId,
            l.details,
          ]),
        };
      }
    }
  }, [activeReport, data, brandFilter, dateFrom, dateTo, currency, fin]);

  const exportCurrentReportCsv = () => {
    const lines = [
      reportTable.headers.join(','),
      ...reportTable.rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `TMobiles_${activeReport}_Report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top P&L Accounting Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 no-print">
        {[
          { label: 'Total Purchase Cost', val: fin.totalPurchaseCost, tone: 'text-slate-900' },
          {
            label: 'Sales Revenue (Ex-Tax)',
            val: fin.totalSalesRevenueExTax,
            tone: 'text-[#0066FF]',
          },
          { label: 'Gross Profit', val: fin.grossProfit, tone: 'text-emerald-700' },
          { label: 'Operating Expenses', val: fin.operatingExpenses, tone: 'text-amber-700' },
          {
            label: 'Net Profit',
            val: fin.netProfit,
            tone: fin.netProfit >= 0 ? 'text-teal-700' : 'text-red-600',
          },
          { label: 'Cash/UPI Received', val: fin.amountReceived, tone: 'text-emerald-800' },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-2xl border border-slate-200 p-4"
          >
            <span className="text-[11px] font-semibold text-slate-500 block">
              {m.label}
            </span>
            <span
              className={`text-lg font-extrabold font-mono tabular-nums mt-1 block ${m.tone}`}
            >
              {formatCurrency(m.val, currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Report Selector & Export Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Financial, Inventory &amp; Audit Reports (16 Reports)
            </h2>
            <p className="text-xs text-slate-500">
              Landed Cost = Purchase Price + Additional Cost · Gross Profit = Net Sale Revenue Ex-Tax − Landed Cost
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCurrentReportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A1628] hover:bg-slate-800 text-white text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Report Type
            </label>
            <select
              value={activeReport}
              onChange={(e) => setActiveReport(e.target.value)}
              aria-label="Select Report Type"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Brand Filter
            </label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="All">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Printable Report Output */}
        <div id="printable-area" className="pt-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {data.settings?.storeName || 'T Mobiles'} — {reportTable.title}
              </h3>
              <p className="text-xs text-slate-500">
                Generated on {new Date().toISOString().slice(0, 10)} ·{' '}
                {reportTable.rows.length} Record(s)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  {reportTable.headers.map((h) => (
                    <th key={h} className="py-2.5 px-3 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportTable.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={reportTable.headers.length}
                      className="py-8 text-center text-slate-500"
                    >
                      No records found for this report criteria.
                    </td>
                  </tr>
                ) : (
                  reportTable.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-2.5 px-3 font-mono text-slate-800"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SETTINGS MODULE
// ============================================================================
export const SettingsModule: React.FC<AdminModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const s = data.settings;
  const [storeName, setStoreName] = useState(s?.storeName || 'T Mobiles');
  const [tagline, setTagline] = useState(s?.tagline || '');
  const [address, setAddress] = useState(s?.address || '');
  const [cityStatePin, setCityStatePin] = useState(s?.cityStatePin || '');
  const [phone, setPhone] = useState(s?.phone || '');
  const [altPhone, setAltPhone] = useState(s?.altPhone || '');
  const [email, setEmail] = useState(s?.email || '');
  const [gstin, setGstin] = useState(s?.gstin || '');
  const [currencySymbol, setCurrencySymbol] = useState(s?.currencySymbol || '₹');
  const [defaultTaxRate, setDefaultTaxRate] = useState(s?.defaultTaxRate || 0);
  const [purchasePrefix, setPurchasePrefix] = useState(
    s?.purchasePrefix || 'PUR-2026-'
  );
  const [salesPrefix, setSalesPrefix] = useState(s?.salesPrefix || 'INV-2026-');
  const [inventoryPrefix, setInventoryPrefix] = useState(
    s?.inventoryPrefix || 'TM-INV-'
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    s?.lowStockThreshold || 3
  );
  const [invoiceFooter, setInvoiceFooter] = useState(s?.invoiceFooter || '');
  const [warrantyTerms, setWarrantyTerms] = useState(s?.warrantyTerms || '');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName,
          tagline,
          address,
          cityStatePin,
          phone,
          altPhone,
          email,
          gstin,
          currencySymbol,
          defaultTaxRate: Number(defaultTaxRate) || 0,
          purchasePrefix,
          salesPrefix,
          inventoryPrefix,
          lowStockThreshold: Number(lowStockThreshold) || 3,
          invoiceFooter,
          warrantyTerms,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to save settings');
      await onRefresh();
      setMsg('Store branding, invoice prefixes, and tax settings saved!');
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Store Branding, Invoice &amp; Tax Settings
          </h2>
          <p className="text-xs text-slate-500">
            Configure T Mobiles store details, prefixes, default currency (₹), and warranty terms across all invoices.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Official Store Name
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Store Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Address Line
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            City, State &amp; PIN
          </label>
          <input
            type="text"
            value={cityStatePin}
            onChange={(e) => setCityStatePin(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Primary Contact Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Store Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            GSTIN / Tax Registration (Optional)
          </label>
          <input
            type="text"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="Leave blank if not applicable"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Currency Symbol
          </label>
          <input
            type="text"
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Purchase Invoice Prefix
          </label>
          <input
            type="text"
            value={purchasePrefix}
            onChange={(e) => setPurchasePrefix(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Sales Invoice Prefix
          </label>
          <input
            type="text"
            value={salesPrefix}
            onChange={(e) => setSalesPrefix(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Low Stock Alert Threshold (Units)
          </label>
          <input
            type="number"
            min={1}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Number(e.target.value) || 3)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Invoice Footer Message
          </label>
          <input
            type="text"
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Warranty &amp; Return Terms (Printed on Customer Bills)
          </label>
          <textarea
            rows={3}
            value={warrantyTerms}
            onChange={(e) => setWarrantyTerms(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
          />
        </div>
      </div>
    </form>
  );
};

// ============================================================================
// 3. USER MANAGEMENT MODULE (Admin Employee Account Control)
// ============================================================================
export const UsersModule: React.FC<AdminModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('Sales Operator');
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          username,
          fullName,
          email,
          phone,
          password: password || undefined,
          roleName,
          portalType: roleName === 'Super Admin' ? 'admin' : 'staff',
          isActive,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Failed to save employee');
      await onRefresh();
      setEditingId(null);
      setUsername('');
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setMsg(
        `Employee account @${saved.username} (${saved.roleName}) saved successfully.`
      );
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900">
          {msg}
        </div>
      )}

      <form
        onSubmit={handleSaveEmployee}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <h2 className="text-xl font-extrabold text-slate-900">
          {editingId
            ? 'Edit Employee Account / Reset Password'
            : 'Create Employee Account'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Employee Name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sales_exec1"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {editingId ? 'New Password (Optional)' : 'Temporary Password *'}
            </label>
            <input
              type="text"
              required={!editingId}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Staff@123"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Job Role
            </label>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              {data.roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@tmobiles.in"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Account Status
            </label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="active">Active (Permitted)</option>
              <option value="inactive">Deactivated / Revoked</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setUsername('');
                setFullName('');
                setEmail('');
                setPassword('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
          >
            {editingId ? 'Save Employee Changes' : 'Create Employee Account'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Registered Employee &amp; Admin Accounts ({data.users.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Full Name</th>
                <th className="py-3 px-3 font-semibold">Username</th>
                <th className="py-3 px-3 font-semibold">Role</th>
                <th className="py-3 px-3 font-semibold">Login Portal</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Last Login</th>
                <th className="py-3 pl-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-bold text-slate-900">
                    {u.fullName}
                    <span className="block text-[11px] font-normal text-slate-500">
                      {u.email}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">
                    @{u.username}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {u.roleName}
                  </td>
                  <td className="py-3 px-3 uppercase font-mono text-[11px] text-slate-600">
                    {u.portalType}
                  </td>
                  <td className="py-3 px-3 font-bold">
                    <span
                      className={
                        u.isActive ? 'text-emerald-700' : 'text-red-600'
                      }
                    >
                      {u.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                    {u.lastLoginAt ? u.lastLoginAt.slice(0, 16).replace('T', ' ') : 'Never'}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(u.id);
                        setFullName(u.fullName);
                        setUsername(u.username);
                        setEmail(u.email);
                        setRoleName(u.roleName);
                        setIsActive(Boolean(u.isActive));
                        setPassword('');
                      }}
                      className="text-[#0066FF] font-semibold hover:underline"
                    >
                      Edit / Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. ROLES & PERMISSIONS MODULE
// ============================================================================
export const RolesModule: React.FC<AdminModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const [selectedRole, setSelectedRole] = useState(data.roles[1] || data.roles[0]);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [checkedModules, setCheckedModules] = useState<string[]>(
    selectedRole?.permissionsList || ['dashboard']
  );
  const [msg, setMsg] = useState<string | null>(null);

  const selectExistingRole = (r: any) => {
    setIsCreatingCustom(false);
    setSelectedRole(r);
    setCheckedModules(r.permissionsList || ['dashboard']);
  };

  const toggleModule = (mod: string) => {
    setCheckedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = isCreatingCustom
        ? {
            name: customRoleName,
            description: customRoleDesc || 'Custom Staff Role',
            permissionsList: checkedModules,
          }
        : {
            id: selectedRole.id,
            name: selectedRole.name,
            description: selectedRole.description,
            permissionsList: checkedModules,
          };

      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Failed to save role');
      await onRefresh();
      setIsCreatingCustom(false);
      setCustomRoleName('');
      setCustomRoleDesc('');
      setMsg(`Permissions saved for role "${saved.name}". Enforced on all backend APIs.`);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Configured Roles</h3>
            <button
              type="button"
              onClick={() => {
                setIsCreatingCustom(true);
                setCheckedModules(['dashboard', 'inventory', 'sales']);
              }}
              className="text-xs font-bold text-[#0066FF] hover:underline"
            >
              + Create Custom Role
            </button>
          </div>
          <div className="space-y-2">
            {data.roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectExistingRole(r)}
                className={`w-full p-3 rounded-xl border text-left transition-colors ${
                  !isCreatingCustom && selectedRole?.id === r.id
                    ? 'border-[#0066FF] bg-blue-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">{r.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {r.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSaveRole}
          className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
        >
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {isCreatingCustom
                ? 'Create New Custom Role'
                : `Module Permissions for: ${selectedRole?.name}`}
            </h3>
            <p className="text-xs text-slate-500">
              Permissions checked below control both sidebar navigation visibility and backend API authorization.
            </p>
          </div>

          {isCreatingCustom && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="e.g. Senior Store Auditor"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role Description *
                </label>
                <input
                  type="text"
                  required
                  value={customRoleDesc}
                  onChange={(e) => setCustomRoleDesc(e.target.value)}
                  placeholder="Describe permitted responsibilities"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_MODULES.map((mod) => {
              const checked =
                (!isCreatingCustom && selectedRole?.name === 'Super Admin') ||
                checkedModules.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  disabled={!isCreatingCustom && selectedRole?.name === 'Super Admin'}
                  onClick={() => toggleModule(mod)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 text-xs font-semibold ${
                    checked
                      ? 'border-blue-300 bg-blue-50/50 text-slate-900'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-[#0066FF] shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="capitalize">{mod}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
            >
              Save Role &amp; Enforce Permissions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 5. ACTIVITY LOGS MODULE
// ============================================================================
export const ActivityLogsModule: React.FC<{ data: WorkspaceData }> = ({
  data,
}) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.auditLogs;
    return data.auditLogs.filter(
      (l) =>
        l.username.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q)
    );
  }, [data.auditLogs, search]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            System Audit &amp; Employee Activity Logs ({filtered.length})
          </h2>
          <p className="text-xs text-slate-500">
            Immutable audit trail of logins, purchases, IMEI stock updates, sales bills, payments, and role changes.
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs by user, module, or invoice..."
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-3 pr-3 font-semibold">Log #</th>
              <th className="py-3 px-3 font-semibold">User &amp; Role</th>
              <th className="py-3 px-3 font-semibold">Module</th>
              <th className="py-3 px-3 font-semibold">Action</th>
              <th className="py-3 px-3 font-semibold">Reference ID</th>
              <th className="py-3 pl-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="py-3 pr-3 font-mono text-slate-500">#{l.id}</td>
                <td className="py-3 px-3">
                  <span className="font-bold text-slate-900">@{l.username}</span>
                  <span className="block text-[10px] text-slate-500">
                    {l.userRole}
                  </span>
                </td>
                <td className="py-3 px-3 font-semibold text-slate-700">
                  {l.module}
                </td>
                <td className="py-3 px-3 font-mono text-[11px] font-bold text-blue-700">
                  {l.action}
                </td>
                <td className="py-3 px-3 font-mono text-slate-700">
                  {l.entityId || '-'}
                </td>
                <td className="py-3 pl-3 text-slate-700">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
