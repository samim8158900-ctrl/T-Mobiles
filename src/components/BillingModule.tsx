import React, { useMemo, useState } from 'react';
import {
  FileText,
  Printer,
  RotateCcw,
  Search,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { WorkspaceData, formatCurrency } from '../types';

interface BillingModuleProps {
  data: WorkspaceData;
  token: string;
  initialDocType?: 'sale' | 'purchase';
  initialDocId?: number | null;
  onRefresh: () => Promise<void>;
}

export const BillingModule: React.FC<BillingModuleProps> = ({
  data,
  token,
  initialDocType = 'sale',
  initialDocId = null,
  onRefresh,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const [docTab, setDocTab] = useState<'sale' | 'purchase' | 'receipt'>(
    initialDocType
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSaleId, setSelectedSaleId] = useState<number>(
    initialDocType === 'sale' && initialDocId
      ? initialDocId
      : data.sales[0]?.id || 0
  );
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number>(
    initialDocType === 'purchase' && initialDocId
      ? initialDocId
      : data.purchases[0]?.id || 0
  );
  const [selectedPaymentId, setSelectedPaymentId] = useState<number>(
    data.payments[0]?.id || 0
  );

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnStatus, setReturnStatus] = useState<'In Stock' | 'Returned' | 'Damaged'>('In Stock');
  const [returnReason, setReturnReason] = useState('Customer exchange / return');
  const [returnMsg, setReturnMsg] = useState<string | null>(null);

  const selectedSale = useMemo(
    () => data.sales.find((s) => s.id === Number(selectedSaleId)) || data.sales[0],
    [data.sales, selectedSaleId]
  );

  const selectedSaleItems = useMemo(
    () =>
      selectedSale
        ? data.saleItems.filter((item) => item.saleId === selectedSale.id)
        : [],
    [data.saleItems, selectedSale]
  );

  const selectedPurchase = useMemo(
    () =>
      data.purchases.find((p) => p.id === Number(selectedPurchaseId)) ||
      data.purchases[0],
    [data.purchases, selectedPurchaseId]
  );

  const selectedPurchaseItems = useMemo(
    () =>
      selectedPurchase
        ? data.purchaseItems.filter((item) => item.purchaseId === selectedPurchase.id)
        : [],
    [data.purchaseItems, selectedPurchase]
  );

  const selectedPayment = useMemo(
    () =>
      data.payments.find((p) => p.id === Number(selectedPaymentId)) ||
      data.payments[0],
    [data.payments, selectedPaymentId]
  );

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setReturnMsg(null);
    try {
      const res = await fetch(`/api/sales/${selectedSale.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restockStatus: returnStatus,
          reason: returnReason,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to process return');
      await onRefresh();
      setShowReturnModal(false);
      setReturnMsg(
        `Return recorded for ${selectedSale.salesInvoiceNo}. Handsets updated to "${returnStatus}".`
      );
    } catch (err: any) {
      setReturnMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Document Selector & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Billing, Invoices &amp; Official Receipts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate, print, and download Sales Invoices, Purchase Goods Received Receipts, and Payment Vouchers.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setDocTab('sale')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                docTab === 'sale'
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Sales Invoices ({data.sales.length})
            </button>
            <button
              type="button"
              onClick={() => setDocTab('purchase')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                docTab === 'purchase'
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Purchase Invoices ({data.purchases.length})
            </button>
            <button
              type="button"
              onClick={() => setDocTab('receipt')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                docTab === 'receipt'
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Payment Receipts ({data.payments.length})
            </button>
          </div>
        </div>

        {returnMsg && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900">
            {returnMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter invoices by Invoice Number or Party Name..."
              aria-label="Filter Invoices"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="md:col-span-5">
            {docTab === 'sale' && (
              <select
                value={selectedSale?.id || ''}
                onChange={(e) => setSelectedSaleId(Number(e.target.value))}
                aria-label="Select Sales Invoice"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                {data.sales
                  .filter(
                    (s) =>
                      !searchQuery ||
                      s.salesInvoiceNo
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      s.customerName
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.salesInvoiceNo} — {s.customerName} ({s.saleDate}) ·{' '}
                      {formatCurrency(s.grandTotal, currency)} [{s.status}]
                    </option>
                  ))}
              </select>
            )}

            {docTab === 'purchase' && (
              <select
                value={selectedPurchase?.id || ''}
                onChange={(e) => setSelectedPurchaseId(Number(e.target.value))}
                aria-label="Select Purchase Invoice"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                {data.purchases
                  .filter(
                    (p) =>
                      !searchQuery ||
                      p.purchaseInvoiceNo
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      p.supplierName
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.purchaseInvoiceNo} — {p.supplierName} ({p.purchaseDate}) ·{' '}
                      {formatCurrency(p.grandTotal, currency)} [{p.status}]
                    </option>
                  ))}
              </select>
            )}

            {docTab === 'receipt' && (
              <select
                value={selectedPayment?.id || ''}
                onChange={(e) => setSelectedPaymentId(Number(e.target.value))}
                aria-label="Select Payment Receipt"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                {data.payments
                  .filter(
                    (p) =>
                      !searchQuery ||
                      p.paymentCode
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      p.partyName
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.paymentCode} — {p.partyName} ({p.paymentType}) ·{' '}
                      {formatCurrency(p.amount, currency)}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Document Canvas */}
      <div
        id="printable-area"
        className="bg-white rounded-2xl border border-slate-200 p-8 max-w-4xl mx-auto shadow-xs space-y-6"
      >
        {/* Document Header with T Mobiles Branding */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
          <div className="space-y-1.5">
            <BrandLogo
              theme="light"
              size="md"
              storeName={data.settings?.storeName || 'T Mobiles'}
            />
            <p className="text-xs text-slate-600 pt-1">
              {data.settings?.address}
              <br />
              {data.settings?.cityStatePin}
            </p>
            <p className="text-xs font-mono text-slate-700">
              Phone: {data.settings?.phone} · Email: {data.settings?.email}
              {data.settings?.gstin ? ` · GSTIN: ${data.settings.gstin}` : ''}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-lg font-extrabold uppercase tracking-wider text-[#0A1628]">
              {docTab === 'sale'
                ? 'SALES INVOICE / CUSTOMER BILL'
                : docTab === 'purchase'
                ? 'PURCHASE INVOICE / GOODS RECEIVED'
                : 'OFFICIAL PAYMENT RECEIPT'}
            </div>
            {docTab === 'sale' && selectedSale && (
              <>
                <div className="text-sm font-mono font-bold text-[#0066FF]">
                  Invoice No: {selectedSale.salesInvoiceNo}
                </div>
                <div className="text-xs font-mono text-slate-600">
                  Date: {selectedSale.saleDate}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Status: {selectedSale.status} ({selectedSale.paymentStatus})
                </div>
              </>
            )}
            {docTab === 'purchase' && selectedPurchase && (
              <>
                <div className="text-sm font-mono font-bold text-[#0066FF]">
                  Purchase No: {selectedPurchase.purchaseInvoiceNo}
                </div>
                <div className="text-xs font-mono text-slate-600">
                  Date: {selectedPurchase.purchaseDate}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Status: {selectedPurchase.status} ({selectedPurchase.paymentStatus})
                </div>
              </>
            )}
            {docTab === 'receipt' && selectedPayment && (
              <>
                <div className="text-sm font-mono font-bold text-[#0066FF]">
                  Receipt No: {selectedPayment.paymentCode}
                </div>
                <div className="text-xs font-mono text-slate-600">
                  Date: {selectedPayment.paymentDate}
                </div>
              </>
            )}
          </div>
        </div>

        {/* SALES INVOICE CONTENT */}
        {docTab === 'sale' && selectedSale && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="font-bold uppercase text-slate-400 text-[10px]">
                  Billed To Customer
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedSale.customerName}
                </div>
                <div className="font-mono text-slate-700">
                  Phone: {selectedSale.customerPhone}
                </div>
                {selectedSale.customerAddress && (
                  <div className="text-slate-600">{selectedSale.customerAddress}</div>
                )}
              </div>
              <div className="sm:text-right">
                <div className="font-bold uppercase text-slate-400 text-[10px]">
                  Payment &amp; Billing Summary
                </div>
                <div className="mt-0.5">
                  Payment Mode: <strong>{selectedSale.paymentMethod}</strong>
                </div>
                <div>
                  Billed By: <strong>{selectedSale.createdBy}</strong>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-100 text-slate-700">
                    <th className="py-2.5 px-3 font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">Mobile Description</th>
                    <th className="py-2.5 px-3 font-bold">IMEI 1 / IMEI 2</th>
                    <th className="py-2.5 px-3 font-bold">Warranty</th>
                    <th className="py-2.5 px-3 font-bold text-right">Unit Price</th>
                    <th className="py-2.5 px-3 font-bold text-right">Discount</th>
                    <th className="py-2.5 px-3 font-bold text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedSaleItems.map((item, i) => (
                    <tr key={item.id}>
                      <td className="py-3 px-3 font-mono">{i + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {item.brand} {item.model} ({item.condition})
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {item.ram} / {item.storage} · {item.color} · ID:{' '}
                          {item.inventoryCode}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-900">{item.imei1}</div>
                        {item.imei2 && (
                          <div className="text-[11px] text-slate-500">{item.imei2}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.warrantyDetails}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(item.unitSellingPrice, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(item.discountAmount, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(item.netSaleAmount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 border-t border-slate-200">
              <div className="sm:col-span-7 text-xs space-y-2 text-slate-600">
                <div className="font-bold text-slate-900">
                  Warranty &amp; Return Terms:
                </div>
                <p className="whitespace-pre-line text-[11px] leading-relaxed">
                  {data.settings?.warrantyTerms}
                </p>
                {selectedSale.notes && (
                  <p className="text-slate-800 font-medium pt-1">
                    Remarks: {selectedSale.notes}
                  </p>
                )}
              </div>

              <div className="sm:col-span-5 space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedSale.subtotalAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Discount:</span>
                  <span className="font-mono">
                    -{formatCurrency(selectedSale.discountAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Applicable Tax ({selectedSale.taxRate}%):
                  </span>
                  <span className="font-mono">
                    +{formatCurrency(selectedSale.taxAmount, currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedSale.grandTotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedSale.amountReceived, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedSale.outstandingAmount, currency)}
                  </span>
                </div>
              </div>
            </div>

            {selectedSale.status === 'Completed' && (
              <div className="no-print pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Process Sales Return / Credit Adjustment</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* PURCHASE INVOICE CONTENT */}
        {docTab === 'purchase' && selectedPurchase && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="font-bold uppercase text-slate-400 text-[10px]">
                  Purchased From Supplier / Agent
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedPurchase.supplierName}
                </div>
                <div className="font-mono text-slate-700">
                  Phone: {selectedPurchase.supplierPhone}
                </div>
                {selectedPurchase.supplierInvoiceNo && (
                  <div className="font-mono text-slate-600">
                    Supplier Ref Invoice: {selectedPurchase.supplierInvoiceNo}
                  </div>
                )}
              </div>
              <div className="sm:text-right">
                <div className="font-bold uppercase text-slate-400 text-[10px]">
                  Inward Details
                </div>
                <div className="mt-0.5">
                  Payment Method: <strong>{selectedPurchase.paymentMethod}</strong>
                </div>
                <div>
                  Recorded By: <strong>{selectedPurchase.createdBy}</strong>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-100 text-slate-700">
                    <th className="py-2.5 px-3 font-bold">Inventory ID</th>
                    <th className="py-2.5 px-3 font-bold">Mobile Details</th>
                    <th className="py-2.5 px-3 font-bold">IMEI 1 / IMEI 2</th>
                    <th className="py-2.5 px-3 font-bold text-right">Purchase Cost</th>
                    <th className="py-2.5 px-3 font-bold text-right">Addl Cost</th>
                    <th className="py-2.5 px-3 font-bold text-right">Landed Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedPurchaseItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {item.inventoryCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">
                          {item.brand} {item.model} ({item.condition})
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {item.ram}/{item.storage} · {item.color}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div>{item.imei1}</div>
                        {item.imei2 && (
                          <div className="text-[11px] text-slate-500">{item.imei2}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(item.purchasePrice, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(item.additionalCost, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(item.landedCost, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedPurchase.subtotalAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Charges:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedPurchase.additionalCostTotal, currency)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-extrabold">
                  <span>Grand Total:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedPurchase.grandTotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedPurchase.amountPaid, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Supplier Balance Due:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedPurchase.outstandingAmount, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT RECEIPT CONTENT */}
        {docTab === 'receipt' && selectedPayment && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Voucher Type</span>
                <strong className="text-base text-slate-900">
                  {selectedPayment.paymentType}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Party Name</span>
                <strong className="text-base text-slate-900">
                  {selectedPayment.partyName} ({selectedPayment.partyPhone})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Linked Invoice</span>
                <strong className="font-mono text-blue-700">
                  {selectedPayment.invoiceNo || 'Direct Account Settlement'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Method &amp; Ref</span>
                <strong className="font-mono text-slate-900">
                  {selectedPayment.paymentMethod}{' '}
                  {selectedPayment.transactionRef
                    ? `(${selectedPayment.transactionRef})`
                    : ''}
                </strong>
              </div>
              <div className="sm:col-span-2 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">
                  Total Amount Verified:
                </span>
                <span className="text-2xl font-extrabold font-mono text-emerald-700">
                  {formatCurrency(selectedPayment.amount, currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Signature & Footer Block */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 text-xs">
          <div className="text-slate-500 max-w-md">
            {data.settings?.invoiceFooter}
          </div>
          <div className="text-right">
            <div className="w-44 border-b border-slate-400 mb-1.5 ml-auto" />
            <div className="font-bold text-slate-800">
              Authorized Signatory — {data.settings?.storeName || 'T Mobiles'}
            </div>
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedSale && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 no-print"
        >
          <form
            onSubmit={handleProcessReturn}
            className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-lg font-extrabold text-slate-900">
              Process Sales Return ({selectedSale.salesInvoiceNo})
            </h3>
            <p className="text-xs text-slate-600">
              This will mark invoice {selectedSale.salesInvoiceNo} as Returned, adjust customer balances, and update the IMEI inventory status.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Returned Handset Inventory Status
              </label>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="In Stock">Restock as Available (In Stock)</option>
                <option value="Returned">Hold as Returned</option>
                <option value="Damaged">Mark as Damaged</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Return / Credit Reason *
              </label>
              <input
                type="text"
                required
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Confirm Return
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
