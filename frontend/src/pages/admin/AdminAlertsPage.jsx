import React, { useState, useEffect, useMemo, useRef } from 'react';
import adminNotificationApi from '../../services/adminNotificationApi';

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Year Range configuration for Clear Notification History: 2026 through 2035 inclusive (max limit 2035)
export const NOTIFICATION_START_YEAR = 2026;
export const NOTIFICATION_MAX_YEAR = 2035;
export const NOTIFICATION_SUPPORTED_YEARS = Array.from(
  { length: NOTIFICATION_MAX_YEAR - NOTIFICATION_START_YEAR + 1 },
  (_, idx) => NOTIFICATION_START_YEAR + idx
);

/**
 * Calculates initial selected year dynamically from current calendar year.
 * Within [2026, 2035], returns current calendar year.
 * Beyond 2035, safely caps at 2035 without generating future years.
 * Before 2026, safely clamps to 2026.
 */
export function calculateNotificationDefaultYear(targetDate = new Date()) {
  const currentYear = targetDate.getFullYear();
  if (currentYear < NOTIFICATION_START_YEAR) return String(NOTIFICATION_START_YEAR);
  if (currentYear > NOTIFICATION_MAX_YEAR) return String(NOTIFICATION_MAX_YEAR);
  return String(currentYear);
}

/**
 * FilterDropdown Component
 *
 * Premium branded dropdown filter for Happiness Restaurant.
 * Replaces generic browser-select appearance with:
 * - Pill/rounded shape with refined neutral border & subtle depth
 * - Clean white background with smooth hover lift (1.5px) and gold transition
 * - HAPPINESS gold accent (#D4AF37) on focus, open, active selection, and check indicators
 * - Smooth 180° chevron rotation (with prefers-reduced-motion guard)
 * - Accessible keyboard navigation (Space, Enter, Escape, Arrow Up/Down)
 * - Click-outside dismissal
 * - Dual-compatibility hidden select for programmatic access
 */
