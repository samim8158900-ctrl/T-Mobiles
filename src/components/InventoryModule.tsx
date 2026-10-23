import React, { useMemo, useState } from 'react';
import {
  Camera,
  Download,
  Eye,
  History,
  QrCode,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  InventoryDeviceRecord,
  WorkspaceData,
  formatCurrency,
} from '../types';

interface InventoryModuleProps {
  data: WorkspaceData;
  token: string;
  onRefresh: () => Promise<void>;
  onOpenQrForDevice: (device: InventoryDeviceRecord) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  data,
  token,
  onRefresh,
  onOpenQrForDevice,
}) => {
  const currency = data.settings?.currencySymbol || '₹';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc'>('newest');

  const [selectedDevice, setSelectedDevice] = useState<InventoryDeviceRecord | null>(
    null
  );
  const [editStatus, setEditStatus] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editRemarks, setEditRemarks] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const uniqueBrands = useMemo(
    () => Array.from(new Set(data.devices.map((d) => d.brand))).sort(),
    [data.devices]
  );

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.devices
      .filter((dev) => {
        if (statusFilter !== 'All' && dev.status !== statusFilter) return false;
        if (brandFilter !== 'All' && dev.brand !== brandFilter) return false;
        if (conditionFilter !== 'All' && dev.condition !== conditionFilter) return false;
        if (supplierFilter !== 'All' && String(dev.supplierId) !== supplierFilter)
          return false;
        if (dateFilter && dev.dateReceived !== dateFilter) return false;

        if (!q) return true;
        return (
          dev.imei1.toLowerCase().includes(q) ||
          dev.imei2.toLowerCase().includes(q) ||
          dev.inventoryCode.toLowerCase().includes(q) ||
          dev.brand.toLowerCase().includes(q) ||
          dev.model.toLowerCase().includes(q) ||
          dev.purchaseInvoiceNo.toLowerCase().includes(q) ||
          dev.salesInvoiceNo.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'priceDesc') return b.sellingPrice - a.sellingPrice;
        return b.id - a.id;
      });
  }, [
    data.devices,
    searchQuery,
    statusFilter,
    brandFilter,
    conditionFilter,
    supplierFilter,
    dateFilter,
    sortBy,
  ]);

  const openDeviceModal = (dev: InventoryDeviceRecord) => {
    setSelectedDevice(dev);
    setEditStatus(dev.status);
    setEditPrice(dev.sellingPrice);
    setEditRemarks(dev.remarks);
    setEditPhoto(dev.photoUrl);
    setFeedback(null);
  };

  const handleSaveDeviceChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setUpdating(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/inventory/${selectedDevice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: editStatus,
          sellingPrice: Number(editPrice) || selectedDevice.sellingPrice,
          remarks: editRemarks,
          photoUrl: editPhoto,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to update device');
      await onRefresh();
      setSelectedDevice(updated);
      setFeedback('Inventory record and movement log updated.');
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Inventory ID',
      'IMEI 1',
      'IMEI 2',
      'Brand',
      'Model',
      'RAM',
      'Storage',
      'Color',
      'Condition',
      'Status',
      'Supplier',
      'Purchase Invoice',
      'Purchase Cost',
      'Additional Cost',
      'Landed Cost',
      'Selling Price',
      'Date Received',
      'Sales Invoice',
    ];
    const rows = filteredDevices.map((d) => [
      d.inventoryCode,
      `"${d.imei1}"`,
      `"${d.imei2}"`,
      `"${d.brand}"`,
      `"${d.model}"`,
      `"${d.ram}"`,
      `"${d.storage}"`,
      `"${d.color}"`,
      d.condition,
      d.status,
      `"${d.supplierName}"`,
      d.purchaseInvoiceNo,
      d.purchasePrice,
      d.additionalCost,
      d.landedCost,
      d.sellingPrice,
      d.dateReceived,
      d.salesInvoiceNo,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `TMobiles_IMEI_Inventory_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deviceMovements = useMemo(() => {
    if (!selectedDevice) return [];
    return data.movements.filter((m) => m.deviceId === selectedDevice.id);
  }, [data.movements, selectedDevice]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              IMEI-Based Inventory Management ({filteredDevices.length} of{' '}
              {data.devices.length} Devices)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every physical phone is individually tracked by its unique 15-digit IMEI, purchase batch, and movement history.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1628] hover:bg-slate-800 text-white text-xs font-bold transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Inventory CSV</span>
          </button>
        </div>

        {/* Status Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl">
          {[
            'All',
            'In Stock',
            'Reserved',
            'Sold',
            'Returned',
            'Damaged',
            'Under Inspection',
          ].map((st) => {
            const count =
              st === 'All'
                ? data.devices.length
                : data.devices.filter((d) => d.status === st).length;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        {/* Multi-Dimension Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IMEI, Brand, Model, Purchase Invoice, or ID..."
              aria-label="Search Inventory"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
          </div>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            aria-label="Filter by Brand"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="All">All Brands</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            aria-label="Filter by Condition"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="All">All Conditions</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
            <option value="Refurbished">Refurbished</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            aria-label="Filter by Supplier"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="All">All Suppliers</option>
            {data.suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort Inventory"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="priceDesc">Sort: Price High → Low</option>
            <option value="priceAsc">Sort: Price Low → High</option>
          </select>
        </div>

        {/* Inventory Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-3 font-semibold">Inventory ID</th>
                <th className="py-3 px-3 font-semibold">Brand &amp; Model</th>
                <th className="py-3 px-3 font-semibold">IMEI 1 / IMEI 2</th>
                <th className="py-3 px-3 font-semibold">Condition</th>
                <th className="py-3 px-3 font-semibold">Purchase Ref</th>
                <th className="py-3 px-3 font-semibold text-right">Landed Cost</th>
                <th className="py-3 px-3 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-3 font-semibold">Stock Status</th>
                <th className="py-3 pl-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No inventory devices match your active filters.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {dev.inventoryCode}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {dev.brand} {dev.model}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {dev.ram} / {dev.storage} · {dev.color}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">{dev.imei1}</div>
                      {dev.imei2 && (
                        <div className="text-[11px] text-slate-500">{dev.imei2}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{dev.condition}</td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-800">{dev.purchaseInvoiceNo}</div>
                      <div className="text-[11px] text-slate-500">{dev.supplierName}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(dev.landedCost, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatCurrency(dev.sellingPrice, currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          dev.status === 'In Stock'
                            ? 'text-emerald-700'
                            : dev.status === 'Sold'
                            ? 'text-slate-500'
                            : 'text-amber-700'
                        }`}
                      >
                        {dev.status}
                      </span>
                      {dev.salesInvoiceNo && (
                        <span className="block text-[10px] font-mono text-blue-700">
                          Sold: {dev.salesInvoiceNo}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDeviceModal(dev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenQrForDevice(dev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0066FF] font-semibold"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Details & Movement History Modal */}
      {selectedDevice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Device Details and Movement History"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-[#0066FF]">
                  {selectedDevice.inventoryCode} · QR Token: {selectedDevice.qrToken}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedDevice.brand} {selectedDevice.model} ({selectedDevice.ram}/
                  {selectedDevice.storage})
                </h3>
                <p className="text-xs text-slate-500">
                  IMEI 1: <strong className="font-mono">{selectedDevice.imei1}</strong>
                  {selectedDevice.imei2
                    ? ` · IMEI 2: ${selectedDevice.imei2}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setSelectedDevice(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900">
                {feedback}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Update Status / Price / Photo */}
              <form onSubmit={handleSaveDeviceChanges} className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Device Status &amp; Valuation
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Supplier</span>
                    <strong className="text-slate-900">
                      {selectedDevice.supplierName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Purchase Invoice</span>
                    <strong className="font-mono text-blue-700">
                      {selectedDevice.purchaseInvoiceNo}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Landed Cost</span>
                    <strong className="font-mono text-slate-900">
                      {formatCurrency(selectedDevice.landedCost, currency)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date Received</span>
                    <strong className="font-mono text-slate-900">
                      {selectedDevice.dateReceived}
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stock Status
                  </label>
                  <select
                    value={editStatus}
                    disabled={selectedDevice.status === 'Sold'}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-100"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Under Inspection">Under Inspection</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Returned">Returned</option>
                    {selectedDevice.status === 'Sold' && (
                      <option value="Sold">Sold</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Selling Price ({currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Remarks / Inspection Notes
                  </label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Photograph
                  </label>
                  {editPhoto ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={editPhoto}
                        alt="Device preview"
                        className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setEditPhoto('')}
                        className="text-xs text-red-600 font-semibold hover:underline"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700">
                      <Camera className="w-4 h-4 text-[#0066FF]" />
                      <span>Upload Mobile Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const r = new FileReader();
                          r.onload = () => {
                            if (typeof r.result === 'string') setEditPhoto(r.result);
                          };
                          r.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  {updating ? 'Saving...' : 'Save Inventory Changes'}
                </button>
              </form>

              {/* Right: Movement History Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#0066FF]" />
                  <span>IMEI Movement History ({deviceMovements.length})</span>
                </h4>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {deviceMovements.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {m.movementType}: {m.fromStatus} → {m.toStatus}
                        </span>
                        <span className="font-mono text-[11px] text-blue-700">
                          {m.referenceNo}
                        </span>
                      </div>
                      <p className="text-slate-600">{m.notes}</p>
                      <div className="text-[10px] text-slate-400">
                        By {m.performedBy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
