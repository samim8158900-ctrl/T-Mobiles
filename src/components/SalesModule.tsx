import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  InventoryDeviceRecord,
  WorkspaceData,
  formatCurrency,
} from '../types';
import { calculateSaleSummary } from '../utils/accounting';

interface SalesModuleProps {
  data: WorkspaceData;
  token: string;
  onRefresh: () => Promise<void>;
  onOpenInvoicePrint: (type: 'sale' | 'purchase', id: number) => void;
}

interface SelectedSaleDeviceLine {
  device: InventoryDeviceRecord;
  unitSellingPrice: number;
  discountAmount: number;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  data,
  token,
  onRefresh,
  onOpenInvoicePrint,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const todayStr = new Date().toISOString().slice(0, 10);

  const eligibleInStockDevices = useMemo(
    () => data.devices.filter((d) => d.status === 'In Stock'),
    [data.devices]
  );

  const [saleDate, setSaleDate] = useState(todayStr);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('+91 98800 11220');
  const [customerAddress, setCustomerAddress] = useState('Bengaluru, Karnataka');
  const [customerGstin, setCustomerGstin] = useState('');

  const [imeiOrQrLookup, setImeiOrQrLookup] = useState('');
  const [selectedDeviceIdToAdd, setSelectedDeviceIdToAdd] = useState<number>(
    eligibleInStockDevices[0]?.id || 0
  );

  const [cartLines, setCartLines] = useState<SelectedSaleDeviceLine[]>(() =>
    eligibleInStockDevices[0]
      ? [
          {
            device: eligibleInStockDevices[0],
            unitSellingPrice: eligibleInStockDevices[0].sellingPrice,
            discountAmount: 0,
          },
        ]
      : []
  );

