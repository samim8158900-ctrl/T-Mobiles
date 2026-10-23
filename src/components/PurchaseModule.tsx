import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  FileText,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { WorkspaceData, formatCurrency } from '../types';
import {
  calculatePurchaseSummary,
  isValidImeiFormat,
} from '../utils/accounting';

interface PurchaseModuleProps {
  data: WorkspaceData;
  token: string;
  onRefresh: () => Promise<void>;
  onOpenInvoicePrint: (type: 'sale' | 'purchase', id: number) => void;
}

interface MobileFormRow {
  brand: string;
  model: string;
  variant: string;
  ram: string;
  storage: string;
  color: string;
  imei1: string;
  imei2: string;
  serialNumber: string;
  condition: 'New' | 'Used' | 'Refurbished';
  purchasePrice: number;
  additionalCost: number;
  sellingPrice: number;
  warrantyInfo: string;
  photoUrl: string;
  remarks: string;
}

const createEmptyMobileRow = (): MobileFormRow => ({
  brand: 'Apple',
  model: 'iPhone 16',
  variant: '5G Official',
  ram: '8GB',
  storage: '128GB',
  color: 'Ultramarine',
  imei1: '',
  imei2: '',
  serialNumber: '',
  condition: 'New',
  purchasePrice: 68000,
  additionalCost: 500,
  sellingPrice: 76900,
  warrantyInfo: '1 Year Brand Warranty',
  photoUrl: '',
  remarks: '',
});

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({
  data,
  token,
  onRefresh,
  onOpenInvoicePrint,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const todayStr = new Date().toISOString().slice(0, 10);

  const activeSuppliers = useMemo(
    () => data.suppliers.filter((s) => s.status === 'Active'),
    [data.suppliers]
  );

  const [purchaseDate, setPurchaseDate] = useState(todayStr);
  const [supplierId, setSupplierId] = useState<number>(
    activeSuppliers[0]?.id || data.suppliers[0]?.id || 1
  );
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<number>(68500);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<MobileFormRow[]>([createEmptyMobileRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    purchaseId?: number;
  } | null>(null);

  // Quick Add Supplier Modal State
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupBiz, setNewSupBiz] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupCity, setNewSupCity] = useState('Bengaluru');

  const selectedSupplier = useMemo(
    () => data.suppliers.find((s) => s.id === Number(supplierId)),
    [data.suppliers, supplierId]
  );

  const nextPurchaseCode = `${data.settings?.purchasePrefix || 'PUR-2026-'}${String(
    data.purchases.length + 1
  ).padStart(3, '0')}`;

  const summary = useMemo(
    () => calculatePurchaseSummary(items, discountAmount, taxAmount, amountPaid),
    [items, discountAmount, taxAmount, amountPaid]
  );

  const updateRow = (index: number, patch: Partial<MobileFormRow>) => {
    setItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const addAnotherMobile = () => {
    setItems((prev) => [...prev, createEmptyMobileRow()]);
  };

  const removeMobileRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const generateValidRandomImei = (index: number, field: 'imei1' | 'imei2') => {
    const random15 =
      '35' +
      String(Math.floor(1000000000000 + Math.random() * 8999999999999)).slice(0, 13);
    updateRow(index, { [field]: random15 });
  };

  const handlePhotoUpload = (index: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateRow(index, { photoUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupPhone.trim()) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newSupName,
          businessName: newSupBiz,
          phone: newSupPhone,
          city: newSupCity,
          status: 'Active',
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Failed to add supplier');
      await onRefresh();
      setSupplierId(saved.id);
      setShowQuickSupplier(false);
      setNewSupName('');
      setNewSupBiz('');
      setNewSupPhone('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleSavePurchase = async (isDraft: boolean) => {
    setStatusMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchaseDate,
          supplierId: Number(supplierId),
          supplierInvoiceNo,
          paymentMethod,
          discountAmount: Number(discountAmount) || 0,
          taxAmount: Number(taxAmount) || 0,
          amountPaid: Number(amountPaid) || 0,
          notes,
          isDraft,
          items,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save purchase');
      }
      await onRefresh();
      setStatusMsg({
        type: 'success',
        text: isDraft
          ? `Draft purchase ${result.purchaseInvoiceNo} saved. Confirm it below when stock arrives.`
          : `Purchase ${result.purchaseInvoiceNo} confirmed! ${items.length} mobile device(s) added to IMEI inventory with unique QR codes.`,
        purchaseId: result.id,
      });
      setItems([createEmptyMobileRow()]);
      setSupplierInvoiceNo('');
      setNotes('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDraft = async (id: number) => {
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/purchases/${id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to confirm draft');
      await onRefresh();
      setStatusMsg({
        type: 'success',
        text: 'Draft purchase confirmed and devices added to stock!',
        purchaseId: id,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusMsg && (
        <div
          role="alert"
          className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
          {statusMsg.purchaseId && (
            <button
              type="button"
              onClick={() => onOpenInvoicePrint('purchase', statusMsg.purchaseId!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download Purchase Invoice</span>
            </button>
          )}
        </div>
      )}

      {/* Main Purchase Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Mobile Purchase Entry (Single &amp; Multi-IMEI Inward)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record phones purchased from suppliers or agents. Every phone is assigned a unique IMEI &amp; QR code.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Auto Purchase ID:</span>
            <span className="font-mono font-bold text-sm text-[#0066FF] bg-blue-50 px-3 py-1 rounded-lg">
              {nextPurchaseCode}
            </span>
          </div>
        </div>

        {/* Section 1: Purchase & Supplier Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label
              htmlFor="purchase-date"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Purchase Date
            </label>
            <input
              id="purchase-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="purchase-supplier"
                className="block text-xs font-bold text-slate-700"
              >
                Supplier / Agent Selection
              </label>
              <button
                type="button"
                onClick={() => setShowQuickSupplier((prev) => !prev)}
                className="text-xs font-semibold text-[#0066FF] hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Supplier</span>
              </button>
            </div>
            <select
              id="purchase-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            >
              {data.suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name} — {sup.businessName || 'Agent'} ({sup.phone})
                </option>
              ))}
            </select>
            {selectedSupplier && (
              <div className="mt-1.5 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                <span>Contact: {selectedSupplier.phone}</span>
                <span>·</span>
                <span>City: {selectedSupplier.city || 'N/A'}</span>
                <span>·</span>
                <span>
                  Current Payable:{' '}
                  <strong className="font-mono text-slate-800">
                    {formatCurrency(selectedSupplier.outstandingBalance, currency)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="supplier-invoice-no"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Supplier Invoice No. (Optional)
            </label>
            <input
              id="supplier-invoice-no"
              type="text"
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
              placeholder="e.g. APEX/26/9012"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
          </div>
        </div>

        {/* Optional Quick Add Supplier Inline Form */}
        {showQuickSupplier && (
          <form
            onSubmit={handleQuickCreateSupplier}
            className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Supplier Name *
              </label>
              <input
                type="text"
                required
                value={newSupName}
                onChange={(e) => setNewSupName(e.target.value)}
                placeholder="Agent Name"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={newSupBiz}
                onChange={(e) => setNewSupBiz(e.target.value)}
                placeholder="Company / Agency"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Contact Number *
              </label>
              <input
                type="text"
                required
                value={newSupPhone}
                onChange={(e) => setNewSupPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={newSupCity}
                onChange={(e) => setNewSupCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0066FF] text-white text-xs font-bold hover:bg-blue-700"
              >
                Save Supplier
              </button>
              <button
                type="button"
                onClick={() => setShowQuickSupplier(false)}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Section 2: Mobile Phones Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              Mobile Handset Details ({items.length}{' '}
              {items.length === 1 ? 'Device' : 'Devices'})
            </h3>
            <button
              type="button"
              onClick={addAnotherMobile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Mobile</span>
            </button>
          </div>

          {items.map((item, idx) => {
            const imei1Valid = isValidImeiFormat(item.imei1);
            const landed =
              (Number(item.purchasePrice) || 0) + (Number(item.additionalCost) || 0);

            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-[#0066FF] uppercase">
                      Mobile #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-500">
                      Landed Cost:{' '}
                      <strong className="font-mono text-slate-900">
                        {formatCurrency(landed, currency)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generateValidRandomImei(idx, 'imei1')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
                    >
                      <Sparkles className="w-3 h-3 text-[#0066FF]" />
                      <span>Generate Valid 15-Digit IMEI</span>
                    </button>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMobileRow(idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Brand *
                    </label>
                    <input
                      type="text"
                      value={item.brand}
                      onChange={(e) => updateRow(idx, { brand: e.target.value })}
                      placeholder="Apple / Samsung"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Model Name *
                    </label>
                    <input
                      type="text"
                      value={item.model}
                      onChange={(e) => updateRow(idx, { model: e.target.value })}
                      placeholder="e.g. iPhone 16 Pro / Galaxy S24"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Variant
                    </label>
                    <input
                      type="text"
                      value={item.variant}
                      onChange={(e) => updateRow(idx, { variant: e.target.value })}
                      placeholder="5G Global"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      RAM / Storage
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={item.ram}
                        onChange={(e) => updateRow(idx, { ram: e.target.value })}
                        placeholder="8GB"
                        aria-label="RAM"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={item.storage}
                        onChange={(e) => updateRow(idx, { storage: e.target.value })}
                        placeholder="256GB"
                        aria-label="Storage"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Colour
                    </label>
                    <input
                      type="text"
                      value={item.color}
                      onChange={(e) => updateRow(idx, { color: e.target.value })}
                      placeholder="Titanium"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Row 2: IMEIs, Serial, Condition, Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        IMEI 1 (15 Digits) *
                      </label>
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          imei1Valid ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {item.imei1.length}/15 digits
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      value={item.imei1}
                      onChange={(e) =>
                        updateRow(idx, { imei1: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="Enter 15-digit IMEI 1"
                      className={`w-full px-3 py-2 rounded-lg border font-mono text-xs bg-white ${
                        item.imei1.length > 0 && !imei1Valid
                          ? 'border-amber-400'
                          : 'border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      IMEI 2 (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={item.imei2}
                      onChange={(e) =>
                        updateRow(idx, { imei2: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="15-digit IMEI 2"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Condition
                    </label>
                    <select
                      value={item.condition}
                      onChange={(e) =>
                        updateRow(idx, { condition: e.target.value as any })
                      }
                      aria-label="Condition"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      <option value="New">New</option>
                      <option value="Used">Used</option>
                      <option value="Refurbished">Refurbished</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Purchase Price ({currency}) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.purchasePrice}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        updateRow(idx, { purchasePrice: val });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Additional Cost ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.additionalCost}
                      onChange={(e) =>
                        updateRow(idx, { additionalCost: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Row 3: Selling Price, Warranty, Photo Upload, Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Target Selling Price ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={item.sellingPrice}
                      onChange={(e) =>
                        updateRow(idx, { sellingPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Warranty Information
                    </label>
                    <input
                      type="text"
                      value={item.warrantyInfo}
                      onChange={(e) => updateRow(idx, { warrantyInfo: e.target.value })}
                      placeholder="1 Year Brand Warranty"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Remarks / Serial No
                    </label>
                    <input
                      type="text"
                      value={item.remarks}
                      onChange={(e) => updateRow(idx, { remarks: e.target.value })}
                      placeholder="Box sealed / QC checked"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Device Photo
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 w-full justify-center">
                        <Camera className="w-3.5 h-3.5 text-[#0066FF]" />
                        <span className="truncate">
                          {item.photoUrl ? 'Replace Photo' : 'Upload Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handlePhotoUpload(idx, e.target.files?.[0] || null)
                          }
                        />
                      </label>
                      {item.photoUrl && (
                        <button
                          type="button"
                          onClick={() => updateRow(idx, { photoUrl: '' })}
                          className="text-xs text-red-600 font-semibold hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {item.photoUrl && (
                  <div className="pt-2 flex items-center gap-3">
                    <img
                      src={item.photoUrl}
                      alt={`${item.brand} ${item.model}`}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                    />
                    <span className="text-xs text-emerald-700 font-medium">
                      Device photograph attached and ready for inventory record.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section 3: Payment & Purchase Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                aria-label="Payment Method"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
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
                Discount ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Paid Now ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold"
              />
              <button
                type="button"
                onClick={() => setAmountPaid(summary.grandTotal)}
                className="text-[11px] font-semibold text-[#0066FF] hover:underline mt-1"
              >
                Set Full Amount ({formatCurrency(summary.grandTotal, currency)})
              </button>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purchase Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional supplier delivery notes, credit terms, or batch remarks..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Live Purchase Summary Box */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Purchase Summary
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Number of Phones:</span>
              <span className="font-mono font-bold text-white">
                {summary.totalPhones} Units
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal Purchase Cost:</span>
              <span className="font-mono">
                {formatCurrency(summary.subtotalAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Additional Costs Allocated:</span>
              <span className="font-mono">
                {formatCurrency(summary.additionalCostTotal, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Discount:</span>
              <span className="font-mono">
                -{formatCurrency(summary.discountAmount, currency)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-extrabold">
              <span>Grand Total:</span>
              <span className="font-mono text-sky-400">
                {formatCurrency(summary.grandTotal, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-emerald-400 font-semibold">
              <span>Amount Paid:</span>
              <span className="font-mono">
                {formatCurrency(summary.amountPaid, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-amber-300 font-semibold">
              <span>Remaining Supplier Balance:</span>
              <span className="font-mono">
                {formatCurrency(summary.outstandingAmount, currency)} (
                {summary.paymentStatus})
              </span>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSavePurchase(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : 'Confirm Purchase'}</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSavePurchase(true)}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recorded Purchases &amp; Goods Received History ({data.purchases.length})
            </h3>
            <p className="text-xs text-slate-500">
              Click any purchase invoice to view itemized IMEIs, print Goods Received Receipt, or confirm a draft.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Purchase ID</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Supplier</th>
                <th className="py-3 px-3 font-semibold text-right">Phones</th>
                <th className="py-3 px-3 font-semibold text-right">Grand Total</th>
                <th className="py-3 px-3 font-semibold text-right">Paid</th>
                <th className="py-3 px-3 font-semibold text-right">Balance Due</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 pl-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-mono font-bold text-blue-700">
                    {p.purchaseInvoiceNo}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{p.purchaseDate}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {p.supplierName}
                    {p.supplierInvoiceNo && (
                      <span className="block text-[11px] font-normal text-slate-500">
                        Ref: {p.supplierInvoiceNo}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {p.totalPhones}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatCurrency(p.grandTotal, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700">
                    {formatCurrency(p.amountPaid, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                    {formatCurrency(p.outstandingAmount, currency)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-700">
                      {p.status} · {p.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right space-x-2 whitespace-nowrap">
                    {p.status === 'Draft' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmDraft(p.id)}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                      >
                        Confirm Draft
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenInvoicePrint('purchase', p.id)}
                      className="inline-flex items-center gap-1 text-[#0066FF] font-semibold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice / PDF</span>
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
