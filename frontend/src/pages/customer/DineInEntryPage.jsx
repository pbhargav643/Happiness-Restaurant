import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import { useDineIn, findMockTable } from '../../context/DineInContext';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { tableApi } from '../../services/tableApi';

/**
 * DineInEntryPage Component (Phase 3 Prompt 1)
 *
 * Responsive Dine-in Entry flow that identifies a table from URL query parameters.
 * Requirements:
 * - Restaurant name: VYANJAN RESTAURANT
 * - Ordering mode: Dine-in
 * - Table number and table name, when valid table data is available
 * - A `Browse Menu` button
 * - A clear error state for a missing or invalid table identifier
 * - Explicit prototype disclaimers (does NOT claim backend authorization)
 * - Full responsive layout for mobile, tablet, laptop, and desktop
 */
export default function DineInEntryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTable, dineInTable } = useDineIn();

  // Extract query parameters from URL with alias support (table / tableNumber, tableId / id)
  const urlTableNumber =
    searchParams.get('table') ||
    searchParams.get('tableNumber') ||
    searchParams.get('table_number');
  const urlTableId =
    searchParams.get('tableId') ||
    searchParams.get('table_id') ||
    searchParams.get('id');
  const urlMode = searchParams.get('mode');

  // Live backend table state
  const [liveTable, setLiveTable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);

  // Synchronous resolution for baseline/mock tables and existing active session
  const syncMatch = useMemo(() => {
    if (urlTableId) {
      const match = findMockTable(urlTableId);
      if (match) return match;
    }
    if (urlTableNumber) {
      const match = findMockTable(urlTableNumber);
      if (match) return match;
    }
    // If no query parameters are in URL, check if an active table is already stored in DineInContext (e.g. page refresh)
    if (!urlTableId && !urlTableNumber && dineInTable) {
      return dineInTable;
    }
    return null;
  }, [urlTableId, urlTableNumber, dineInTable]);

  // Asynchronously query live database table API if not resolved synchronously
  useEffect(() => {
    let isCancelled = false;

    if (syncMatch) {
      setLiveTable(syncMatch);
      setHasResolved(true);
      return;
    }

    const candidateId = urlTableId || urlTableNumber;
    if (!candidateId) {
      setHasResolved(true);
      return;
    }

    setIsLoading(true);
    tableApi
      .getTable(candidateId)
      .then((tableDoc) => {
        if (!isCancelled) {
          if (tableDoc) {
            setLiveTable(tableDoc);
          }
          setIsLoading(false);
          setHasResolved(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoading(false);
          setHasResolved(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [syncMatch, urlTableId, urlTableNumber]);

  const resolvedTable = liveTable || syncMatch;

  // Synchronize validated table into DineInContext only if active
  useEffect(() => {
    if (resolvedTable && resolvedTable.status === 'Active') {
      setTable(resolvedTable);
    }
  }, [resolvedTable, setTable]);

  // Handler: Proceed to Menu in Dine-In Mode
  const handleBrowseMenu = () => {
    if (resolvedTable && resolvedTable.status === 'Active') {
      setTable(resolvedTable);
      navigate(`/dine-in/menu`, { replace: false });
    }
  };

  // ---------------------------------------------------------------------------
  // LOADING SKELETON STATE: Connecting to Live Table Service
  // ---------------------------------------------------------------------------
  if (isLoading && !resolvedTable) {
    return (
      <div className="w-full bg-secondary min-h-[80vh] py-10 sm:py-16 flex items-center justify-center">
        <Container>
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-xs animate-pulse">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 mx-auto flex items-center justify-center">
              <svg className="animate-spin h-7 w-7 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                Table Identification
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                Locating Your Dining Table...
              </h2>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Connecting to {RESTAURANT_CONFIG.name} live dining service.
              </p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR STATE: Missing or Invalid Table Identifier
  // ---------------------------------------------------------------------------
  if (!resolvedTable) {
    const attemptedIdentifier = urlTableNumber || urlTableId || '(None provided)';

    return (
      <div className="w-full bg-secondary min-h-[80vh] py-10 sm:py-16 flex items-center justify-center">
        <Container>
          <div
            role="alert"
            aria-live="polite"
            className="max-w-lg mx-auto bg-white rounded-3xl border border-red-200 p-8 sm:p-12 text-center space-y-6 shadow-sm animate-fadeIn"
          >
            {/* Error Icon */}
            <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-600 border border-red-100 mx-auto flex items-center justify-center shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Content */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-full">
                Invalid Table Identifier
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Table Not Recognized
              </h1>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                We could not identify an active restaurant dining table matching{' '}
                <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs">
                  {attemptedIdentifier}
                </code>
                .
              </p>
            </div>

            {/* Actionable Guidance */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>ℹ</span> What should you do?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Re-scan the QR code located on your dining table tent card.</li>
                <li>Make sure your phone camera scanned the entire QR code without reflections.</li>
                <li>Ask your table service waiter for assistance if the issue persists.</li>
              </ul>
            </div>

            {/* Interactive Recovery Options */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                to="/dine-in?table=Table%201&tableId=tbl-1&mode=dine_in"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Demo Table 1</span>
                <span>&rarr;</span>
              </Link>
              <Link
                to="/dine-in?table=Table%202&tableId=tbl-2&mode=dine_in"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>Demo Table 2</span>
                <span>&rarr;</span>
              </Link>
              <Link
                to="/menu"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center justify-center cursor-pointer"
              >
                Parcel Pickup
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VALID TABLE: DINE-IN ENTRY WELCOME VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full bg-secondary min-h-[80vh] py-8 sm:py-16">
      <Container>
        <div className="max-w-xl mx-auto space-y-6">
          {/* Main Table Card */}
          <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-10 shadow-md text-center space-y-6 animate-fadeIn">
            {/* Restaurant Brand Header */}
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-accent">
                {RESTAURANT_CONFIG.tagline || 'Exquisite Dine-In Experience'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight uppercase">
                {RESTAURANT_CONFIG.name}
              </h1>
            </div>

            {/* Ordering Mode Indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wide">
                Ordering Mode: Dine-in
              </span>
            </div>

            {/* Identified Table Spotlight */}
            <div className="p-6 bg-secondary-dark/60 rounded-2xl border border-surface-border flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-black shadow-xs border border-primary-light">
                {resolvedTable.tableNumber.replace(/[^0-9]/g, '') || 'T'}
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-black text-primary block tracking-tight">
                  {resolvedTable.tableNumber}
                </span>
                <span className="text-sm font-semibold text-muted block mt-0.5">
                  {resolvedTable.name || 'Main Dining Hall'} &bull; {resolvedTable.capacity} Guests Capacity
                </span>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  resolvedTable.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    resolvedTable.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                <span>Table Status: {resolvedTable.status}</span>
              </span>
            </div>

            {/* Non-Authorization Security Notice (Strict Scope) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Prototype Self-Service Verification</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This table has been identified from the restaurant prototype table registry.
                URL parameters are not treated as proof of payment authorization. Live authenticated
                dining sessions and billing are enforced on the backend in subsequent phases.
              </p>
            </div>

            {/* Primary Action Button: Browse Menu */}
            <div className="pt-2 space-y-3">
              {resolvedTable.status === 'Active' ? (
                <button
                  type="button"
                  onClick={handleBrowseMenu}
                  className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-light text-accent text-sm font-extrabold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  aria-label={`Browse restaurant menu for ${resolvedTable.tableNumber}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  <span>Browse Menu</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1">
                    <p className="text-xs font-bold text-amber-900">Table Currently Inactive</p>
                    <p className="text-[11px] text-amber-800">
                      This dining table is currently closed or reserved. New dine-in orders cannot be started from this table. Please contact our waitstaff for assistance.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 px-6 rounded-2xl bg-slate-200 text-slate-500 text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2 opacity-75"
                    aria-label="Dine-in ordering disabled for inactive table"
                  >
                    <span>Table Ordering Unavailable</span>
                  </button>
                </div>
              )}

              <Link
                to="/menu"
                className="inline-block text-xs font-semibold text-muted hover:text-primary transition"
              >
                Prefer Takeaway? Switch to Parcel Pickup
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