function FilterDropdown({ id, value, onChange, options, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || { value, label: value };
  const isFiltered = value !== 'ALL';

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left shrink-0">
      {/* Hidden native select for test and form automation accessibility */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Dropdown Button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`group relative inline-flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 ease-out cursor-pointer select-none border whitespace-nowrap shrink-0 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 ${
          isOpen
            ? 'bg-white text-primary border-[#D4AF37] ring-2 ring-[#D4AF37]/35 shadow-[0_4px_12px_rgba(212,175,55,0.18)] -translate-y-[1px]'
            : isFiltered
            ? 'bg-white text-primary border-[#D4AF37]/80 ring-1 ring-[#D4AF37]/35 shadow-xs hover:border-[#D4AF37] hover:shadow-sm hover:-translate-y-[1.5px]'
            : 'bg-white text-primary border-zinc-200/90 shadow-xs hover:border-[#D4AF37]/75 hover:shadow-sm hover:-translate-y-[1.5px]'
        } motion-reduce:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none`}
      >
        {/* Subtle Brand Accent Indicator when filtered */}
        {isFiltered && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0"
            aria-hidden="true"
          />
        )}

        <span className="truncate max-w-[140px] text-left">
          {selectedOption ? selectedOption.label : value}
        </span>

        {/* Elegant Chevron Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            isOpen ? 'rotate-180 text-[#D4AF37]' : 'text-zinc-400 group-hover:text-zinc-600'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 mt-1.5 min-w-[148px] w-full sm:w-auto bg-white rounded-xl border border-zinc-200/90 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(212,175,55,0.12)] p-1 z-30"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange(opt.value);
                    setIsOpen(false);
                  }
                }}
                className={`group/opt flex items-center justify-between gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors duration-200 ease-out select-none motion-reduce:transition-none ${
                  isSelected
                    ? 'bg-[#FAF4E5] text-primary font-bold'
                    : 'text-zinc-700 hover:bg-[#FAF4E5] hover:text-primary font-medium'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 text-[#D4AF37] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * AdminAlertsPage Component
 * Real-time notification monitoring, provider health, and audit trail (/admin/alerts)
 *
 * Implements:
 * - Real provider configuration status (WhatsApp)
 * - Displays "NOT CONFIGURED" when provider credentials are unset
 * - Audit logs table with Order ID, Event, Channel, Recipient, Status, Timestamp, Details, Action
 * - Real data from NotificationLog with zero fake successes
 * - Empty state ("No data available") when logs are empty
 * - Manual retry for eligible failed notifications
 */
export default function AdminAlertsPage() {
  const [providerStatus, setProviderStatus] = useState({
    whatsapp: 'NOT_CONFIGURED',
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channelFilter, setChannelFilter] = useState('ALL'); // 'ALL' | 'WHATSAPP'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SENT' | 'FAILED' | 'PENDING'
  const [retryingId, setRetryingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchAlertsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch provider configuration status
      const statusRes = await adminNotificationApi.getProviderStatus();
      if (statusRes?.providers) {
        setProviderStatus({
          whatsapp: statusRes.providers.whatsapp || statusRes.providers.WHATSAPP || 'NOT_CONFIGURED',
        });
      }

      // 2. Fetch live notification logs
      const logsRes = await adminNotificationApi.getAllLogs();
      if (logsRes && logsRes.success && Array.isArray(logsRes.logs)) {
        setLogs(logsRes.logs);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.warn('Failed to load alerts & notifications data:', err);
      setError('Unable to load live notification logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsData();
  }, []);

  const handleRetry = async (logId) => {
    if (!logId || retryingId) return;
    setRetryingId(logId);
    setActionMessage(null);

    try {
      const res = await adminNotificationApi.retryNotificationById(logId);
      if (res?.success) {
        setActionMessage({ type: 'success', text: res.message || 'Notification retry initiated successfully.' });
        // Refresh logs to show updated status
        await fetchAlertsData();
      } else {
        setActionMessage({ type: 'error', text: res?.error || 'Notification retry failed or provider not configured.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Error executing notification retry.' });
    } finally {
      setRetryingId(null);
    }
  };

  // Month & Year Clear History State
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => calculateNotificationDefaultYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearNotice, setClearNotice] = useState(null);

  // Supported years range: 2026 through 2035 inclusive (capped at 2035)
  const availableYears = useMemo(() => NOTIFICATION_SUPPORTED_YEARS, []);

  // Default selected month to current month if unset
  useEffect(() => {
    if (!selectedMonth) {
      setSelectedMonth(String(new Date().getMonth() + 1));
    }
  }, [selectedMonth]);

  const selectedMonthName = useMemo(() => {
    const mNum = parseInt(selectedMonth, 10);
    if (mNum >= 1 && mNum <= 12) {
      return MONTH_NAMES[mNum - 1];
    }
    return '';
  }, [selectedMonth]);

  // Record count for currently selected month and year
  const recordsInSelectedPeriod = useMemo(() => {
    if (!selectedYear || !selectedMonth) return 0;
    const yNum = Number(selectedYear);
    const mNum = Number(selectedMonth);
    return logs.filter((log) => {
      if (!log.createdAt) return false;
      const d = new Date(log.createdAt);
      return d.getFullYear() === yNum && (d.getMonth() + 1) === mNum;
    }).length;
  }, [logs, selectedYear, selectedMonth]);

  const handleInitiateClear = () => {
    setClearNotice(null);
    if (!selectedYear || !selectedMonth) return;

    if (recordsInSelectedPeriod === 0) {
      setClearNotice({
        type: 'warning',
        text: `No notification history found for ${selectedMonthName} ${selectedYear}.`,
      });
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    setClearNotice(null);
    try {
      const res = await adminNotificationApi.clearHistory(selectedYear, selectedMonth);
      if (res.success && res.deletedCount > 0) {
        setActionMessage({
          type: 'success',
          text: res.message || `Successfully cleared ${selectedMonthName} ${selectedYear} notification history.`,
        });
        setShowConfirmation(false);
        setShowClearModal(false);
        await fetchAlertsData();
      } else if (res.success && res.deletedCount === 0) {
        setClearNotice({
          type: 'warning',
          text: res.message || `No notification history found for ${selectedMonthName} ${selectedYear}.`,
        });
        setShowConfirmation(false);
      } else {
        setClearNotice({
          type: 'error',
          text: res.error || 'Failed to clear notification history.',
        });
        setShowConfirmation(false);
      }
    } catch (err) {
      setClearNotice({
        type: 'error',
        text: err.message || 'An unexpected error occurred.',
      });
      setShowConfirmation(false);
    } finally {
      setIsClearing(false);
    }
  };

  // Filter logs by channel & status
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const chMatch = channelFilter === 'ALL' || String(log.channel || '').toUpperCase() === channelFilter;
      const stMatch = statusFilter === 'ALL' || String(log.status || '').toUpperCase() === statusFilter;
      return chMatch && stMatch;
    });
  }, [logs, channelFilter, statusFilter]);

  // Log summary counts
  const summaryStats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let pending = 0;

    logs.forEach((l) => {
      const st = String(l.status || '').toUpperCase();
      if (st === 'SENT') sent++;
      else if (st === 'FAILED') failed++;
      else if (st === 'PENDING') pending++;
    });

    return {
      total: logs.length,
      sent,
      failed,
      pending,
    };
  }, [logs]);

  const isWhatsAppConfigured = providerStatus.whatsapp === 'CONFIGURED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              Alerts & Notifications
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Notification Gateway
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Live notification status, customer alert channels, and transactional dispatch history.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAlertsData}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-white border border-surface-border text-primary hover:bg-secondary text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
          title="Refresh notification status"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Status</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button type="button" onClick={() => setActionMessage(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchAlertsData} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* NOTIFICATION STATUS SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Provider Status */}
        <div className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.044.071.044.419-.1.824z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-primary block">WhatsApp Channel</span>
                <span className="text-[10px] text-muted">Business API</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                isWhatsAppConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isWhatsAppConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}
            </span>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            {isWhatsAppConfigured
              ? 'Automated WhatsApp customer alerts dispatched for order readiness.'
              : 'WhatsApp provider credentials unconfigured. Notifications recorded safely.'}
          </p>
        </div>

        {/* Total Logs & Dispatch Activity */}
        <div className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
            Total Logged Events
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-primary font-sans">
              {summaryStats.total}
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              All Channels
            </span>
          </div>
          <div className="flex items-center gap-3 pt-2 text-[11px] text-muted">
            <span className="text-emerald-700 font-semibold">{summaryStats.sent} Sent</span>
            <span>&bull;</span>
            <span className="text-rose-700 font-semibold">{summaryStats.failed} Failed</span>
          </div>
        </div>

        {/* Delivery Mode Policy */}
        <div className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
            Pickup-Only Policy
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-primary">
              Strict Counter Pickup
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed pt-1">
            All messages strictly inform customers to collect parcels from the counter.
          </p>
        </div>
      </div>

      {/* NOTIFICATION HISTORY AUDIT TRAIL */}
      <div className="bg-white rounded-3xl border border-surface-border p-5 sm:p-7 shadow-xs space-y-4">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-extrabold text-primary">
              Notification History
            </h2>
            <p className="text-xs text-muted">
              Audit log of all parcel event alerts generated by the order management workflow.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Channel Filter */}
            <FilterDropdown
              id="channel-filter"
              ariaLabel="Filter by channel"
              value={channelFilter}
              onChange={setChannelFilter}
              options={CHANNEL_OPTIONS}
            />

            {/* Status Filter */}
            <FilterDropdown
              id="status-filter"
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />

            {/* Clear History Button */}
            <button
              type="button"
              onClick={() => {
                setShowClearModal(true);
                setShowConfirmation(false);
                setClearNotice(null);
              }}
              disabled={loading || availableYears.length === 0}
              className="px-3 py-1.5 rounded-xl border border-rose-200/90 bg-rose-50/70 hover:bg-rose-100/90 text-rose-700 hover:text-rose-800 text-xs font-semibold transition-all duration-200 ease-out shadow-xs hover:shadow-sm hover:-translate-y-[1.5px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-xs motion-reduce:hover:translate-y-0 motion-reduce:transition-none whitespace-nowrap shrink-0"
              title="Clear Notification History by Month & Year"
              aria-label="Clear Notification History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear History</span>
            </button>
          </div>
        </div>

        {/* Clear Notification History Modal */}
        {showClearModal && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
          >
            <div className="bg-white rounded-3xl border border-surface-border shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
              {showConfirmation ? (
                /* Confirmation View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 id="clear-history-title" className="text-base font-bold text-primary">
                        Clear Notification History?
                      </h3>
                      <p className="text-xs text-muted">
                        Permanent audit log deletion
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs text-rose-900 leading-relaxed">
                    You are about to permanently delete <span className="font-bold">{recordsInSelectedPeriod}</span> notification {recordsInSelectedPeriod === 1 ? 'record' : 'records'} from <span className="font-bold">{selectedMonthName} {selectedYear}</span>. This action cannot be undone.
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmation(false)}
                      disabled={isClearing}
                      className="px-4 py-2 rounded-xl border border-surface-border text-primary hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmClear}
                      disabled={isClearing}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white border border-rose-500/40 text-xs font-bold tracking-tight transition-all duration-200 ease-out shadow-xs hover:shadow-md hover:-translate-y-[1px] active:translate-y-[0.5px] active:scale-[0.99] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-xs motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                    >
                      {isClearing ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Clearing...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-100 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Clear History</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Month + Year Selection View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                    <div>
                      <h3 id="clear-history-title" className="text-base font-bold text-primary">
                        Clear Notification History
                      </h3>
                      <p className="text-xs text-muted">
                        Select Year and Month to purge historical notification events.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowClearModal(false)}
                      className="w-8 h-8 rounded-xl text-muted hover:text-primary hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                      aria-label="Close"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {clearNotice && (
                    <div className={`p-3 rounded-xl text-xs font-semibold ${
                      clearNotice.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {clearNotice.text}
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Year */}
                    <div>
                      <label htmlFor="clear-history-year" className="block text-xs font-bold text-primary mb-1">
                        Year
                      </label>
                      <select
                        id="clear-history-year"
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setClearNotice(null);
                        }}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-surface-border bg-slate-50 text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                      >
                        {availableYears.map((yr) => (
                          <option key={yr} value={String(yr)}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Month */}
                    <div>
                      <label htmlFor="clear-history-month" className="block text-xs font-bold text-primary mb-1">
                        Month
                      </label>
                      <select
                        id="clear-history-month"
                        value={selectedMonth}
                        onChange={(e) => {
                          setSelectedMonth(e.target.value);
                          setClearNotice(null);
                        }}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-surface-border bg-slate-50 text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                      >
                        {MONTH_NAMES.map((mName, idx) => (
                          <option key={mName} value={String(idx + 1)}>
                            {mName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notification records count */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-surface-border">
                      <span className="text-muted font-medium">Notification records:</span>
                      <span className={`text-sm font-extrabold font-sans ${recordsInSelectedPeriod > 0 ? 'text-primary' : 'text-slate-400'}`}>
                        {recordsInSelectedPeriod}
                      </span>
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowClearModal(false)}
                      className="px-3.5 py-2 rounded-xl border border-surface-border text-primary hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInitiateClear}
                      disabled={!selectedYear || !selectedMonth}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white border border-rose-500/40 text-xs font-bold tracking-tight transition-all duration-200 ease-out shadow-xs hover:shadow-md hover:-translate-y-[1px] active:translate-y-[0.5px] active:scale-[0.99] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-xs motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-100 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Clear {selectedMonthName} {selectedYear} History</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Table */}
        {filteredLogs.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-primary">No data available</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              There are currently no notification logs matching the selected filters. Real dispatch events will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" aria-label="Notification History Table">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Recipient</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Details</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredLogs.map((log) => {
                  const upperStatus = String(log.status || 'PENDING').toUpperCase();
                  const isSent = upperStatus === 'SENT';
                  const isFailed = upperStatus === 'FAILED';
                  const formattedTime = log.createdAt
                    ? new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';

                  return (
                    <tr key={log._id || `${log.orderId}-${log.createdAt}`} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order ID */}
                      <td className="py-3 px-3 font-mono font-bold text-primary whitespace-nowrap">
                        {log.orderId}
                      </td>

                      {/* Event */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {String(log.type || 'NOTIFICATION').replace('_', ' ')}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-primary">
                          {log.channel === 'WHATSAPP' ? (
                            <span className="text-emerald-600 font-bold">WhatsApp</span>
                          ) : (
                            <span className="text-slate-500 font-medium">{log.channel || '—'}</span>
                          )}
                        </span>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-3 font-mono text-muted whitespace-nowrap">
                        {log.recipient || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isSent
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSent ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{upperStatus}</span>
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-3 text-muted whitespace-nowrap text-[11px]">
                        {formattedTime}
                      </td>

                      {/* Details */}
                      <td className="py-3 px-3 max-w-xs">
                        <span className="truncate block text-slate-600 text-[11px]" title={log.error || log.message}>
                          {log.error ? (
                            <span className="text-rose-600 font-medium">Error: {log.error}</span>
                          ) : (
                            log.message || 'Notification queued'
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {isFailed && log._id ? (
                          <button
                            type="button"
                            onClick={() => handleRetry(log._id)}
                            disabled={retryingId === log._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-light text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            {retryingId === log._id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
