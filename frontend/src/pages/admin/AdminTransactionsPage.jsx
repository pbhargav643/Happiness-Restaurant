import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import adminOrderApi from '../../services/adminOrderApi';

/**
 * Format timestamp into readable 12-hour time (e.g., 03:45 PM)
 */
function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/**
 * Format timestamp into date string (e.g., 16 Oct 2026)
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format timestamp into full date group heading (e.g., Friday, 16 October 2026)
 */
function formatDateGroupHeading(isoString) {
  if (!isoString) return 'Unscheduled / Unknown Date';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Unscheduled / Unknown Date';
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Unknown Date';
  }
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const SUPPORTED_DELETE_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

/**
 * AdminTransactionsPage Component
 * Authoritative Cash & UPI Transactions Report (/admin/transactions)
 *
 * Implements:
 * - Real live payment records synchronization via backend API
 * - Date, Month, Year, and Quick Filters (Today, This Month, Last Month, Custom Range, All Time)
 * - Method filter (All, Cash, UPI), Order Type filter (All, Dine-in QR, Parcel Pickup), and Status filter
 * - 6 Executive KPI summary cards (Cash, UPI, Confirmed Total, Dine-in, Pickup, Pending)
 * - Date-wise grouped transaction table with daily subtotals and responsive cards on mobile
 * - CSV export matching screen filters and totals
 * - Seamless links to order detail pages (/admin/orders/:orderId)
 */
