import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminTableApi from '../../services/adminTableApi.js';

/**
 * Normalizes a table number for robust comparisons:
 * - Trims leading and trailing whitespace
 * - Converts to lowercase
 * - Collapses multiple internal spaces into a single space
 */
export function normalizeTableNumber(num) {
  return (num || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Determines whether two table numbers are duplicates:
 * - Case-insensitive match ('Table 1' vs 'table 1')
 * - Whitespace-insensitive match ('  Table 1  ' vs 'Table   1')
 * - Equivalent numbering match ('Table 1' vs '1', 'T-1' vs 'Table 1')
 */
export function isDuplicateTable(existingNumber, targetNumber) {
  const normExisting = normalizeTableNumber(existingNumber);
  const normTarget = normalizeTableNumber(targetNumber);
  if (!normTarget || !normExisting) return false;
  if (normExisting === normTarget) return true;

  // Compare cleaned numeric representation if formatted with standard prefixes (Table, Tbl, T)
  const stripPrefix = (s) => s.replace(/^(table|tbl|t)[-\s]*/i, '').trim();
  const cleanExisting = stripPrefix(normExisting);
  const cleanTarget = stripPrefix(normTarget);
  return Boolean(cleanExisting && cleanTarget && cleanExisting === cleanTarget);
}

/**
 * Initial sample mock data exported for test suites and QR preview fallback compatibility
 */
export const SAMPLE_TABLES = [
  {
    id: 'tbl-1',
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
    updatedAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'tbl-2',
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
    updatedAt: '2026-02-12T11:30:00Z',
  },
  {
    id: 'tbl-3',
    tableNumber: 'Table 3',
    name: 'Family Central',
    capacity: 6,
    status: 'Active',
    updatedAt: '2026-02-15T09:15:00Z',
  },
  {
    id: 'tbl-4',
    tableNumber: 'Table 4',
    name: 'Terrace Corner',
    capacity: 4,
    status: 'Inactive',
    updatedAt: '2026-02-18T14:20:00Z',
  },
];

/**
 * AdminTablesPage Component
 * Full-featured Table Management connected to MongoDB-backed REST API.
 *
 * Implements:
 * - Data Persistence: Live fetching and syncing with /api/admin/tables.
 * - Add Table: Modal form with server-backed creation and duplicate-key handling.
 * - Edit Table: Pre-fills existing values, validates changes, updates via API.
 * - Activate/Deactivate: Non-destructive status toggle via API; confirmation before deactivation.
 * - Summary Metrics: Live Total Tables, Active Tables, Inactive Tables, and Total Guest Seats.
 * - Responsive UI: Desktop table layout and mobile touch-friendly card list.
 * - Error & Loading States: Honest loading skeleton and retryable API failure banner.
 */
export default function AdminTablesPage() {
  // Live tables list state & loading states
  const [tables, setTables] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Search, filter, and sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Inactive'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'number-asc' | 'capacity-desc' | 'capacity-asc'

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null); // null = Add mode; object = Edit mode
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Modal State for Deactivation
  const [tableToDeactivate, setTableToDeactivate] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Confirmation Modal State for Deletion
  const [tableToDelete, setTableToDelete] = useState(null);
  const [isDeletingTable, setIsDeletingTable] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Form Fields
  const [formTableNumber, setFormTableNumber] = useState('');
  const [formTableName, setFormTableName] = useState('');
  const [formCapacity, setFormCapacity] = useState('4');
  const [formStatus, setFormStatus] = useState('Active');
  const [formErrors, setFormErrors] = useState({});

  // Feedback banner state
  const [feedback, setFeedback] = useState(null);

  // Ref for autofocusing table number input on modal open
  const tableNumberInputRef = useRef(null);

  // Fetch tables from backend API
  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await adminTableApi.getTables();
      if (res && res.tables) {
        setTables(res.tables);
        setMetrics(res.metrics);
      } else {
        setTables([]);
      }
    } catch (err) {
      console.error('[AdminTablesPage] Failed to fetch tables:', err);
      // Honest error state: do not silently fall back to mock data
      setFetchError(err.message || 'Unable to connect to the restaurant table service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Auto-dismiss toast feedback after 4.5 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Handle ESC key to dismiss open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (tableToDelete && !isDeletingTable) {
          handleCancelDeleteTable();
        } else if (tableToDeactivate && !isTogglingStatus) {
          setTableToDeactivate(null);
        } else if (isModalOpen && !isSaving) {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, tableToDeactivate, tableToDelete, isSaving, isTogglingStatus, isDeletingTable]);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isModalOpen && tableNumberInputRef.current) {
      setTimeout(() => {
        tableNumberInputRef.current?.focus();
      }, 50);
    }
  }, [isModalOpen]);

  // Summary Metrics calculations (derived from API response or active table state)
  const totalTables = metrics?.total ?? tables.length;
  const activeTables = metrics?.active ?? tables.filter((t) => t.status === 'Active').length;
  const inactiveTables = metrics?.inactive ?? (totalTables - activeTables);
  const totalCapacity =
    metrics?.totalCapacity ??
    tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);

  // Open Modal in Add Mode
  const handleOpenAddModal = () => {
    setEditingTable(null);
    setFormTableNumber('');
    setFormTableName('');
    setFormCapacity('4');
    setFormStatus('Active');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Modal in Edit Mode
  const handleOpenEditModal = (table) => {
    setEditingTable(table);
    setFormTableNumber(table.tableNumber);
    setFormTableName(table.name || '');
    setFormCapacity(String(table.capacity));
    setFormStatus(table.status);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Close Modal & Reset Form State
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTable(null);
    setFormTableNumber('');
    setFormTableName('');
    setFormCapacity('4');
    setFormStatus('Active');
    setFormErrors({});
    setIsSaving(false);
  };

  // Capacity Stepper Controls (Min: 1, Max: 50)
  const handleIncrementCapacity = () => {
    const cur = parseInt(formCapacity, 10);
    const nextVal = isNaN(cur) ? 1 : Math.min(50, cur + 1);
    setFormCapacity(String(nextVal));
    if (formErrors.capacity || formErrors.general) {
      setFormErrors((prev) => ({ ...prev, capacity: null, general: null }));
    }
  };

  const handleDecrementCapacity = () => {
    const cur = parseInt(formCapacity, 10);
    const nextVal = isNaN(cur) ? 1 : Math.max(1, cur - 1);
    setFormCapacity(String(nextVal));
    if (formErrors.capacity || formErrors.general) {
      setFormErrors((prev) => ({ ...prev, capacity: null, general: null }));
    }
  };

  // Validate form inputs client-side before sending to API
  const validateForm = () => {
    const errors = {};
    const trimmedNumber = formTableNumber.trim();

    // 1. Table number cannot be empty
    if (!trimmedNumber) {
      errors.tableNumber = 'Table Number is required.';
    } else {
      // 2. Client-side duplicate check against loaded tables
      const duplicateExists = tables.some((tbl) => {
        const tblId = tbl.id || tbl._id;
        const currentId = editingTable ? (editingTable.id || editingTable._id) : null;
        if (currentId && tblId === currentId) {
          return false;
        }
        return isDuplicateTable(tbl.tableNumber, trimmedNumber);
      });

      if (duplicateExists) {
        errors.tableNumber = `Table number "${trimmedNumber}" already exists. Please enter a unique table number.`;
      }
    }

    // 3. Seating capacity must be a positive integer
    const parsedCapacity = Number(formCapacity);
    if (!formCapacity || isNaN(parsedCapacity) || parsedCapacity <= 0 || !Number.isInteger(parsedCapacity)) {
      errors.capacity = 'Seating capacity must be a positive whole integer (at least 1).';
    } else if (parsedCapacity > 50) {
      errors.capacity = 'Maximum recommended capacity per table is 50 seats.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Add/Edit Form Submission to Backend API
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    const trimmedNumber = formTableNumber.trim();
    const trimmedName = formTableName.trim();
    const capacityNum = parseInt(formCapacity, 10);

    try {
      if (editingTable) {
        // Update existing table via API
        const targetId = editingTable.id || editingTable._id;
        const result = await adminTableApi.updateTable(targetId, {
          tableNumber: trimmedNumber,
          name: trimmedName,
          capacity: capacityNum,
          status: formStatus,
        });

        // Update local state and refresh
        setTables((prev) =>
          prev.map((tbl) =>
            (tbl.id || tbl._id) === targetId ? result.table : tbl
          )
        );

        setFeedback({
          type: 'success',
          message: `"${trimmedNumber}" updated successfully.`,
        });

        closeModal();
        await loadTables();
      } else {
        // Create new table via API
        const result = await adminTableApi.createTable({
          tableNumber: trimmedNumber,
          name: trimmedName,
          capacity: capacityNum,
          status: formStatus,
        });

        setTables((prev) => [result.table, ...prev]);

        setFeedback({
          type: 'success',
          message: `New table "${trimmedNumber}" added successfully.`,
        });

        closeModal();
        await loadTables();
      }
    } catch (err) {
      console.error('[AdminTablesPage] Form save error:', err);
      // Server returned duplicate error or validation error
      if (err.status === 409 || err.message?.toLowerCase().includes('already exists')) {
        setFormErrors({
          tableNumber: err.message || `Table number "${trimmedNumber}" already exists.`,
        });
      } else if (err.status === 400) {
        setFormErrors({
          general: err.message || 'Invalid table information. Please check all fields.',
        });
      } else {
        setFormErrors({
          general: err.message || 'Failed to save table. Please try again.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Request Activate / Deactivate status toggle
  const handleRequestToggleStatus = (table) => {
    if (table.status === 'Active') {
      // Show confirmation dialog before deactivating an active table
      setTableToDeactivate(table);
    } else {
      // Directly activate the inactive table
      handleActivateTable(table);
    }
  };

  // Activate table directly via API
  const handleActivateTable = async (table) => {
    const targetId = table.id || table._id;
    setIsTogglingStatus(true);
    try {
      const result = await adminTableApi.updateTableStatus(targetId, 'Active');
      setTables((prev) =>
        prev.map((tbl) =>
          (tbl.id || tbl._id) === targetId ? result.table : tbl
        )
      );
      setFeedback({
        type: 'success',
        message: `"${table.tableNumber}" is now Active and ready for dine-in guests.`,
      });
      await loadTables();
    } catch (err) {
      console.error('[AdminTablesPage] Activate error:', err);
      setFeedback({
        type: 'error',
        message: err.message || `Failed to activate "${table.tableNumber}".`,
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Confirm deactivation from dialog via API
  const handleConfirmDeactivate = async () => {
    if (!tableToDeactivate) return;
    const target = tableToDeactivate;
    const targetId = target.id || target._id;

    setIsTogglingStatus(true);
    try {
      const result = await adminTableApi.updateTableStatus(targetId, 'Inactive');
      setTables((prev) =>
        prev.map((tbl) =>
          (tbl.id || tbl._id) === targetId ? result.table : tbl
        )
      );
      setFeedback({
        type: 'info',
        message: `"${target.tableNumber}" has been deactivated.`,
      });
      setTableToDeactivate(null);
      await loadTables();
    } catch (err) {
      console.error('[AdminTablesPage] Deactivate error:', err);
      setFeedback({
        type: 'error',
        message: err.message || `Failed to deactivate "${target.tableNumber}".`,
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Cancel deactivation dialog
  const handleCancelDeactivate = () => {
    setTableToDeactivate(null);
  };

  // Open Delete Confirmation Modal
  const handleRequestDeleteTable = (table) => {
    setTableToDelete(table);
    setDeleteError(null);
  };

  // Cancel deletion dialog
  const handleCancelDeleteTable = () => {
    if (isDeletingTable) return;
    setTableToDelete(null);
    setDeleteError(null);
  };

  // Confirm deletion from dialog via API
  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete || isDeletingTable) return;
    const target = tableToDelete;
    const targetId = target.id || target._id;

    setIsDeletingTable(true);
    setDeleteError(null);
    try {
      const result = await adminTableApi.deleteTable(targetId);

      // Optimistically remove from state and refresh from database
      setTables((prev) => prev.filter((tbl) => (tbl.id || tbl._id) !== targetId));
      setFeedback({
        type: 'success',
        message: result?.message || `"${target.tableNumber}" deleted successfully.`,
      });
      setTableToDelete(null);
      await loadTables();
    } catch (err) {
      console.error('[AdminTablesPage] Delete error:', err);
      setDeleteError(err.message || `Failed to delete "${target.tableNumber}".`);
    } finally {
      setIsDeletingTable(false);
    }
  };

  // Filter & Sort tables
  const filteredTables = useMemo(() => {
    let result = [...tables];

    // Search query filter (matches tableNumber or name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.tableNumber.toLowerCase().includes(q) ||
          (t.name && t.name.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Sorting
    if (sortBy === 'number-asc') {
      result.sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: 'base' })
      );
    } else if (sortBy === 'capacity-desc') {
      result.sort((a, b) => b.capacity - a.capacity);
    } else if (sortBy === 'capacity-asc') {
      result.sort((a, b) => a.capacity - b.capacity);
    }

    return result;
  }, [tables, searchQuery, statusFilter, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || sortBy !== 'default';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSortBy('default');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
            Table Management
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage restaurant tables and prepare for dine-in ordering
          </p>
        </div>

        {/* Primary Actions: QR Codes, Refresh & Add Table */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadTables}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs border border-slate-200 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh tables from server"
            aria-label="Refresh table records"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent' : 'text-slate-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/admin/tables/qr"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-primary text-xs font-bold transition shadow-xs border border-slate-200 active:scale-95"
            aria-label="Manage table QR codes"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Table QR Codes</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs font-bold transition shadow-xs cursor-pointer border border-primary-light active:scale-95"
            aria-label="Add new restaurant table"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Table</span>
          </button>
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
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                feedback.type === 'success'
                  ? 'bg-emerald-500'
                  : feedback.type === 'error'
                  ? 'bg-rose-500'
                  : 'bg-amber-500'
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
              <p className="font-bold">Failed to load live tables</p>
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
            <p className="text-[11px] text-slate-400 mt-0.5">Floor layout capacity</p>
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

        {/* Active Tables */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Tables
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
              {isLoading ? '...' : activeTables}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ready for dine-in guests</p>
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

        {/* Inactive Tables */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Inactive Tables
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-500 mt-1">
              {isLoading ? '...' : inactiveTables}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Reserved or closed</p>
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

        {/* Total Guest Seats */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-3 lg:col-span-1">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Guest Seats
            </p>
            <p className="text-2xl sm:text-3xl font-black text-accent mt-1">
              {isLoading ? '...' : totalCapacity}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cumulative seating capacity</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent-light/60 text-accent flex items-center justify-center flex-shrink-0 border border-accent/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
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
              placeholder="Search by table number or name..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent focus:bg-white text-primary placeholder-slate-400 transition"
              aria-label="Search tables"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-semibold text-primary cursor-pointer"
              aria-label="Filter tables by status"
            >
              <option value="ALL">All Status ({totalTables})</option>
              <option value="Active">Active Only ({activeTables})</option>
              <option value="Inactive">Inactive Only ({inactiveTables})</option>
            </select>

            {/* Sorting Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-semibold text-primary cursor-pointer"
              aria-label="Sort tables"
            >
              <option value="default">Default Order</option>
              <option value="number-asc">Table Number (A-Z)</option>
              <option value="capacity-desc">Capacity: High to Low</option>
              <option value="capacity-asc">Capacity: Low to High</option>
            </select>
          </div>
        </div>

        {/* Active Filter Summary Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredTables.length}</strong> of {totalTables} tables
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-accent font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* TABLES LIST CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading && tables.length === 0 ? (
          /* Honest Loading Skeleton State */
          <div className="p-8 text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-3 border-accent border-t-transparent rounded-full mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading tables from database...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-4 text-center space-y-3">
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
            <h2 className="text-base font-bold text-primary">No Matching Tables Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tables match your current search query or status filter. Try clearing filters or create a new table.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-primary text-accent text-xs font-bold rounded-xl hover:bg-primary-light transition cursor-pointer border border-primary-light"
              >
                Add Table
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (Visible >= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Restaurant Tables List">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3 px-5">Table Number</th>
                    <th className="py-3 px-5">Table Name</th>
                    <th className="py-3 px-5 text-center">Capacity</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTables.map((table) => {
                    const isActive = table.status === 'Active';
                    const tableKey = table.id || table._id;

                    return (
                      <tr key={tableKey} className="hover:bg-slate-50/80 transition-colors">
                        {/* Table Number */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary text-white font-extrabold flex items-center justify-center text-xs shadow-xs border border-primary-light flex-shrink-0">
                              {table.tableNumber.replace(/[^0-9]/g, '') || '#'}
                            </div>
                            <div>
                              <span className="font-extrabold text-primary text-sm tracking-tight block">
                                {table.tableNumber}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ID: {tableKey}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Table Name */}
                        <td className="py-4 px-5">
                          {table.name ? (
                            <span className="font-semibold text-slate-800 text-xs">
                              {table.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              (No custom name)
                            </span>
                          )}
                        </td>

                        {/* Capacity */}
                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3.5 h-3.5 text-slate-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{table.capacity} Seats</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            <span>{table.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Activate / Deactivate Action */}
                            <button
                              type="button"
                              disabled={isTogglingStatus || isDeletingTable}
                              onClick={() => handleRequestToggleStatus(table)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer active:scale-95 disabled:opacity-50 ${
                                isActive
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={isActive ? 'Deactivate table (requires confirmation)' : 'Activate table'}
                              aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${table.tableNumber}`}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            {/* Edit Action */}
                            <button
                              type="button"
                              disabled={isDeletingTable}
                              onClick={() => handleOpenEditModal(table)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                              title={`Edit ${table.tableNumber}`}
                              aria-label={`Edit ${table.tableNumber}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 text-slate-600 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>

                            {/* Delete Action */}
                            <button
                              type="button"
                              disabled={isDeletingTable || isTogglingStatus}
                              onClick={() => handleRequestDeleteTable(table)}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-semibold border border-rose-200 transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                              title={`Delete ${table.tableNumber}`}
                              aria-label={`Delete ${table.tableNumber}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 text-rose-600 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (Visible < md screens, accessible touch targets, no horizontal overflow) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredTables.map((table) => {
                const isActive = table.status === 'Active';
                const tableKey = table.id || table._id;

                return (
                  <div key={tableKey} className="p-4 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary text-white font-extrabold flex items-center justify-center text-sm shadow-xs border border-primary-light flex-shrink-0">
                          {table.tableNumber.replace(/[^0-9]/g, '') || '#'}
                        </div>
                        <div className="min-w-0 truncate">
                          <h2 className="font-extrabold text-primary text-sm leading-snug truncate">
                            {table.tableNumber}
                          </h2>
                          {table.name ? (
                            <span className="text-xs text-slate-600 block mt-0.5 truncate">
                              {table.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block mt-0.5">
                              No custom name
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border flex-shrink-0 ${
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

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
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
                      </span>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {tableKey}
                      </span>
                    </div>

                    {/* Action Buttons Row with touch-friendly min height */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={isTogglingStatus || isDeletingTable}
                        onClick={() => handleRequestToggleStatus(table)}
                        className={`w-full min-h-[42px] py-2 px-1 rounded-xl text-xs font-semibold text-center transition border cursor-pointer active:scale-95 disabled:opacity-50 truncate ${
                          isActive
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${table.tableNumber}`}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        disabled={isDeletingTable}
                        onClick={() => handleOpenEditModal(table)}
                        className="w-full min-h-[42px] py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 text-center transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        aria-label={`Edit ${table.tableNumber}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-slate-600 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeletingTable || isTogglingStatus}
                        onClick={() => handleRequestDeleteTable(table)}
                        className="w-full min-h-[42px] py-2 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 text-center transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        aria-label={`Delete ${table.tableNumber}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-rose-600 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* CONFIRMATION DIALOG: DEACTIVATE TABLE */}
      {tableToDeactivate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-deactivate-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isTogglingStatus) handleCancelDeactivate();
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn my-auto max-h-[92vh] overflow-y-auto">
            {/* Warning Header */}
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 id="modal-deactivate-title" className="text-base font-extrabold text-primary">
                  Deactivate {tableToDeactivate.tableNumber}?
                </h3>
                <p className="text-xs text-muted">Table dine-in availability confirmation</p>
              </div>
            </div>

            {/* Table Details Snapshot */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-primary text-sm">
                  {tableToDeactivate.tableNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Will become Inactive
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                <span>{tableToDeactivate.name || 'Standard Table'}</span>
                <span>{tableToDeactivate.capacity} Guest Seats</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to deactivate <strong>{tableToDeactivate.tableNumber}</strong>? Guests will not be able to place new dine-in orders for this table while it is inactive. All table configuration and seating details will remain completely preserved in the database.
            </p>

            {/* Dialog Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleCancelDeactivate}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleConfirmDeactivate}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isTogglingStatus ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>Deactivate Table</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE TABLE */}
      {tableToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingTable) handleCancelDeleteTable();
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn my-auto max-h-[92vh] overflow-y-auto">
            {/* Danger Header */}
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-rose-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 id="modal-delete-title" className="text-base font-extrabold text-primary">
                  Delete {tableToDelete.tableNumber}?
                </h3>
                <p className="text-xs text-muted">Permanent database table removal</p>
              </div>
            </div>

            {/* Table Details Snapshot */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-primary text-sm">
                  {tableToDelete.tableNumber}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    tableToDelete.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {tableToDelete.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                <span>{tableToDelete.name || '(No custom name)'}</span>
                <span>{tableToDelete.capacity} Guest Seats</span>
              </div>
            </div>

            {/* Error Notification */}
            {deleteError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2.5 animate-fadeIn">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="leading-snug">{deleteError}</span>
              </div>
            )}

            {/* Warning Explanation & Business Rules */}
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to permanently delete <strong>{tableToDelete.tableNumber}</strong> from the database? This action cannot be undone.
              </p>
              <p className="text-[11px] text-slate-500 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 text-amber-900 leading-normal">
                ℹ️ <strong>Integrity Protection:</strong> Tables with active in-progress dining orders cannot be deleted. Completed historical orders, payments, and sales analytics will remain safely preserved in the database.
              </p>
            </div>

            {/* Dialog Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingTable}
                onClick={handleCancelDeleteTable}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingTable}
                onClick={handleConfirmDeleteTable}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isDeletingTable ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete Table</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TABLE MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-table-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) closeModal();
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-fadeIn my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary text-accent flex items-center justify-center flex-shrink-0 shadow-xs border border-primary-light">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M10 20V10" />
                  </svg>
                </div>
                <div>
                  <h3 id="modal-table-title" className="text-base font-extrabold text-primary">
                    {editingTable ? `Edit ${editingTable.tableNumber}` : 'Add New Table'}
                  </h3>
                  <p className="text-xs text-muted">
                    Configure table details stored in database
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs transition cursor-pointer disabled:opacity-50"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* General Server Error Banner inside Modal */}
            {formErrors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
                <span>⚠️</span>
                <span>{formErrors.general}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              {/* Field 1: Table Number (required) */}
              <div>
                <label
                  htmlFor="field-table-number"
                  className="block text-xs font-bold text-primary mb-1"
                >
                  Table Number <span className="text-red-500">*</span>
                </label>
                <input
                  ref={tableNumberInputRef}
                  id="field-table-number"
                  type="text"
                  disabled={isSaving}
                  value={formTableNumber}
                  onChange={(e) => {
                    setFormTableNumber(e.target.value);
                    if (formErrors.tableNumber || formErrors.general) {
                      setFormErrors((prev) => ({ ...prev, tableNumber: null, general: null }));
                    }
                  }}
                  placeholder="e.g. Table 5 or 5"
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent focus:bg-white text-primary placeholder-slate-400 transition disabled:opacity-60 ${
                    formErrors.tableNumber
                      ? 'border-red-400 ring-1 ring-red-300'
                      : 'border-slate-200'
                  }`}
                  required
                  aria-invalid={Boolean(formErrors.tableNumber)}
                  aria-describedby={formErrors.tableNumber ? 'error-table-number' : undefined}
                />
                {formErrors.tableNumber && (
                  <p id="error-table-number" className="text-[11px] font-semibold text-red-600 mt-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formErrors.tableNumber}</span>
                  </p>
                )}
              </div>

              {/* Field 2: Table Name (optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="field-table-name"
                    className="block text-xs font-bold text-primary"
                  >
                    Table Name
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Optional</span>
                </div>
                <input
                  id="field-table-name"
                  type="text"
                  disabled={isSaving}
                  value={formTableName}
                  onChange={(e) => setFormTableName(e.target.value)}
                  placeholder="e.g. Window Booth, Family Lounge, Corner Terrace"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent focus:bg-white text-primary placeholder-slate-400 transition disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Helpful label for restaurant staff (e.g. zone, view or booth description).
                </p>
              </div>

              {/* Field 3: Seating Capacity (required) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="field-capacity"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary"
                  >
                    <span className="w-5 h-5 rounded-md bg-amber-100/70 text-accent flex items-center justify-center border border-accent/30 flex-shrink-0 shadow-2xs">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </span>
                    <span>
                      Seating Capacity <span className="text-red-500 font-bold">*</span>
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
                    1 – 50 Guests
                  </span>
                </div>

                <div
                  className={`group relative flex items-center w-full bg-[#FDFBF7] border rounded-xl sm:rounded-2xl transition shadow-2xs ${
                    formErrors.capacity
                      ? 'border-red-400 ring-2 ring-red-300/60 bg-red-50/20'
                      : 'border-accent/40 hover:border-accent focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 focus-within:bg-white'
                  }`}
                >
                  <input
                    id="field-capacity"
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    disabled={isSaving}
                    value={formCapacity}
                    onChange={(e) => {
                      setFormCapacity(e.target.value);
                      if (formErrors.capacity || formErrors.general) {
                        setFormErrors((prev) => ({ ...prev, capacity: null, general: null }));
                      }
                    }}
                    placeholder="e.g. 4"
                    style={{ MozAppearance: 'textfield' }}
                    className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base font-bold text-primary placeholder-slate-400 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60"
                    required
                    aria-invalid={Boolean(formErrors.capacity)}
                    aria-describedby={formErrors.capacity ? 'error-capacity' : undefined}
                  />

                  <span className="text-xs font-semibold text-muted/80 select-none mr-2 flex-shrink-0">
                    Guests
                  </span>

                  <div className="h-6 w-px bg-accent/25 my-auto flex-shrink-0" aria-hidden="true" />

                  <div className="flex items-center gap-1 px-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleDecrementCapacity}
                      disabled={isSaving || (Number(formCapacity) <= 1 && formCapacity !== '')}
                      aria-label="Decrease seating capacity"
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/90 hover:bg-accent/15 border border-accent/30 hover:border-accent text-primary active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs font-black text-sm"
                    >
                      <span className="leading-none select-none">−</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleIncrementCapacity}
                      disabled={isSaving || (Number(formCapacity) >= 50 && formCapacity !== '')}
                      aria-label="Increase seating capacity"
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/90 hover:bg-accent/15 border border-accent/30 hover:border-accent text-primary active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs font-black text-sm"
                    >
                      <span className="leading-none select-none">+</span>
                    </button>
                  </div>
                </div>

                {formErrors.capacity && (
                  <p id="error-capacity" className="text-[11px] font-semibold text-red-600 mt-1.5 flex items-center gap-1 animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formErrors.capacity}</span>
                  </p>
                )}
              </div>

              {/* Field 4: Status (Active or Inactive) */}
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      formStatus === 'Active'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="Active"
                      disabled={isSaving}
                      checked={formStatus === 'Active'}
                      onChange={() => setFormStatus('Active')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="block leading-tight">Active</span>
                      <span className="text-[10px] font-normal text-emerald-700">Ready for service</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      formStatus === 'Inactive'
                        ? 'bg-slate-200/70 border-slate-400 text-slate-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="Inactive"
                      disabled={isSaving}
                      checked={formStatus === 'Inactive'}
                      onChange={() => setFormStatus('Inactive')}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <div>
                      <span className="block leading-tight">Inactive</span>
                      <span className="text-[10px] font-normal text-slate-500">Reserved / hidden</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Action Buttons: Save & Cancel */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-accent font-extrabold text-xs transition shadow-xs cursor-pointer border border-primary-light flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{editingTable ? 'Save Changes' : 'Save Table'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