  const [taxRate, setTaxRate] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [amountReceived, setAmountReceived] = useState<number>(
    eligibleInStockDevices[0]?.sellingPrice || 0
  );
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    saleId?: number;
  } | null>(null);

  const nextInvoiceNo = `${data.settings?.salesPrefix || 'INV-2026-'}${String(
    data.sales.length + 1
  ).padStart(3, '0')}`;

  const handleSelectCustomer = (idStr: string) => {
    setSelectedCustomerId(idStr);
    if (!idStr) return;
    const found = data.customers.find((c) => String(c.id) === idStr);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerAddress(found.address);
      setCustomerGstin(found.gstin);
    }
  };

  const addDeviceToSale = (dev: InventoryDeviceRecord) => {
    if (dev.status !== 'In Stock') {
      setStatusMsg({
        type: 'error',
        text: `Device ${dev.inventoryCode} (${dev.imei1}) has status "${dev.status}" and cannot be sold.`,
      });
      return;
    }
    if (cartLines.some((l) => l.device.id === dev.id)) {
      setStatusMsg({
        type: 'error',
        text: `IMEI ${dev.imei1} is already added to this sales invoice.`,
      });
      return;
    }
    const nextLines = [
      ...cartLines,
      {
        device: dev,
        unitSellingPrice: dev.sellingPrice,
        discountAmount: 0,
      },
    ];
    setCartLines(nextLines);
    const nextTotal = nextLines.reduce(
      (sum, l) => sum + (l.unitSellingPrice - l.discountAmount),
      0
    );
    setAmountReceived(nextTotal);
    setStatusMsg(null);
  };

  const handleLookupByImeiOrQr = (e: React.FormEvent) => {
    e.preventDefault();
    const q = imeiOrQrLookup.trim().toLowerCase();
    if (!q) return;

    const match = data.devices.find(
      (d) =>
        d.imei1.toLowerCase() === q ||
        d.imei2.toLowerCase() === q ||
        d.inventoryCode.toLowerCase() === q ||
        d.qrToken.toLowerCase() === q
    );

    if (!match) {
      setStatusMsg({
        type: 'error',
        text: `No inventory record found matching IMEI / QR "${imeiOrQrLookup}".`,
      });
      return;
    }
    addDeviceToSale(match);
    setImeiOrQrLookup('');
  };

  const updateCartLine = (
    idx: number,
    patch: Partial<{ unitSellingPrice: number; discountAmount: number }>
  ) => {
    setCartLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line))
    );
  };

  const removeCartLine = (idx: number) => {
    setCartLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const saleSummary = useMemo(() => {
    const inputs = cartLines.map((l) => ({
      deviceId: l.device.id,
      inventoryCode: l.device.inventoryCode,
      imei1: l.device.imei1,
      purchasePrice: l.device.purchasePrice,
      additionalCost: l.device.additionalCost,
      unitSellingPrice: l.unitSellingPrice,
      discountAmount: l.discountAmount,
    }));
    return calculateSaleSummary(
      inputs,
      taxRate,
      additionalCharges,
      amountReceived
    );
  }, [cartLines, taxRate, additionalCharges, amountReceived]);

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (cartLines.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'Please add at least one in-stock mobile phone to complete the sale.',
      });
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Customer Name and Contact Number are required.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          saleDate,
          customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
          customerName,
          customerPhone,
          customerAddress,
          customerGstin,
          taxRate: Number(taxRate) || 0,
          additionalCharges: Number(additionalCharges) || 0,
          paymentMethod,
          amountReceived: Number(amountReceived) || 0,
          notes,
          items: cartLines.map((l) => ({
            deviceId: l.device.id,
            unitSellingPrice: Number(l.unitSellingPrice) || 0,
            discountAmount: Number(l.discountAmount) || 0,
          })),
        }),
      });
      const created = await res.json();
      if (!res.ok) {
        throw new Error(created.error || 'Failed to create sales invoice');
      }
      await onRefresh();
      setCartLines([]);
      setNotes('');
      setStatusMsg({
        type: 'success',
        text: `Sales Invoice ${created.salesInvoiceNo} confirmed! Selected IMEIs marked as Sold and Profit/Loss recorded.`,
        saleId: created.id,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          {statusMsg.saleId && (
            <button
              type="button"
              onClick={() => onOpenInvoicePrint('sale', statusMsg.saleId!)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download Customer Bill</span>
            </button>
          )}
        </div>
      )}

      {/* Main POS & Sales Billing Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Mobile Sales &amp; POS Billing Interface
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select in-stock phones by IMEI or QR code. Automatically calculates Landed Cost, Net Revenue, and Profit/Loss.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Auto Sales Invoice:</span>
            <span className="font-mono font-bold text-sm text-[#0066FF] bg-blue-50 px-3 py-1 rounded-lg">
              {nextInvoiceNo}
            </span>
          </div>
        </div>

        {/* Customer Details Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label
              htmlFor="sale-date"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Sale Date
            </label>
            <input
              id="sale-date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label
              htmlFor="customer-lookup"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Existing Customer Lookup
            </label>
            <select
              id="customer-lookup"
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
            >
              <option value="">-- New / Walk-in Customer --</option>
              {data.customers.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="customer-name"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Customer Name *
            </label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Full Name"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label
              htmlFor="customer-phone"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Contact Number *
            </label>
            <input
              id="customer-phone"
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="customer-address"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Customer Address
            </label>
            <input
              id="customer-address"
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="City / Street Address"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        {/* Mobile Selection Bar (By IMEI / QR Scan or Dropdown) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <form
            onSubmit={handleLookupByImeiOrQr}
            className="lg:col-span-5 flex items-end gap-2"
          >
            <div className="flex-1">
              <label
                htmlFor="imei-scan-input"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Scan IMEI or QR Code
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-[#0066FF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="imei-scan-input"
                  type="text"
                  value={imeiOrQrLookup}
                  onChange={(e) => setImeiOrQrLookup(e.target.value)}
                  placeholder="Enter 15-digit IMEI or QR Token..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#0A1628] hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap shrink-0"
            >
              Add by IMEI
            </button>
          </form>

          <div className="lg:col-span-7 flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor="instock-device-select"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Or Select Eligible In-Stock Handset ({eligibleInStockDevices.length}{' '}
                Available)
              </label>
              <select
                id="instock-device-select"
                value={selectedDeviceIdToAdd}
                onChange={(e) => setSelectedDeviceIdToAdd(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                {eligibleInStockDevices.length === 0 && (
                  <option value={0}>No phones currently in stock</option>
                )}
                {eligibleInStockDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.inventoryCode} — {d.brand} {d.model} ({d.ram}/{d.storage},{' '}
                    {d.color}) · IMEI: {d.imei1} · Price:{' '}
                    {formatCurrency(d.sellingPrice, currency)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={eligibleInStockDevices.length === 0}
              onClick={() => {
                const dev = eligibleInStockDevices.find(
                  (d) => d.id === Number(selectedDeviceIdToAdd)
                );
                if (dev) addDeviceToSale(dev);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Bill</span>
            </button>
          </div>
        </div>

        {/* Cart Line Items with Per-Phone Landed Cost & Profit/Loss */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-3 font-semibold">Inventory ID &amp; IMEI</th>
                <th className="py-2.5 px-3 font-semibold">Mobile Details</th>
                <th className="py-2.5 px-3 font-semibold text-right">Landed Cost</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Unit Selling Price ({currency})
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Discount ({currency})
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Net Sale Ex-Tax
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Profit / Loss
                </th>
                <th className="py-2.5 pl-3 font-semibold text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cartLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No mobile phones added to this bill yet. Select an in-stock handset above.
                  </td>
                </tr>
              ) : (
                cartLines.map((line, idx) => {
                  const calc = saleSummary.computedItems[idx];
                  const isLoss = calc.profitOrLoss < 0;
                  return (
                    <tr key={line.device.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-3 font-mono">
                        <div className="font-bold text-blue-700">
                          {line.device.inventoryCode}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {line.device.imei1}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {line.device.brand} {line.device.model}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {line.device.ram}/{line.device.storage} · {line.device.color} ·{' '}
                          {line.device.condition}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(line.device.landedCost, currency)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={line.unitSellingPrice}
                          onChange={(e) =>
                            updateCartLine(idx, {
                              unitSellingPrice: Number(e.target.value) || 0,
                            })
                          }
                          aria-label="Unit Selling Price"
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-right text-xs"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={line.discountAmount}
                          onChange={(e) =>
                            updateCartLine(idx, {
                              discountAmount: Number(e.target.value) || 0,
                            })
                          }
                          aria-label="Discount Amount"
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-right text-xs"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(calc.netSaleAmount, currency)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold tabular-nums ${
                          isLoss ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {isLoss ? 'LOSS ' : '+'}
                        {formatCurrency(calc.profitOrLoss, currency)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          aria-label="Remove phone from bill"
                          onClick={() => removeCartLine(idx)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Payment & Accounting Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tax / GST (%)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Extra Charges ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                aria-label="Sale Payment Method"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Received ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-xs"
              />
              <button
                type="button"
                onClick={() => setAmountReceived(saleSummary.grandTotal)}
                className="text-[11px] font-semibold text-[#0066FF] hover:underline mt-1"
              >
                Full Paid ({formatCurrency(saleSummary.grandTotal, currency)})
              </button>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Invoice Notes / Warranty Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Accessories included, special warranty terms, or partial payment commitment..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Sales &amp; Profit Summary
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal ({saleSummary.totalPhones} Phones):</span>
              <span className="font-mono">
                {formatCurrency(saleSummary.subtotalAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Discount:</span>
              <span className="font-mono">
                -{formatCurrency(saleSummary.discountAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Net Sale Revenue (Ex-Tax):</span>
              <span className="font-mono font-semibold text-white">
                {formatCurrency(saleSummary.netRevenueExTax, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Tax Collected ({saleSummary.taxRate}%):</span>
              <span className="font-mono">
                +{formatCurrency(saleSummary.taxAmount, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Landed Cost:</span>
              <span className="font-mono">
                {formatCurrency(saleSummary.totalLandedCost, currency)}
              </span>
            </div>
            <div
              className={`flex justify-between text-xs font-bold ${
                saleSummary.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              <span>
                Transaction Gross {saleSummary.grossProfit >= 0 ? 'Profit' : 'Loss'}{' '}
                (Ex-Tax):
              </span>
              <span className="font-mono">
                {formatCurrency(saleSummary.grossProfit, currency)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-700 flex justify-between text-base font-extrabold">
              <span>Grand Total:</span>
              <span className="font-mono text-sky-400">
                {formatCurrency(saleSummary.grandTotal, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-amber-300 font-semibold">
              <span>Customer Balance Due:</span>
              <span className="font-mono">
                {formatCurrency(saleSummary.outstandingAmount, currency)} (
                {saleSummary.paymentStatus})
              </span>
            </div>

            <div className="pt-3">
              <button
                type="button"
                disabled={submitting || cartLines.length === 0}
                onClick={handleConfirmSale}
                className="w-full py-3.5 px-5 rounded-xl bg-[#0066FF] hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Processing Sale...'
                    : 'Confirm Sale & Generate Invoice'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Completed Sales Transactions ({data.sales.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Invoice No</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-3 font-semibold">Customer</th>
                <th className="py-3 px-3 font-semibold text-right">Qty</th>
                <th className="py-3 px-3 font-semibold text-right">Landed Cost</th>
                <th className="py-3 px-3 font-semibold text-right">Grand Total</th>
                <th className="py-3 px-3 font-semibold text-right">Gross Profit</th>
                <th className="py-3 px-3 font-semibold text-right">Due</th>
                <th className="py-3 pl-3 font-semibold text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-mono font-bold text-blue-700">
                    {s.salesInvoiceNo}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{s.saleDate}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {s.customerName}
                    <span className="block text-[11px] font-normal text-slate-500">
                      {s.customerPhone}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {s.totalPhones}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {formatCurrency(s.totalLandedCost, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatCurrency(s.grandTotal, currency)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold tabular-nums ${
                      s.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(s.grossProfit, currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-700 font-semibold">
                    {formatCurrency(s.outstandingAmount, currency)}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenInvoicePrint('sale', s.id)}
                      className="inline-flex items-center gap-1 text-[#0066FF] font-semibold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Print Bill</span>
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