export default function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Raw fetched data
  const [reportData, setReportData] = useState({
    summary: {
      totalCashCollected: 0,
      totalUpiCollected: 0,
      totalConfirmed: 0,
      dineInCollection: 0,
      pickupCollection: 0,
      pendingAmount: 0,
      failedAmount: 0,
      totalTransactions: 0,
      paidCount: 0,
      pendingCount: 0,
      cashCount: 0,
      upiCount: 0,
    },
    transactions: [],
  });

  // Filter States
  const [quickFilter, setQuickFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  const [selectedMonth, setSelectedMonth] = useState(''); // '' | 1..12
  const [selectedYear, setSelectedYear] = useState(''); // '' | 2024..2027
  const [fromDate, setFromDate] = useState(''); // 'YYYY-MM-DD'
  const [toDate, setToDate] = useState(''); // 'YYYY-MM-DD'
  const [methodFilter, setMethodFilter] = useState('ALL'); // 'ALL' | 'CASH' | 'UPI'
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL'); // 'ALL' | 'DINE_IN' | 'PICKUP'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'FAILED'
  const [searchQuery, setSearchQuery] = useState('');

  // Phase 9: Delete Transactions State (Order History Popover & Confirmation Modal Style)
  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteYear, setDeleteYear] = useState(String(CURRENT_YEAR));
  const [deleteMonth, setDeleteMonth] = useState(String(new Date().getMonth() + 1));
  const [deleteDay, setDeleteDay] = useState('ALL'); // 'ALL' or '1'..'31'
  const [deleteMethod, setDeleteMethod] = useState('ALL'); // 'ALL' | 'CASH' | 'UPI'
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deletePreview, setDeletePreview] = useState({ count: 0, totalAmount: 0 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const deletePopoverRef = useRef(null);
  const cancelDeleteBtnRef = useRef(null);

  // Fetch report from authoritative backend API
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryOptions = {
      quickFilter,
      month: selectedMonth || undefined,
      year: selectedYear || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
      method: methodFilter,
      orderType: orderTypeFilter,
      paymentStatus: statusFilter,
      search: searchQuery.trim() || undefined,
    };

    try {
      const res = await adminOrderApi.getTransactionReport(queryOptions);

      if (res && res.success) {
        setReportData({
          summary: res.summary || {},
          transactions: Array.isArray(res.transactions) ? res.transactions : [],
        });
      } else {
        // Fallback to getAdminOrders if report endpoint isn't reached
        const fallbackOrdersRes = await adminOrderApi.getAdminOrders({ limit: 500 });
        if (fallbackOrdersRes && fallbackOrdersRes.success && Array.isArray(fallbackOrdersRes.orders)) {
          // Process locally
          processFallbackOrders(fallbackOrdersRes.orders, queryOptions);
        } else {
          setError(res?.error || 'Unable to load transaction records from server.');
        }
      }
    } catch (err) {
      console.warn('[AdminTransactionsPage] Fetch error:', err);
      // Try local fallback
      try {
        const fallbackOrdersRes = await adminOrderApi.getAdminOrders({ limit: 500 });
        if (fallbackOrdersRes && fallbackOrdersRes.success && Array.isArray(fallbackOrdersRes.orders)) {
          processFallbackOrders(fallbackOrdersRes.orders, queryOptions);
        } else {
          setError('Unable to reach server. Please check connection and retry.');
        }
      } catch {
        setError('Unable to load transaction records.');
      }
    } finally {
      setLoading(false);
    }
  }, [quickFilter, selectedMonth, selectedYear, fromDate, toDate, methodFilter, orderTypeFilter, statusFilter, searchQuery]);

  // Client-side fallback computation for zero downtime
  const processFallbackOrders = (orders, opts) => {
    let filtered = orders.slice();

    // Order Type
    if (opts.orderType && opts.orderType !== 'ALL') {
      filtered = filtered.filter((o) => {
        const isDineIn = (o.orderType || '').toUpperCase() === 'DINE_IN';
        return opts.orderType === 'DINE_IN' ? isDineIn : !isDineIn;
      });
    }

    // Method
    if (opts.method && opts.method !== 'ALL') {
      filtered = filtered.filter((o) => o.payment?.method === opts.method);
    }

    // Status
    if (opts.paymentStatus && opts.paymentStatus !== 'ALL') {
      if (opts.paymentStatus === 'PAID') {
        filtered = filtered.filter((o) => o.payment?.status === 'COMPLETED');
      } else if (opts.paymentStatus === 'PENDING') {
        filtered = filtered.filter((o) => !o.payment || o.payment.status === 'PENDING');
      } else if (opts.paymentStatus === 'FAILED') {
        filtered = filtered.filter((o) => o.payment?.status === 'FAILED');
      }
    }

    // Date range
    if (opts.startDate || opts.endDate || opts.quickFilter !== 'ALL' || (opts.month && opts.year)) {
      let start = null;
      let end = null;
      const now = new Date();

      if (opts.quickFilter === 'TODAY') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (opts.quickFilter === 'THIS_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (opts.quickFilter === 'LAST_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (opts.month && opts.year) {
        start = new Date(parseInt(opts.year, 10), parseInt(opts.month, 10) - 1, 1, 0, 0, 0, 0);
        end = new Date(parseInt(opts.year, 10), parseInt(opts.month, 10), 0, 23, 59, 59, 999);
      } else if (opts.startDate && opts.endDate) {
        start = new Date(opts.startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(opts.endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (start || end) {
        filtered = filtered.filter((o) => {
          const recDate = new Date(o.payment?.recordedAt || o.createdAt);
          if (start && recDate < start) return false;
          if (end && recDate > end) return false;
          return true;
        });
      }
    }

    // Search
    if (opts.search && opts.search.trim()) {
      const q = opts.search.toLowerCase().trim();
      filtered = filtered.filter((o) => {
        const idMatch = (o.orderId || '').toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer?.phone || o.customer?.mobile || '').includes(q);
        return idMatch || nameMatch || phoneMatch;
      });
    }

    // Compute metrics
    let totalCash = 0;
    let totalUpi = 0;
    let dineInCol = 0;
    let pickupCol = 0;
    let pendingAmt = 0;
    let failedAmt = 0;
    let paidC = 0;
    let pendC = 0;
    let cashC = 0;
    let upiC = 0;

    const txs = filtered.map((o) => {
      const isDineIn = (o.orderType || '').toUpperCase() === 'DINE_IN';
      const isPaid = o.payment && o.payment.status === 'COMPLETED';
      const isFailed = o.payment && o.payment.status === 'FAILED';
      const isPending = !isPaid && !isFailed;
      const amt = Number(isPaid ? (o.payment?.amount || o.subtotal || 0) : (o.subtotal || 0));

      if (isPaid) {
        paidC++;
        if (o.payment.method === 'CASH') {
          totalCash += amt;
          cashC++;
        } else {
          totalUpi += amt;
          upiC++;
        }
        if (isDineIn) dineInCol += amt;
        else pickupCol += amt;
      } else if (isPending) {
        pendingAmt += amt;
        pendC++;
      } else if (isFailed) {
        failedAmt += amt;
      }

      return {
        orderId: o.orderId,
        orderType: isDineIn ? 'DINE_IN' : 'PICKUP',
        tableNumber: o.tableNumber || null,
        orderStatus: o.status || 'PLACED',
        customerName: o.customer?.name || (isDineIn ? 'Dine-In Guest' : 'Takeaway Customer'),
        customerMobile: o.customer?.mobile || o.customer?.phone || '',
        customerEmail: o.customer?.email || '',
        method: isPaid ? o.payment.method : (o.payment?.method || 'PENDING'),
        status: isPaid ? 'PAID' : (isFailed ? 'FAILED' : 'PENDING'),
        amount: amt,
        timestamp: isPaid && o.payment.recordedAt ? o.payment.recordedAt : o.createdAt,
        recordedBy: o.payment?.recordedBy || '—',
        transactionNote: o.payment?.transactionNote || null,
        instructions: o.instructions || '',
        createdAt: o.createdAt,
      };
    });

    setReportData({
      summary: {
        totalCashCollected: totalCash,
        totalUpiCollected: totalUpi,
        totalConfirmed: totalCash + totalUpi,
        dineInCollection: dineInCol,
        pickupCollection: pickupCol,
        pendingAmount: pendingAmt,
        failedAmount: failedAmt,
        totalTransactions: txs.length,
        paidCount: paidC,
        pendingCount: pendC,
        cashCount: cashC,
        upiCount: upiC,
      },
      transactions: txs,
    });
  };

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle Quick Filter Switch
  const handleQuickFilterClick = (filterKey) => {
    setQuickFilter(filterKey);
    // Reset custom inputs if switching away from CUSTOM
    if (filterKey !== 'CUSTOM') {
      setSelectedMonth('');
      setSelectedYear('');
      setFromDate('');
      setToDate('');
    }
  };

  // Handle Month / Year selection
  const handleMonthYearChange = (m, y) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setQuickFilter('CUSTOM');
    setFromDate('');
    setToDate('');
  };

  // Handle Custom From/To Date change
  const handleCustomDateChange = (from, to) => {
    setFromDate(from);
    setToDate(to);
    setQuickFilter('CUSTOM');
    setSelectedMonth('');
    setSelectedYear('');
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setQuickFilter('ALL');
    setSelectedMonth('');
    setSelectedYear('');
    setFromDate('');
    setToDate('');
    setMethodFilter('ALL');
    setOrderTypeFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    quickFilter !== 'ALL' ||
    selectedMonth !== '' ||
    selectedYear !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    methodFilter !== 'ALL' ||
    orderTypeFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  // Group transactions date-wise for chronological daily audit
  const dateWiseGroups = useMemo(() => {
    const groups = {};

    reportData.transactions.forEach((tx) => {
      const dateKey = tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : 'undated';

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          sampleTimestamp: tx.timestamp,
          transactions: [],
          totalPaid: 0,
          cashTotal: 0,
          upiTotal: 0,
          pendingTotal: 0,
        };
      }

      groups[dateKey].transactions.push(tx);

      if (tx.status === 'PAID') {
        groups[dateKey].totalPaid += tx.amount;
        if (tx.method === 'CASH') {
          groups[dateKey].cashTotal += tx.amount;
        } else if (tx.method === 'UPI') {
          groups[dateKey].upiTotal += tx.amount;
        }
      } else if (tx.status === 'PENDING') {
        groups[dateKey].pendingTotal += tx.amount;
      }
    });

    // Sort groups descending by dateKey
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [reportData.transactions]);

  // Phase 6: Export CSV
  const handleExportCSV = () => {
    const { summary, transactions } = reportData;
    if (transactions.length === 0) {
      setFeedbackToast({
        message: 'No transactions match the selected filters to export.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }

    try {
      // 1. Build CSV rows
      const headers = [
        'Transaction Date',
        'Time (IST)',
        'Order ID',
        'Order Type',
        'Table / Service',
        'Customer Name',
        'Customer Phone',
        'Payment Method',
        'Payment Status',
        'Amount (INR)',
        'Recorded By',
        'Transaction Note / Ref',
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = transactions.map((t) => [
        escapeCSV(formatDate(t.timestamp)),
        escapeCSV(formatTime(t.timestamp)),
        escapeCSV(t.orderId),
        escapeCSV(t.orderType === 'DINE_IN' ? 'Dine-In QR' : 'Parcel Pickup'),
        escapeCSV(t.tableNumber ? `Table #${t.tableNumber}` : 'Counter Pickup'),
        escapeCSV(t.customerName),
        escapeCSV(t.customerMobile ? `+91 ${t.customerMobile}` : '—'),
        escapeCSV(t.method),
        escapeCSV(t.status),
        t.amount,
        escapeCSV(t.recordedBy || '—'),
        escapeCSV(t.transactionNote || '—'),
      ]);

      // 2. Summary footer rows
      const emptyRow = ['', '', '', '', '', '', '', '', '', '', '', ''];
      const summaryHeader = ['--- REPORT SUMMARY ---', '', '', '', '', '', '', '', '', '', '', ''];
      const summaryRows = [
        ['Total Confirmed Collection (INR)', '', '', '', '', '', '', '', '', summary.totalConfirmed, '', ''],
        ['Total Cash Collected (INR)', '', '', '', '', '', '', '', '', summary.totalCashCollected, '', ''],
        ['Total UPI Collected (INR)', '', '', '', '', '', '', '', '', summary.totalUpiCollected, '', ''],
        ['Dine-in Collection (INR)', '', '', '', '', '', '', '', '', summary.dineInCollection, '', ''],
        ['Parcel Pickup Collection (INR)', '', '', '', '', '', '', '', '', summary.pickupCollection, '', ''],
        ['Pending / Unpaid Balance (INR)', '', '', '', '', '', '', '', '', summary.pendingAmount, '', ''],
        ['Total Transactions Count', '', '', '', '', '', '', '', '', summary.totalTransactions, '', ''],
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        emptyRow.join(','),
        summaryHeader.join(','),
        ...summaryRows.map((r) => r.join(',')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateTag = new Date().toISOString().split('T')[0];
      link.href = url;
      link.setAttribute('download', `trupti_transactions_report_${dateTag}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedbackToast({
        message: `Successfully exported ${transactions.length} transaction(s) to CSV!`,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err) {
      console.warn('CSV export error:', err);
      setFeedbackToast({
        message: 'Failed to generate CSV export.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  // Compute days in selected delete month
  const daysInDeleteMonth = useMemo(() => {
    const y = parseInt(deleteYear, 10);
    const m = parseInt(deleteMonth, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return 31;
    return new Date(y, m, 0).getDate();
  }, [deleteYear, deleteMonth]);

  const deleteMonthName = MONTHS.find((m) => String(m.value) === String(deleteMonth))?.label || 'Selected Month';
  const deletePeriodLabel = deleteDay === 'ALL'
    ? `${deleteMonthName} ${deleteYear}`
    : `${deleteDay} ${deleteMonthName} ${deleteYear}`;
  const deleteMethodLabel = deleteMethod === 'CASH'
    ? 'Cash'
    : deleteMethod === 'UPI'
    ? 'UPI'
    : 'Cash & UPI';

  // Live preview fetcher for matching transactions count and amount
  useEffect(() => {
    if (!showDeletePopover && !showDeleteConfirmModal) return;

    let isCancelled = false;
    const fetchPreview = async () => {
      setDeletePreviewLoading(true);
      setDeleteError(null);
      try {
        const res = await adminOrderApi.getTransactionsDeletePreview({
          year: deleteYear,
          month: deleteMonth,
          day: deleteDay,
          method: deleteMethod,
        });

        if (!isCancelled) {
          if (res && res.success) {
            setDeletePreview({ count: res.count, totalAmount: res.totalAmount });
          } else {
            // Local fallback calculation from current transactions
            const matching = reportData.transactions.filter((tx) => {
              if (tx.status !== 'PAID') return false;
              if (deleteMethod !== 'ALL' && tx.method !== deleteMethod) return false;
              if (!tx.timestamp) return false;
              const d = new Date(tx.timestamp);
              if (d.getFullYear() !== parseInt(deleteYear, 10)) return false;
              if (d.getMonth() + 1 !== parseInt(deleteMonth, 10)) return false;
              if (deleteDay !== 'ALL' && d.getDate() !== parseInt(deleteDay, 10)) return false;
              return true;
            });
            const totalAmt = matching.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            setDeletePreview({ count: matching.length, totalAmount: totalAmt });
          }
        }
      } catch {
        if (!isCancelled) {
          const matching = reportData.transactions.filter((tx) => {
            if (tx.status !== 'PAID') return false;
            if (deleteMethod !== 'ALL' && tx.method !== deleteMethod) return false;
            if (!tx.timestamp) return false;
            const d = new Date(tx.timestamp);
            if (d.getFullYear() !== parseInt(deleteYear, 10)) return false;
            if (d.getMonth() + 1 !== parseInt(deleteMonth, 10)) return false;
            if (deleteDay !== 'ALL' && d.getDate() !== parseInt(deleteDay, 10)) return false;
            return true;
          });
          const totalAmt = matching.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          setDeletePreview({ count: matching.length, totalAmount: totalAmt });
        }
      } finally {
        if (!isCancelled) setDeletePreviewLoading(false);
      }
    };

    fetchPreview();
    return () => {
      isCancelled = true;
    };
  }, [showDeletePopover, showDeleteConfirmModal, deleteYear, deleteMonth, deleteDay, deleteMethod, reportData.transactions]);

  // Dismiss popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (deletePopoverRef.current && !deletePopoverRef.current.contains(event.target)) {
        setShowDeletePopover(false);
      }
    }
    if (showDeletePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDeletePopover]);

  // Dismiss modal on ESC
  useEffect(() => {
    if (!showDeleteConfirmModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        setShowDeleteConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (cancelDeleteBtnRef.current) {
      cancelDeleteBtnRef.current.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirmModal, isDeleting]);

  // Execute safe transactions deletion
  const handleConfirmDeleteTransactions = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await adminOrderApi.deleteTransactions({
        year: deleteYear,
        month: deleteMonth,
        day: deleteDay,
        method: deleteMethod,
      });

      if (res && res.success) {
        setShowDeleteConfirmModal(false);
        setFeedbackToast({
          type: 'success',
          message: res.message || `Deleted ${deletePreview.count} transactions totaling ₹${deletePreview.totalAmount}.`,
        });
        setTimeout(() => setFeedbackToast(null), 4000);
        // Refresh transaction records and totals
        await fetchReport();
      } else {
        setDeleteError(res?.error || 'Failed to delete transactions.');
      }
    } catch (err) {
      setDeleteError(err.message || 'An unexpected error occurred while deleting transactions.');
    } finally {
      setIsDeleting(false);
    }
  };

  const { summary } = reportData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all animate-fadeIn ${
            feedbackToast.type === 'success'
              ? 'bg-primary text-white border border-accent/60'
              : 'bg-red-900 text-white border border-red-500'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              feedbackToast.type === 'success' ? 'bg-accent animate-pulse' : 'bg-red-400'
            }`}
          />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. PAGE HEADER & AUDIT ACTIONS                                 */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              Cash & UPI Transactions
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Payment Audit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            Audit, reconcile, filter, and export verified restaurant collections across Dine-in and Parcel Pickup.
          </p>
        </div>

        {/* Action Controls: Refresh & Export CSV */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-surface-border text-primary hover:bg-slate-50 text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh transaction records"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-95"
            title="Export filtered records and totals to CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>

          {/* Delete Transactions Popover Control (Order History Style) */}
          <div ref={deletePopoverRef} className="relative">
            <button
              type="button"
              onClick={() => setShowDeletePopover((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs ${
                showDeletePopover
                  ? 'bg-white text-primary border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-sm -translate-y-[1px]'
                  : 'bg-white text-primary border-zinc-200/90 hover:border-[#D4AF37]/80 hover:shadow-sm hover:-translate-y-[1px]'
              }`}
              aria-expanded={showDeletePopover}
              aria-label="Delete Transactions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 text-rose-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Transactions</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  showDeletePopover ? 'rotate-180 text-[#D4AF37]' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Popover */}
            {showDeletePopover && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[280px] xs:w-80 sm:w-88 max-w-[calc(100vw-2.5rem)] sm:max-w-none bg-white rounded-2xl border border-surface-border shadow-xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                  <span className="text-xs font-bold text-primary tracking-tight">
                    Delete Transactions
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    Admin Only
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Year Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1">
                      Year
                    </label>
                    <select
                      value={deleteYear}
                      onChange={(e) => setDeleteYear(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-secondary border border-surface-border rounded-xl font-semibold text-primary focus:outline-none focus:border-accent"
                    >
                      {SUPPORTED_DELETE_YEARS.map((y) => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1">
                      Month
                    </label>
                    <select
                      value={deleteMonth}
                      onChange={(e) => setDeleteMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-secondary border border-surface-border rounded-xl font-semibold text-primary focus:outline-none focus:border-accent"
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={String(m.value)}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Day / Date Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1">
                      Date / Day
                    </label>
                    <select
                      value={deleteDay}
                      onChange={(e) => setDeleteDay(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-secondary border border-surface-border rounded-xl font-semibold text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="ALL">All Days in Month</option>
                      {Array.from({ length: daysInDeleteMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d)}>Day {d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-muted uppercase tracking-wider mb-1">
                      Payment Method
                    </label>
                    <select
                      value={deleteMethod}
                      onChange={(e) => setDeleteMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-secondary border border-surface-border rounded-xl font-semibold text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="ALL">All Transactions (Cash + UPI)</option>
                      <option value="CASH">Cash Transactions Only</option>
                      <option value="UPI">UPI Transactions Only</option>
                    </select>
                  </div>

                  {/* Matching Count & Amount Preview Card */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-surface-border flex items-center justify-between">
                    <div>
                      <span className="text-muted block text-[11px] font-medium">Matching:</span>
                      <span className="text-sm font-extrabold text-primary">
                        {deletePreviewLoading ? 'Checking...' : `${deletePreview.count} txns`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted block text-[11px] font-medium">Total Amount:</span>
                      <span className="text-sm font-extrabold text-rose-600 font-mono">
                        {deletePreviewLoading ? '...' : `₹${deletePreview.totalAmount}`}
                      </span>
                    </div>
                  </div>

                  {/* Destructive Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeletePopover(false);
                      setShowDeleteConfirmModal(true);
                    }}
                    disabled={deletePreview.count === 0 || deletePreviewLoading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white/90 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete {deleteMethodLabel} ({deletePreview.count})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchReport} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. EXECUTIVE PAYMENT SUMMARY CARDS (Phase 3)                   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        {/* Card 1: Total Cash Collected */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider leading-tight">
              Cash Collected
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              💵
            </div>
          </div>
          <div className="mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-950 font-sans tracking-tight block">
              ₹{summary.totalCashCollected || 0}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
              {summary.cashCount || 0} {summary.cashCount === 1 ? 'payment' : 'payments'}
            </span>
          </div>
        </div>

        {/* Card 2: Total UPI Collected */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider leading-tight">
              UPI Collected
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
              📱
            </div>
          </div>
          <div className="mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-950 font-sans tracking-tight block">
              ₹{summary.totalUpiCollected || 0}
            </span>
            <span className="text-[10px] text-indigo-700 font-semibold mt-0.5 block">
              {summary.upiCount || 0} {summary.upiCount === 1 ? 'payment' : 'payments'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Confirmed Collection */}
        <div className="bg-primary text-white rounded-2xl border border-accent/40 p-3.5 sm:p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-accent uppercase tracking-wider leading-tight">
              Confirmed Total
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
              💰
            </div>
          </div>
          <div className="mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-accent font-sans tracking-tight block">
              ₹{summary.totalConfirmed || 0}
            </span>
            <span className="text-[10px] text-slate-300 font-semibold mt-0.5 block">
              {summary.paidCount || 0} verified orders
            </span>
          </div>
        </div>

        {/* Card 4: Dine-in Collection */}
        <div className="bg-white rounded-2xl border border-surface-border p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider leading-tight">
              Dine-In QR Sales
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-100 text-primary flex items-center justify-center font-bold text-sm">
              🍽️
            </div>
          </div>
          <div className="mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-primary font-sans tracking-tight block">
              ₹{summary.dineInCollection || 0}
            </span>
            <span className="text-[10px] text-muted font-semibold mt-0.5 block">
              In-hall table dining
            </span>
          </div>
        </div>

        {/* Card 5: Parcel Pickup Collection */}
        <div className="bg-white rounded-2xl border border-surface-border p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider leading-tight">
              Parcel Pickup Sales
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-100 text-primary flex items-center justify-center font-bold text-sm">
              🛍️
            </div>
          </div>
          <div className="mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-primary font-sans tracking-tight block">
              ₹{summary.pickupCollection || 0}
            </span>
            <span className="text-[10px] text-muted font-semibold mt-0.5 block">
              Counter takeaways
            </span>
          </div>
        </div>

        {/* Card 6: Pending Outstanding Balance */}
        <div className="bg-white rounded-2xl border border-amber-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider leading-tight">
              Pending Balance
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              ⏳
            </div>
          </div>
          <div className="mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-950 font-sans tracking-tight block">
              ₹{summary.pendingAmount || 0}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">
              {summary.pendingCount || 0} {summary.pendingCount === 1 ? 'unpaid order' : 'unpaid orders'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MULTI-DIMENSIONAL FILTERS TOOLBAR (Phase 2)                 */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-surface-border shadow-xs space-y-4">
        {/* Row A: Quick Time Window Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-primary uppercase tracking-wider mr-1">
              Timeframe:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleQuickFilterClick(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  quickFilter === f.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-secondary text-primary hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-accent hover:text-accent-hover transition-colors underline cursor-pointer self-start md:self-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Row B: Month/Year Dropdowns & From/To Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Month Selector */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthYearChange(e.target.value, selectedYear || CURRENT_YEAR)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => handleMonthYearChange(selectedMonth || (new Date().getMonth() + 1), e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            >
              <option value="">All Years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleCustomDateChange(e.target.value, toDate)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleCustomDateChange(fromDate, e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Row C: Method, Order Type, Status & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Methods (Cash & UPI)</option>
              <option value="CASH">💵 Cash Only</option>
              <option value="UPI">📱 UPI Only</option>
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              Order Type
            </label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Types (Dine-in & Parcel)</option>
              <option value="DINE_IN">🍽️ Dine-in QR Table Orders</option>
              <option value="PICKUP">🛍️ Parcel Takeaway Orders</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">✓ Paid / Confirmed</option>
              <option value="PENDING">⏳ Pending / Unpaid</option>
              <option value="FAILED">✕ Failed / Refunded</option>
            </select>
          </div>

          {/* Search by Order ID or Customer Name */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
              Search Record
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order ID, Customer name, phone..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-secondary border border-surface-border rounded-xl font-medium focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. DATE-WISE TRANSACTIONS AUDIT TABLE (Phase 4)                */}
      {/* ============================================================== */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-surface-border p-12 text-center shadow-xs space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted">Loading transaction records from database...</p>
        </div>
      ) : dateWiseGroups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-border p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-secondary text-primary mx-auto flex items-center justify-center text-3xl">
            💳
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-primary">
              No matching transaction records found
            </h2>
            <p className="text-xs text-muted max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your date range, payment method, or clearing search criteria.'
                : 'No payments have been recorded yet. When cash or UPI settlements are recorded, they will appear here.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {dateWiseGroups.map((group) => (
            <div
              key={group.dateKey}
              className="bg-white rounded-3xl border border-surface-border shadow-xs overflow-hidden"
            >
              {/* Daily Group Subtotal Header */}
              <div className="px-5 sm:px-6 py-4 bg-secondary/70 border-b border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <h2 className="text-sm sm:text-base font-black text-primary tracking-tight">
                    {formatDateGroupHeading(group.sampleTimestamp)}
                  </h2>
                  <span className="text-[11px] font-bold text-muted bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    {group.transactions.length} {group.transactions.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                {/* Daily Subtotal Figures */}
                <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                  <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    💵 Cash: ₹{group.cashTotal}
                  </span>
                  <span className="text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                    📱 UPI: ₹{group.upiTotal}
                  </span>
                  <span className="text-primary bg-accent/20 px-3 py-1 rounded-xl border border-accent/40 font-extrabold">
                    Day Total: ₹{group.totalPaid}
                  </span>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-surface-border bg-slate-50/50 text-muted text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-5">Recorded By / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {group.transactions.map((t) => (
                      <tr key={t.orderId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Time */}
                        <td className="py-3.5 px-5 font-mono text-[11px] text-muted whitespace-nowrap">
                          {formatTime(t.timestamp)}
                        </td>

                        {/* Order ID Link */}
                        <td className="py-3.5 px-4 font-mono font-black text-primary">
                          <Link
                            to={`/admin/orders/${t.orderId}`}
                            className="hover:text-accent transition-colors"
                            title="View full order details"
                          >
                            #{t.orderId}
                          </Link>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-primary truncate max-w-[150px]">
                            {t.customerName}
                          </div>
                          {t.customerMobile && (
                            <div className="font-mono text-[10px] text-muted">
                              +91 {t.customerMobile}
                            </div>
                          )}
                        </td>

                        {/* Order Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {t.orderType === 'DINE_IN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary text-white font-extrabold text-[10.5px]">
                              <span>🍽️</span>
                              <span>{t.tableNumber || 'Dine-In'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-extrabold text-[10.5px]">
                              <span>🛍️</span>
                              <span>Parcel</span>
                            </span>
                          )}
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {t.status === 'PAID' ? (
                            t.method === 'CASH' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                                <span>💵</span>
                                <span>Cash</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]">
                                <span>📱</span>
                                <span>UPI</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 font-semibold text-[11px]">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {t.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10.5px]">
                              ✓ Paid
                            </span>
                          ) : t.status === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10.5px]">
                              ✕ Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10.5px]">
                              ⏳ Unpaid
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-black text-sm text-primary">
                          ₹{t.amount}
                        </td>

                        {/* Recorded By / Ref */}
                        <td className="py-3.5 px-5 text-[11px] text-muted max-w-[180px]">
                          <div className="truncate font-semibold text-slate-700">
                            {t.recordedBy !== '—' ? `By: ${t.recordedBy}` : 'Unrecorded'}
                          </div>
                          {t.transactionNote && (
                            <div className="truncate italic text-[10px] text-slate-500" title={t.transactionNote}>
                              &ldquo;{t.transactionNote}&rdquo;
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tablet & Mobile Responsive Cards View */}
              <div className="block lg:hidden divide-y divide-surface-border/60">
                {group.transactions.map((t) => (
                  <div key={t.orderId} className="p-4 sm:p-5 space-y-2.5 hover:bg-slate-50 transition-colors">
                    {/* Top Row: Time, Order ID, and Amount */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/orders/${t.orderId}`}
                          className="font-mono font-black text-sm text-primary hover:text-accent"
                        >
                          #{t.orderId}
                        </Link>
                        <span className="text-[11px] font-mono text-muted">
                          &bull; {formatTime(t.timestamp)}
                        </span>
                      </div>
                      <span className="font-mono font-black text-base text-primary">
                        ₹{t.amount}
                      </span>
                    </div>

                    {/* Middle Row: Customer & Order Type */}
                    <div className="flex items-center justify-between text-xs text-muted flex-wrap gap-1.5">
                      <div className="font-semibold text-primary">
                        {t.customerName}
                        {t.customerMobile && (
                          <span className="font-mono text-[11px] text-muted ml-1.5">
                            (+91 {t.customerMobile})
                          </span>
                        )}
                      </div>

                      <div>
                        {t.orderType === 'DINE_IN' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary text-white font-extrabold text-[10px]">
                            <span>🍽️</span>
                            <span>{t.tableNumber || 'Dine-In'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-extrabold text-[10px]">
                            <span>🛍️</span>
                            <span>Parcel</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Payment Method, Status Badge, and View Link */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        {t.status === 'PAID' ? (
                          t.method === 'CASH' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10.5px]">
                              <span>💵</span>
                              <span>Cash</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[10.5px]">
                              <span>📱</span>
                              <span>UPI</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10.5px]">
                            ⏳ Unpaid
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500">
                          {t.recordedBy !== '—' ? `Recorded by ${t.recordedBy}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. CONFIRMATION DIALOG: DELETE TRANSACTIONS                    */}
      {/* ============================================================== */}
      {showDeleteConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-transactions-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-surface-border p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3
                  id="delete-transactions-title"
                  className="text-base sm:text-lg font-extrabold text-primary"
                >
                  Delete {deleteMethodLabel} Transactions?
                </h3>
                <p
                  className="text-xs sm:text-sm text-muted leading-relaxed"
                >
                  This will permanently delete the selected verified payment transaction records from the database. Customer order records, menu items, and dining tables will remain safely preserved.
                </p>
              </div>
            </div>

            {/* Scope Details Card */}
            <div className="p-3.5 rounded-2xl bg-secondary/70 border border-surface-border text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted">Selected Period:</span>
                <strong className="text-primary font-semibold">{deletePeriodLabel}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Payment Method:</span>
                <strong className="text-primary font-semibold">{deleteMethodLabel}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Transactions:</span>
                <strong className="text-rose-700 font-bold font-sans">{deletePreview.count} transactions</strong>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/80 pt-1.5 mt-1">
                <span className="text-muted">Total Amount:</span>
                <strong className="text-rose-700 font-black font-mono text-sm">₹{deletePreview.totalAmount}</strong>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            {/* Buttons: Cancel and Delete Transactions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <button
                ref={cancelDeleteBtnRef}
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteTransactions}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Transactions</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
