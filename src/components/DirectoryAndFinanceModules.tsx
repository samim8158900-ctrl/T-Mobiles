import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  Plus,
  Search,
  UserX,
  X,
} from 'lucide-react';
import {
  CustomerRecord,
  ExpenseRecord,
  SupplierRecord,
  WorkspaceData,
  formatCurrency,
} from '../types';

interface SharedModuleProps {
  data: WorkspaceData;
  token: string;
  onRefresh: () => Promise<void>;
}

// ============================================================================
// 1. SUPPLIERS & AGENTS MODULE
// ============================================================================
export const SuppliersModule: React.FC<SharedModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inspectSupplier, setInspectSupplier] = useState<SupplierRecord | null>(null);

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Active');
  const [msg, setMsg] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.suppliers.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.businessName.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      );
    });
  }, [data.suppliers, search, statusFilter]);

  const startEdit = (sup: SupplierRecord) => {
    setEditingId(sup.id);
    setName(sup.name);
    setBusinessName(sup.businessName);
    setPhone(sup.phone);
    setAltPhone(sup.altPhone);
    setAddress(sup.address);
    setCity(sup.city);
    setState(sup.state);
    setPinCode(sup.pinCode);
    setEmail(sup.email);
    setGstin(sup.gstin);
    setNotes(sup.notes);
    setStatus(sup.status);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setBusinessName('');
    setPhone('');
    setAltPhone('');
    setAddress('');
    setCity('');
    setState('');
    setPinCode('');
    setEmail('');
    setGstin('');
    setNotes('');
    setStatus('Active');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          name,
          businessName,
          phone,
          altPhone,
          address,
          city,
          state,
          pinCode,
          email,
          gstin,
          notes,
          status,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Failed to save supplier');
      await onRefresh();
      resetForm();
      setMsg(`Supplier ${saved.name} (${saved.supplierCode}) saved successfully.`);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const toggleDeactivate = async (sup: SupplierRecord) => {
    const nextStatus = sup.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...sup,
          status: nextStatus,
        }),
      });
      await onRefresh();
      setMsg(
        `Supplier ${sup.name} marked as ${nextStatus}. Historical transactions preserved.`
      );
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const exportSuppliersCsv = () => {
    const headers = [
      'Supplier ID',
      'Name',
      'Business Name',
      'Phone',
      'City',
      'State',
      'Status',
      'Total Purchased',
      'Total Paid',
      'Outstanding Balance',
    ];
    const rows = filteredSuppliers.map((s) => [
      s.supplierCode,
      `"${s.name}"`,
      `"${s.businessName}"`,
      `"${s.phone}"`,
      `"${s.city}"`,
      `"${s.state}"`,
      s.status,
      s.totalPurchased,
      s.totalPaid,
      s.outstandingBalance,
    ]);
    const csv =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = 'TMobiles_Suppliers_Directory.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900">
          {msg}
        </div>
      )}

      {/* Add / Edit Supplier Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {editingId ? 'Edit Supplier / Agent' : 'Add New Supplier or Agent'}
            </h2>
            <p className="text-xs text-slate-500">
              Maintain complete supplier contact details, GSTIN, purchase history, and outstanding balances.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supplier or Agent Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Business Name (Optional)
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Distributor / Agency Name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Primary Contact Number *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alternate Contact Number
            </label>
            <input
              type="text"
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
              placeholder="Optional Phone"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Market / Building / Street"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              City &amp; State
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              PIN Code
            </label>
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="560001"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supplier@domain.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              GSTIN (Optional)
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="Optional Tax ID"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specialties / credit terms"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? 'Update Supplier' : 'Save Supplier'}</span>
          </button>
        </div>
      </form>

      {/* Supplier Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Supplier &amp; Agent Directory ({filteredSuppliers.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              type="button"
              onClick={exportSuppliersCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Supplier ID</th>
                <th className="py-3 px-3 font-semibold">Supplier / Business</th>
                <th className="py-3 px-3 font-semibold">Contact &amp; City</th>
                <th className="py-3 px-3 font-semibold text-right">Total Purchased</th>
                <th className="py-3 px-3 font-semibold text-right">Total Paid</th>
                <th className="py-3 px-3 font-semibold text-right">Payable Balance</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 pl-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-mono font-bold text-blue-700">
                    {sup.supplierCode}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{sup.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {sup.businessName || 'Individual Agent'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-slate-800">{sup.phone}</div>
                    <div className="text-[11px] text-slate-500">
                      {sup.city} {sup.state}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatCurrency(sup.totalPurchased, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                    {formatCurrency(sup.totalPaid, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-rose-700">
                    {formatCurrency(sup.outstandingBalance, currency)}
                  </td>
                  <td className="py-3 px-3 font-semibold">
                    <span
                      className={
                        sup.status === 'Active' ? 'text-emerald-700' : 'text-slate-400'
                      }
                    >
                      {sup.status}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setInspectSupplier(sup)}
                      className="inline-flex items-center gap-1 text-[#0066FF] font-semibold hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(sup)}
                      className="inline-flex items-center gap-1 text-slate-700 font-semibold hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDeactivate(sup)}
                      className="inline-flex items-center gap-1 text-amber-700 font-semibold hover:underline"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{sup.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Purchase & Payment History Modal */}
      {inspectSupplier && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {inspectSupplier.name} ({inspectSupplier.supplierCode}) — Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectSupplier.businessName} · Phone: {inspectSupplier.phone} · Outstanding:{' '}
                  <strong className="font-mono text-rose-700">
                    {formatCurrency(inspectSupplier.outstandingBalance, currency)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSupplier(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">
                Purchase History
              </h4>
              <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl p-3">
                {data.purchases
                  .filter((p) => p.supplierId === inspectSupplier.id)
                  .map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-blue-700">
                          {p.purchaseInvoiceNo}
                        </span>{' '}
                        · {p.purchaseDate} ({p.totalPhones} phones)
                      </div>
                      <div className="font-mono font-bold">
                        Total: {formatCurrency(p.grandTotal, currency)} · Due:{' '}
                        {formatCurrency(p.outstandingAmount, currency)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">
                Supplier Payments Recorded
              </h4>
              <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl p-3">
                {data.payments
                  .filter(
                    (pay) =>
                      pay.paymentType === 'Supplier Payment' &&
                      pay.partyId === inspectSupplier.id
                  )
                  .map((pay) => (
                    <div key={pay.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{pay.paymentCode}</span> ·{' '}
                        {pay.paymentDate} · {pay.paymentMethod}
                      </div>
                      <div className="font-mono font-bold text-emerald-700">
                        {formatCurrency(pay.amount, currency)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. CUSTOMERS MODULE
// ============================================================================
export const CustomersModule: React.FC<SharedModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inspectCustomer, setInspectCustomer] = useState<CustomerRecord | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });
  }, [data.customers, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          name,
          phone,
          address,
          email,
          gstin,
          notes,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Failed to save customer');
      await onRefresh();
      setEditingId(null);
      setName('');
      setPhone('');
      setAddress('');
      setEmail('');
      setGstin('');
      setNotes('');
      setMsg(`Customer ${saved.name} (${saved.customerCode}) saved.`);
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
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <h2 className="text-xl font-extrabold text-slate-900">
          {editingId ? 'Edit Customer' : 'Add New Customer'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contact Number *
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Area / City"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@email.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customer preferences"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? 'Update Customer' : 'Save Customer'}</span>
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Customer Directory ({filteredCustomers.length})
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Customer ID</th>
                <th className="py-3 px-3 font-semibold">Name</th>
                <th className="py-3 px-3 font-semibold">Contact &amp; Address</th>
                <th className="py-3 px-3 font-semibold text-right">Total Purchases</th>
                <th className="py-3 px-3 font-semibold text-right">Amount Paid</th>
                <th className="py-3 px-3 font-semibold text-right">Outstanding Due</th>
                <th className="py-3 pl-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-mono font-bold text-blue-700">
                    {c.customerCode}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-slate-800">{c.phone}</div>
                    <div className="text-[11px] text-slate-500">{c.address}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {formatCurrency(c.totalPurchases, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                    {formatCurrency(c.totalPaid, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-amber-700">
                    {formatCurrency(c.outstandingBalance, currency)}
                  </td>
                  <td className="py-3 pl-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setInspectCustomer(c)}
                      className="text-[#0066FF] font-semibold hover:underline"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setName(c.name);
                        setPhone(c.phone);
                        setAddress(c.address);
                        setEmail(c.email);
                        setNotes(c.notes);
                      }}
                      className="text-slate-700 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {inspectCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {inspectCustomer.name} ({inspectCustomer.customerCode}) — Invoice &amp; Payment History
                </h3>
                <p className="text-xs text-slate-500">
                  Phone: {inspectCustomer.phone} · Outstanding Due:{' '}
                  <strong className="font-mono text-amber-700">
                    {formatCurrency(inspectCustomer.outstandingBalance, currency)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold uppercase text-slate-500">Sales Invoices</div>
              {data.sales
                .filter((s) => s.customerId === inspectCustomer.id)
                .map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-slate-50 flex justify-between"
                  >
                    <span>
                      <strong className="font-mono text-blue-700">
                        {s.salesInvoiceNo}
                      </strong>{' '}
                      · {s.saleDate}
                    </span>
                    <span className="font-mono font-bold">
                      Total: {formatCurrency(s.grandTotal, currency)} · Due:{' '}
                      {formatCurrency(s.outstandingAmount, currency)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. PAYMENTS MODULE (Customer Receipts & Supplier Payments)
// ============================================================================
export const PaymentsModule: React.FC<SharedModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentType, setPaymentType] = useState<
    'Customer Receipt' | 'Supplier Payment'
  >('Customer Receipt');
  const [partyId, setPartyId] = useState<number>(data.customers[0]?.id || 1);
  const [referenceId, setReferenceId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [amount, setAmount] = useState<number>(5000);
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleTypeChange = (next: 'Customer Receipt' | 'Supplier Payment') => {
    setPaymentType(next);
    setReferenceId('');
    if (next === 'Customer Receipt') {
      setPartyId(data.customers[0]?.id || 1);
    } else {
      setPartyId(data.suppliers[0]?.id || 1);
    }
  };

  const openInvoicesForParty = useMemo(() => {
    if (paymentType === 'Customer Receipt') {
      return data.sales.filter(
        (s) => s.customerId === Number(partyId) && s.outstandingAmount > 0
      );
    } else {
      return data.purchases.filter(
        (p) => p.supplierId === Number(partyId) && p.outstandingAmount > 0
      );
    }
  }, [paymentType, partyId, data.sales, data.purchases]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentDate,
          paymentType,
          referenceType:
            paymentType === 'Customer Receipt' ? 'Sale' : 'Purchase',
          referenceId: referenceId ? Number(referenceId) : undefined,
          partyId: Number(partyId),
          paymentMethod,
          amount: Number(amount) || 0,
          transactionRef,
          notes,
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Failed to record payment');
      await onRefresh();
      setTransactionRef('');
      setNotes('');
      setMsg(
        `Recorded ${created.paymentType} (${created.paymentCode}) of ${formatCurrency(
          created.amount,
          currency
        )}.`
      );
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

      <form
        onSubmit={handleSavePayment}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Customer Receipts &amp; Supplier Payments
          </h2>
          <p className="text-xs text-slate-500">
            Record partial or full settlements against sales and purchase invoices. Automatically updates outstanding balances.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transaction Type
            </label>
            <select
              value={paymentType}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="Customer Receipt">Customer Receipt (Inflow)</option>
              <option value="Supplier Payment">Supplier Payment (Outflow)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {paymentType === 'Customer Receipt'
                ? 'Select Customer'
                : 'Select Supplier'}
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              {paymentType === 'Customer Receipt'
                ? data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: {formatCurrency(c.outstandingBalance, currency)})
                    </option>
                  ))
                : data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Due: {formatCurrency(s.outstandingBalance, currency)})
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Linked Unpaid Invoice
            </label>
            <select
              value={referenceId}
              onChange={(e) => {
                setReferenceId(e.target.value);
                const idNum = Number(e.target.value);
                if (idNum) {
                  const inv: any = openInvoicesForParty.find((x) => x.id === idNum);
                  if (inv) setAmount(inv.outstandingAmount);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="">-- Direct Account Balance --</option>
              {openInvoicesForParty.map((inv: any) => (
                <option key={inv.id} value={String(inv.id)}>
                  {inv.salesInvoiceNo || inv.purchaseInvoiceNo} (Due:{' '}
                  {formatCurrency(inv.outstandingAmount, currency)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount ({currency}) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reference / UTR Number (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="UPI Ref / NEFT UTR / Receipt #"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Partial settlement / balance notes"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
            >
              Record Payment Entry
            </button>
          </div>
        </div>
      </form>

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Recorded Payments Ledger ({data.payments.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Payment ID</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Type</th>
                <th className="py-3 px-3 font-semibold">Party Name</th>
                <th className="py-3 px-3 font-semibold">Linked Invoice</th>
                <th className="py-3 px-3 font-semibold">Method &amp; Ref</th>
                <th className="py-3 px-3 font-semibold text-right">Amount</th>
                <th className="py-3 pl-3 font-semibold">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-mono font-bold text-blue-700">
                    {p.paymentCode}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {p.paymentDate}
                  </td>
                  <td className="py-3 px-3 font-semibold">
                    <span
                      className={
                        p.paymentType === 'Customer Receipt'
                          ? 'text-emerald-700'
                          : 'text-indigo-700'
                      }
                    >
                      {p.paymentType}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {p.partyName}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {p.invoiceNo || 'Direct'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold">{p.paymentMethod}</span>
                    {p.transactionRef && (
                      <span className="block text-[10px] font-mono text-slate-500">
                        {p.transactionRef}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatCurrency(p.amount, currency)}
                  </td>
                  <td className="py-3 pl-3 text-slate-500">{p.createdBy}</td>
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
// 4. EXPENSES MODULE
// ============================================================================
export const ExpensesModule: React.FC<SharedModuleProps> = ({
  data,
  token,
  onRefresh,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState<number>(1500);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          expenseDate,
          category,
          amount: Number(amount) || 0,
          description,
          paymentMethod,
          referenceNo,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Failed to save expense');
      await onRefresh();
      setEditingId(null);
      setDescription('');
      setReferenceNo('');
      setMsg(
        `Expense ${saved.expenseCode} (${saved.category}) saved and included in Net Profit calculations.`
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
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <h2 className="text-xl font-extrabold text-slate-900">
          {editingId ? 'Correct Expense Entry' : 'Record Store Operating Expense'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Expense Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Rent">Rent</option>
              <option value="Electricity">Electricity</option>
              <option value="Transport">Transport</option>
              <option value="Staff Salaries">Staff Salaries</option>
              <option value="Repairs">Repairs</option>
              <option value="Packaging">Packaging</option>
              <option value="Other Business Expenses">
                Other Business Expenses
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount ({currency}) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details of expense..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold"
          >
            {editingId ? 'Update Expense' : 'Add Expense Entry'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Operating Expenses History ({data.expenses.length})
          </h3>
          <span className="text-xs font-mono font-bold text-slate-800">
            Total Operating Expenses:{' '}
            {formatCurrency(data.financials.operatingExpenses, currency)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Expense ID</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold">Description</th>
                <th className="py-3 px-3 font-semibold">Payment Method</th>
                <th className="py-3 px-3 font-semibold text-right">Amount</th>
                <th className="py-3 px-3 font-semibold">Created By</th>
                <th className="py-3 pl-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.expenses.map((exp: ExpenseRecord) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-mono font-bold text-blue-700">
                    {exp.expenseCode}
                  </td>
                  <td className="py-3 px-3 font-mono">{exp.expenseDate}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    {exp.category}
                  </td>
                  <td className="py-3 px-3 text-slate-700">{exp.description}</td>
                  <td className="py-3 px-3 text-slate-600">{exp.paymentMethod}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatCurrency(exp.amount, currency)}
                  </td>
                  <td className="py-3 px-3 text-slate-500">{exp.createdBy}</td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(exp.id);
                        setExpenseDate(exp.expenseDate);
                        setCategory(exp.category);
                        setAmount(exp.amount);
                        setDescription(exp.description);
                        setPaymentMethod(exp.paymentMethod);
                      }}
                      className="text-[#0066FF] font-semibold hover:underline"
                    >
                      Correct
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
