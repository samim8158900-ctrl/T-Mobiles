import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckSquare,
  Download,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Square,
} from 'lucide-react';
import {
  InventoryDeviceRecord,
  WorkspaceData,
  formatCurrency,
} from '../types';

interface QrGeneratorModuleProps {
  data: WorkspaceData;
  initialDevice?: InventoryDeviceRecord | null;
}

export const QrGeneratorModule: React.FC<QrGeneratorModuleProps> = ({
  data,
  initialDevice,
}) => {
  const currency = data.settings?.currencySymbol || '₹';
  const storeName = data.settings?.storeName || 'T Mobiles';

  const [selectedDevice, setSelectedDevice] = useState<InventoryDeviceRecord | null>(
    initialDevice || data.devices[0] || null
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedIdsForBatch, setSelectedIdsForBatch] = useState<number[]>(
    data.devices.slice(0, 4).map((d) => d.id)
  );
  const [batchQrMap, setBatchQrMap] = useState<Record<number, string>>({});
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<InventoryDeviceRecord | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [labelSalt, setLabelSalt] = useState(0);

  useEffect(() => {
    if (initialDevice) {
      setSelectedDevice(initialDevice);
    }
  }, [initialDevice]);

  // Generate QR PNG for selected device
  useEffect(() => {
    if (!selectedDevice) return;
    const payload = JSON.stringify({
      store: storeName,
      invId: selectedDevice.inventoryCode,
      qrToken: selectedDevice.qrToken,
      url: `${window.location.origin}/?qr=${encodeURIComponent(selectedDevice.qrToken)}`,
    });
    QRCode.toDataURL(payload, {
      width: 260,
      margin: 2,
      color: { dark: '#0A1628', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [selectedDevice, storeName, labelSalt]);

  // Generate QR PNGs for batch selected devices
  useEffect(() => {
    let active = true;
    (async () => {
      const nextMap: Record<number, string> = {};
      for (const dev of data.devices) {
        if (selectedIdsForBatch.includes(dev.id)) {
          const payload = `TMOBILES|${dev.inventoryCode}|${dev.qrToken}`;
          nextMap[dev.id] = await QRCode.toDataURL(payload, {
            width: 160,
            margin: 1,
            color: { dark: '#0A1628', light: '#FFFFFF' },
          });
        }
      }
      if (active) setBatchQrMap(nextMap);
    })();
    return () => {
      active = false;
    };
  }, [selectedIdsForBatch, data.devices]);

  const handleDownloadPng = () => {
    if (!selectedDevice || !qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${selectedDevice.inventoryCode}_${selectedDevice.imei1}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleScanLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    const q = scanInput.trim().toLowerCase();
    if (!q) {
      setScanError('Enter a QR Token, Inventory ID (e.g. TM-INV-1002), or 15-digit IMEI to locate.');
      return;
    }

    const found = data.devices.find(
      (d) =>
        d.qrToken.toLowerCase() === q ||
        d.inventoryCode.toLowerCase() === q ||
        d.imei1.toLowerCase() === q ||
        d.imei2.toLowerCase() === q ||
        q.includes(d.qrToken.toLowerCase()) ||
        q.includes(d.inventoryCode.toLowerCase())
    );

    if (!found) {
      setScanResult(null);
      setScanError(`No inventory record matched "${scanInput}".`);
    } else {
      setScanResult(found);
      setSelectedDevice(found);
    }
  };

  const toggleBatchDevice = (id: number) => {
    setSelectedIdsForBatch((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const batchDevices = useMemo(
    () => data.devices.filter((d) => selectedIdsForBatch.includes(d.id)),
    [data.devices, selectedIdsForBatch]
  );

  return (
    <div className="space-y-6">
      {/* QR Code Scanner / Instant Locator Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-[#0066FF]" />
              <span>IMEI QR Code Generator, Thermal Label Printer &amp; Scanner</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each QR code encodes a secure T Mobiles inventory identifier (never passwords or private secrets).
            </p>
          </div>

          <form
            onSubmit={handleScanLookup}
            className="flex items-center gap-2 w-full lg:w-auto"
          >
            <div className="relative flex-1 lg:w-80">
              <ScanLine className="w-4 h-4 text-[#0066FF] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan QR Token, TM-INV-1002, or IMEI..."
                aria-label="Scan QR or IMEI"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap shrink-0"
            >
              Locate Mobile
            </button>
          </form>
        </div>

        {scanError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {scanError}
          </div>
        )}

        {scanResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-bold text-emerald-900 block">
                QR Scan Verified: {scanResult.inventoryCode} — {scanResult.brand}{' '}
                {scanResult.model}
              </span>
              <span className="text-emerald-800 font-mono">
                IMEI 1: {scanResult.imei1} · Status: {scanResult.status} · Purchase Ref:{' '}
                {scanResult.purchaseInvoiceNo}
              </span>
            </div>
            <span className="font-mono font-extrabold text-sm text-emerald-900">
              {formatCurrency(scanResult.sellingPrice, currency)}
            </span>
          </div>
        )}
      </div>

      {/* Main Split: Single QR Label Inspector + Multi-Label Selection & Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Selected Device QR Preview & Actions */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-5">
          <div>
            <label
              htmlFor="qr-device-select"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Select Saved Inventory Mobile
            </label>
            <select
              id="qr-device-select"
              value={selectedDevice?.id || ''}
              onChange={(e) => {
                const dev = data.devices.find((d) => d.id === Number(e.target.value));
                if (dev) setSelectedDevice(dev);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-medium"
            >
              {data.devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.inventoryCode} — {d.brand} {d.model} (IMEI: {d.imei1}) [{d.status}]
                </option>
              ))}
            </select>
          </div>

          {selectedDevice && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#0A1628]">
                {storeName} — Verified IMEI Label
              </div>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${selectedDevice.inventoryCode}`}
                  className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xs"
                />
              )}
              <div className="space-y-0.5">
                <div className="text-sm font-extrabold text-slate-900">
                  {selectedDevice.brand} {selectedDevice.model}
                </div>
                <div className="text-xs text-slate-600">
                  {selectedDevice.ram} / {selectedDevice.storage} · {selectedDevice.color} (
                  {selectedDevice.condition})
                </div>
                <div className="text-xs font-mono font-bold text-blue-700 pt-1">
                  ID: {selectedDevice.inventoryCode} · {selectedDevice.status}
                </div>
                <div className="text-xs font-mono text-slate-700">
                  IMEI: {selectedDevice.imei1}
                </div>
                <div className="text-[11px] text-slate-500">
                  Purchase Ref: {selectedDevice.purchaseInvoiceNo}
                </div>
                <div className="text-base font-extrabold font-mono text-slate-900 pt-1">
                  MRP / Price: {formatCurrency(selectedDevice.sellingPrice, currency)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="py-2.5 px-3 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2.5 px-3 rounded-xl bg-[#0A1628] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Label(s)</span>
            </button>
            <button
              type="button"
              onClick={() => setLabelSalt((s) => s + 1)}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* Right: Multi-Label Print Sheet Builder */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Batch QR Label Sheet ({batchDevices.length} Selected)
              </h3>
              <p className="text-xs text-slate-500">
                Select devices below to print multiple thermal QR labels on a single sheet.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIdsForBatch(data.devices.map((d) => d.id))}
                className="text-xs font-semibold text-[#0066FF] hover:underline"
              >
                Select All
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSelectedIdsForBatch([])}
                className="text-xs font-semibold text-slate-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Selection checklist */}
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {data.devices.map((dev) => {
              const checked = selectedIdsForBatch.includes(dev.id);
              return (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => toggleBatchDevice(dev.id)}
                  className="w-full px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-50 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-[#0066FF]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-mono font-bold text-blue-700">
                      {dev.inventoryCode}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {dev.brand} {dev.model}
                    </span>
                    <span className="font-mono text-slate-500">({dev.imei1})</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-700">
                    {dev.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Printable Batch QR Label Sheet */}
          <div id="printable-area" className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {batchDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-3.5 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center gap-3.5"
                >
                  {batchQrMap[dev.id] && (
                    <img
                      src={batchQrMap[dev.id]}
                      alt={dev.inventoryCode}
                      className="w-20 h-20 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1 text-xs space-y-0.5">
                    <div className="font-extrabold text-[#0A1628] uppercase tracking-wider text-[10px]">
                      {storeName}
                    </div>
                    <div className="font-bold text-slate-900 truncate">
                      {dev.brand} {dev.model}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {dev.ram}/{dev.storage} · {dev.color}
                    </div>
                    <div className="font-mono text-[11px] font-bold text-blue-700">
                      {dev.inventoryCode}
                    </div>
                    <div className="font-mono text-[10px] text-slate-700">
                      IMEI: {dev.imei1}
                    </div>
                    <div className="font-mono font-extrabold text-slate-900">
                      {formatCurrency(dev.sellingPrice, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
