import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  drawQRCodeToCanvas,
  downloadQRCodePNG,
  generateTableDineInUrl,
  getDefaultQRBaseUrl,
  PRODUCTION_QR_BASE_URL,
  getDevQRBaseUrl,
} from '../../utils/qrCodeGenerator';
import { adminTableApi } from '../../services/adminTableApi';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * Note: Replaces initial mock tables (SAMPLE_TABLES / getInitialTables) with
 * live persisted database records fetched via adminTableApi.getTables()
 * in accordance with Phase 7 Prompt 1 requirements.
 */

/**
 * Reusable Canvas QR Code Component
 * Draws the functional, unique QR code with quiet zone onto an HTML5 canvas.
 */
function TableQRCanvas({ text, size = 160, className = '' }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!text) {
      setError('Configuration Required — Missing valid destination URL.');
      return;
    }
    if (!canvasRef.current) return;
    try {
      setError(null);
      drawQRCodeToCanvas(canvasRef.current, text, {
        pixelSize: Math.max(3, Math.floor(size / 37)),
        margin: 4,
        darkColor: '#121214',
        lightColor: '#FFFFFF',
      });
    } catch (err) {
      console.warn('QR Canvas rendering error:', err);
      setError('Unable to render QR code.');
    }
  }, [text, size]);

  if (!text || error) {
    return (
      <div
        className="w-44 h-44 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 flex flex-col items-center justify-center text-center space-y-2 animate-fadeIn"
        role="alert"
        aria-live="polite"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-xs font-bold text-amber-900 leading-tight">
          Configuration Required
        </p>
        <p className="text-[10px] text-amber-700 leading-tight">
          {error || 'Missing valid destination URL. QR cannot be generated.'}
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-xl shadow-2xs ${className}`}
      style={{ width: size, height: size }}
      aria-label="Table Dine-In QR Code"
    />
  );
}

/**
 * AdminTableQRCodesPage Component
 * Full-featured Table QR Code Management UI (Phase 2 Prompt 2).
 *
 * Implements:
 * - Functional QR code generation for each existing table using pure JS engine
 * - Unique QR payload linking to dine-in menu destination with public table identifiers
 * - Preview QR modal with high-res QR display, table metadata, and quick actions
 * - Download QR as PNG with clean naming ('happiness-restaurant-table-1-qr.png')
 * - Print QR layout with restaurant branding, table details, and menu scan instruction
 * - Clean print isolation hiding admin chrome via '@media print'
 * - Responsive layout tested on desktop, laptop, tablet, and mobile
 */
export default function AdminTableQRCodesPage() {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Inactive'

  // Fetch persisted tables from backend table management API
  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await adminTableApi.getTables();
      if (res && Array.isArray(res.tables)) {
        setTables(res.tables);
      } else {
        setTables([]);
      }
    } catch (err) {
      console.error('[AdminTableQRCodesPage] Failed to fetch persisted tables:', err);
      // Honest error state: do not silently fall back to mock data
      setFetchError(err.message || 'Unable to connect to the restaurant table service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Configurable Base URL state (defaults strictly to production domain https://happiness-restaurant-three.vercel.app)
  const defaultOrigin = useMemo(() => getDefaultQRBaseUrl(), []);
  const devOrigin = useMemo(() => getDevQRBaseUrl(), []);
  const [customBaseUrl, setCustomBaseUrl] = useState(defaultOrigin);
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);

  // Modal preview state
  const [previewTable, setPreviewTable] = useState(null);

  // Printing state for isolated print layout
  const [printingTable, setPrintingTable] = useState(null);

  // Feedback toast message state
  const [feedback, setFeedback] = useState(null);

  // Auto-dismiss toast feedback after 4.5 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewTable) {
        setPreviewTable(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewTable]);

  // Handle printing trigger when printingTable is set
  useEffect(() => {
    if (printingTable) {
      const timer = setTimeout(() => {
        window.print();
        setPrintingTable(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [printingTable]);

  // Summary Metrics calculations
  const totalTables = tables.length;
  const activeTables = useMemo(
    () => tables.filter((t) => t.status === 'Active').length,
    [tables]
  );
  const inactiveTables = totalTables - activeTables;

  // Filter tables
  const filteredTables = useMemo(() => {
    let result = [...tables];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.tableNumber.toLowerCase().includes(q) ||
          (t.name && t.name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    return result;
  }, [tables, searchQuery, statusFilter]);

  // Download Handler
  const handleDownloadQR = (table) => {
    try {
      const payloadUrl = generateTableDineInUrl(table, customBaseUrl);
      const cleanNum = (table.tableNumber || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '') || 'table';
      const filename = `happiness-restaurant-${cleanNum}-qr.png`;

      downloadQRCodePNG(payloadUrl, filename, {
        pixelSize: 12,
        margin: 4,
        darkColor: '#121214',
        lightColor: '#FFFFFF',
      });

      setFeedback({
        type: 'success',
        message: `Downloaded QR for ${table.tableNumber} as "${filename}".`,
      });
    } catch (err) {
      console.error('Download error:', err);
      setFeedback({
        type: 'error',
        message: `Failed to download QR code for ${table.tableNumber}.`,
      });
    }
  };

  // Print Handler
  const handlePrintQR = (table) => {
    setPrintingTable(table);
  };

  return (
    <>
      {/* =========================================================================
          PRINT-ONLY SHEET (Isolated layout for printing table tent cards)
          Hidden on screen, visible only during window.print()
          ========================================================================= */}
      {printingTable && (
        <div className="hidden print:flex flex-col items-center justify-center min-h-screen text-center p-8 bg-white text-black font-sans">
          <div className="w-[420px] max-w-full border-2 border-black rounded-3xl p-8 flex flex-col items-center space-y-5">
            {/* Restaurant Branding Header */}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-black">
                {RESTAURANT_CONFIG.name}
              </h1>
              <p className="text-xs uppercase tracking-widest text-neutral-600 mt-0.5">
                Table Dine-In Service
              </p>
            </div>

            {/* Table Number & Zone */}
            <div className="border-t border-b border-neutral-300 py-3 w-full text-center">
              <span className="text-3xl font-black block tracking-tight">
                {printingTable.tableNumber.toUpperCase()}
              </span>
              {printingTable.name && (
                <span className="text-sm font-semibold text-neutral-600 block mt-0.5">
                  {printingTable.name} &bull; {printingTable.capacity} Seats
                </span>
              )}
            </div>

            {/* High-Resolution Printable QR Code */}
            <div className="p-3 bg-white border border-neutral-200 rounded-2xl shadow-xs">
              <TableQRCanvas
                text={generateTableDineInUrl(printingTable, customBaseUrl)}
                size={220}
              />
            </div>

            {/* Scan Call to Action Instruction */}
            <div className="space-y-1">
              <p className="text-sm font-extrabold uppercase tracking-wide">
                Scan to view the restaurant menu
              </p>
              <p className="text-[11px] text-neutral-500">
                Open phone camera or QR scanner to browse dishes and order directly to your table.
              </p>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-neutral-200 w-full text-[10px] text-neutral-400 flex items-center justify-between">
              <span>{customBaseUrl}</span>
              <span>Self Table Service</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN INTERACTIVE ADMIN UI (Hidden during window.print())
          ========================================================================= */}
      <div className={`space-y-6 ${printingTable ? 'print:hidden' : ''}`}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/admin/tables"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                aria-label="Return to Table Management"
              >
                <span>&larr; Return to Table Management</span>
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
              Table QR Codes
            </h1>
            <p className="text-xs text-muted mt-1">
              Manage QR codes for restaurant dine-in tables
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadTables}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs border border-slate-200 cursor-pointer active:scale-95 disabled:opacity-60"
              aria-label="Refresh table QR records"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingBaseUrl(!isEditingBaseUrl)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs border border-slate-200 cursor-pointer active:scale-95"
              aria-label="Configure QR Base URL"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Config URL</span>
            </button>

            <Link
              to="/admin/tables"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-primary text-xs font-bold transition shadow-xs border border-slate-200 active:scale-95"
              aria-label="Back to Table Management list"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Table Management</span>
            </Link>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-fadeIn transition shadow-xs border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* API Fetch Error State Banner */}
        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 font-bold">
                !
              </div>
              <div>
                <p className="font-bold">Failed to load persisted tables</p>
                <p className="text-rose-700 mt-0.5">{fetchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadTables}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition text-xs flex-shrink-0 cursor-pointer shadow-2xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Optional Base URL Configuration Drawer */}
        {isEditingBaseUrl && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label htmlFor="input-base-url" className="text-xs font-bold text-primary">
                Configurable Dine-in Base URL
              </label>
              <button
                type="button"
                onClick={() => setCustomBaseUrl(defaultOrigin)}
                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
              >
                Reset to Default Origin
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="input-base-url"
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="e.g. https://happiness-restaurant-three.vercel.app"
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-mono text-primary"
              />
              <button
                type="button"
                onClick={() => setIsEditingBaseUrl(false)}
                className="px-4 py-2 bg-primary text-accent text-xs font-bold rounded-xl hover:bg-primary-light transition cursor-pointer"
              >
                Apply
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Payload destination pattern: <code className="font-mono text-slate-600">{customBaseUrl}/menu?table=[TableNumber]&amp;tableId=[Id]&amp;mode=dine_in</code>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => setCustomBaseUrl(PRODUCTION_QR_BASE_URL)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  customBaseUrl === PRODUCTION_QR_BASE_URL
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Production Domain (Vercel)
              </button>
              <button
                type="button"
                onClick={() => setCustomBaseUrl(devOrigin)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  customBaseUrl === devOrigin
                    ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Local Wi-Fi Testing ({devOrigin})
              </button>
            </div>
            {customBaseUrl.includes('localhost') && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                <strong>Notice:</strong> &quot;localhost&quot; is only reachable on this computer. Mobile phone cameras scanning printed or on-screen QR codes cannot reach &quot;localhost&quot;. Use your local development network URL (e.g. <code>http://192.168.31.94:3000</code>).
              </p>
            )}
            {customBaseUrl.includes('192.168.') && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 leading-relaxed flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span><strong>Development Network Mode:</strong> QR codes encode your local Wi-Fi IP (<code>{customBaseUrl}</code>) so phones on the same network can scan and access the menu directly.</span>
              </p>
            )}
            {customBaseUrl.includes('vercel.app') && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 leading-relaxed flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span><strong>Production Domain Mode:</strong> QR codes encode the public live production URL (<code>{customBaseUrl}</code>) accessible from any mobile device.</span>
              </p>
            )}
          </div>
        )}

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Total Tables */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Tables
              </p>
              <p className="text-2xl sm:text-3xl font-black text-primary mt-1">
                {isLoading ? '...' : totalTables}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dine-in floor capacity</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-primary flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M10 20V10" />
              </svg>
            </div>
          </div>

          {/* Active Table QRs */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Table QRs
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                {isLoading ? '...' : activeTables}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Scannable for dine-in guests</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Inactive Table QRs */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Inactive Table QRs
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-500 mt-1">
                {isLoading ? '...' : inactiveTables}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Reserved / Closed tables</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>

          {/* QR Generator Status */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-3 lg:col-span-1">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                QR Engine Status
              </p>
              <p className="text-base font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active &bull; Pure JS
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">High-Res PNG & Print Ready</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent-light/60 text-accent border border-accent/20 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Security & Validation Notice */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
            ⓘ
          </div>
          <div className="space-y-1 leading-relaxed">
            <p className="font-bold">Public Dine-In Identifier Notice (Preview / Test QR)</p>
            <p className="text-[11px] text-amber-800">
              Each generated QR code encodes a public restaurant table destination (e.g. table number and ID). 
              It does <strong>not</strong> contain customer tokens, credentials, or private order histories. 
              Live authenticated table ordering sessions and billing will be enforced on the backend in subsequent phases.
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by table number or zone name..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent focus:bg-white text-primary placeholder-slate-400 transition"
              aria-label="Search QR tables"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-semibold text-primary cursor-pointer"
              aria-label="Filter by table status"
            >
              <option value="ALL">All Tables ({totalTables})</option>
              <option value="Active">Active Only ({activeTables})</option>
              <option value="Inactive">Inactive Only ({inactiveTables})</option>
            </select>
          </div>
        </div>

        {/* QR CARDS GRID */}
        {isLoading && tables.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" aria-label="Loading tables">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-200" />
                    <div className="space-y-1.5">
                      <div className="w-20 h-3.5 bg-slate-200 rounded" />
                      <div className="w-14 h-2.5 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="w-14 h-5 bg-slate-200 rounded-full" />
                </div>
                <div className="w-36 h-36 bg-slate-100 rounded-2xl mx-auto" />
                <div className="space-y-2 pt-2">
                  <div className="w-full h-8 bg-slate-200 rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-7 bg-slate-100 rounded-xl" />
                    <div className="h-7 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            {tables.length === 0 ? (
              <>
                <h2 className="text-base font-bold text-primary">No Dining Tables Found</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No dining tables are currently configured in the database. Add your first table in Table Management to generate QR codes.
                </p>
                <Link
                  to="/admin/tables"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-accent text-xs font-bold rounded-xl hover:bg-primary-light transition cursor-pointer"
                >
                  Go to Table Management
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-primary">No Matching Tables Found</h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No tables match your search query. Try clearing your search filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTables.map((table) => {
              const isActive = table.status === 'Active';
              const payloadUrl = generateTableDineInUrl(table, customBaseUrl);
              const stableKey = table.id || table._id || table.tableNumber;

              return (
                <div
                  key={stableKey}
                  className={`bg-white rounded-2xl border ${
                    isActive ? 'border-slate-200' : 'border-slate-200 opacity-95'
                  } shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary text-white font-extrabold flex items-center justify-center text-xs shadow-xs border border-primary-light flex-shrink-0">
                        {table.tableNumber.replace(/[^0-9]/g, '') || '#'}
                      </div>
                      <div className="min-w-0 truncate">
                        <h2 className="font-extrabold text-primary text-sm leading-snug truncate">
                          {table.tableNumber}
                        </h2>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {table.name || 'Standard Table'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{table.status}</span>
                    </span>
                  </div>

                  {/* QR Code Canvas Area */}
                  <div className="p-6 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <TableQRCanvas text={payloadUrl} size={150} />
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Capacity: <strong>{table.capacity} Guests</strong></span>
                    </div>

                    {!isActive && (
                      <span className="mt-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800">
                        Inactive &bull; Dine-in Disabled
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-mono mt-1 max-w-[200px] truncate block" title={payloadUrl}>
                      {payloadUrl}
                    </span>
                  </div>

                  {/* Card Action Controls: Preview, Download, Print */}
                  <div className="p-3.5 bg-white border-t border-slate-100 space-y-2">
                    {/* Primary Preview Action */}
                    <button
                      type="button"
                      onClick={() => setPreviewTable(table)}
                      className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      aria-label={`Preview QR for ${table.tableNumber}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Preview QR</span>
                    </button>

                    {/* Secondary Actions: Download & Print */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadQR(table)}
                        className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                        aria-label={`Download QR PNG for ${table.tableNumber}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3 h-3 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintQR(table)}
                        className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                        aria-label={`Print QR for ${table.tableNumber}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3 h-3 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Print QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR PREVIEW MODAL */}
        {previewTable && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-qr-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewTable(null);
            }}
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fadeIn my-auto max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-accent flex items-center justify-center flex-shrink-0 shadow-xs border border-primary-light">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="modal-qr-title" className="text-base font-extrabold text-primary">
                      QR Preview &bull; {previewTable.tableNumber}
                    </h3>
                    <p className="text-xs text-muted">
                      {previewTable.name || 'Standard Dining Table'} &bull; {previewTable.capacity} Seats
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewTable(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs transition cursor-pointer"
                  aria-label="Close QR preview"
                >
                  ✕
                </button>
              </div>

              {/* QR Code Canvas in Modal */}
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                  <TableQRCanvas
                    text={generateTableDineInUrl(previewTable, customBaseUrl)}
                    size={200}
                  />
                </div>

                {/* Table Status in Modal */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-primary">
                    {previewTable.tableNumber}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      previewTable.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        previewTable.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    <span>{previewTable.status}</span>
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 font-mono break-all max-w-xs">
                  {generateTableDineInUrl(previewTable, customBaseUrl)}
                </p>
              </div>

              {/* Informative Explanation */}
              {previewTable.status !== 'Active' ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Table Currently Inactive</span>
                  </p>
                  <p className="text-amber-800">
                    This table is deactivated. Customers scanning this QR code will not be able to place dine-in orders until the table is activated in Table Management.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Preview &amp; Test QR Ready</p>
                  <p>
                    Scan with any smartphone camera to open the restaurant menu filtered for {previewTable.tableNumber}. When live ordering is enabled, guests will be able to submit dine-in orders directly.
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleDownloadQR(previewTable)}
                    className="w-1/2 sm:w-auto py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintQR(previewTable)}
                    className="w-1/2 sm:w-auto py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print QR</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewTable(null)}
                  className="w-full sm:w-auto py-2 px-4 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
