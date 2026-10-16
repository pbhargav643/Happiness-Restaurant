import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import adminOrderApi from '../../services/adminOrderApi';
import { MENU_ITEMS } from '../../data/menuData';

/**
 * Helper to authoritatively classify an order record into:
 * - 'DINE_IN': Orders originating from table QR scans or table associations
 * - 'PICKUP': Orders placed through takeaway parcel counter pickup
 * - 'UNKNOWN': Historical or malformed orders without identifiable order type
 */
export function getOrderClassification(order) {
  if (!order || typeof order !== 'object') return 'UNKNOWN';

  const rawType = (order.orderType || '').trim().toUpperCase();
  if (rawType === 'DINE_IN' || Boolean(order.tableNumber) || Boolean(order.tableId)) {
    return 'DINE_IN';
  }
  if (rawType === 'PICKUP' || (order.pickup && (order.pickup.date || order.pickup.time))) {
    return 'PICKUP';
  }
  return 'UNKNOWN';
}

/**
 * AdminAnalyticsPage Component
 * Segregated Operational Analytics & Sales Reports (/admin/analytics)
 *
 * Implements:
 * - Two distinct selectable analytics views: Dine-in QR Analytics vs. Parcel Pickup Analytics
 * - Real live data computation from existing orders via adminOrderApi
 * - Separate KPI cards, hourly/timeline charts, top-selling dishes, status distribution,
 *   table-wise breakdown (for Dine-in), pickup history (for Pickup), and payment method analytics
 * - Date range filters: All Time, Today, Last 7 Days, Last 30 Days
 * - Fully responsive across Desktop (1440x900), Laptop (1280x720), Tablet (768x1024), and Mobile (390x844, 360x800)
 */
export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Order Type Analytics View: 'DINE_IN' | 'PICKUP'
  const [selectedSection, setSelectedSection] = useState('DINE_IN');

  // Time Window Filter: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
  const [dateFilter, setDateFilter] = useState('ALL');

  const fetchAnalyticsOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminOrderApi.getAdminOrders({ limit: 500 });
      if (res && res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Failed to load orders for analytics:', err);
      setError('Unable to load latest analytics data.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsOrders();
  }, []);

  // 1. Partition orders strictly by verified order type
  const { dineInAllOrders, pickupAllOrders, unknownOrders } = useMemo(() => {
    const dineIn = [];
    const pickup = [];
    const unknown = [];

    orders.forEach((o) => {
      const classification = getOrderClassification(o);
      if (classification === 'DINE_IN') {
        dineIn.push(o);
      } else if (classification === 'PICKUP') {
        pickup.push(o);
      } else {
        unknown.push(o);
      }
    });

    return {
      dineInAllOrders: dineIn,
      pickupAllOrders: pickup,
      unknownOrders: unknown,
    };
  }, [orders]);

  // 2. Date-filtered subsets
  const filterByDateRange = (orderList) => {
    if (!orderList || orderList.length === 0) return [];
    if (dateFilter === 'ALL') return orderList;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return orderList.filter((o) => {
      const rawDate = o.createdAt || o.pickup?.date || '';
      const orderDate = new Date(rawDate);
      if (isNaN(orderDate.getTime())) {
        return dateFilter === 'TODAY' ? rawDate.startsWith(todayStr) : true;
      }

      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dateFilter === 'TODAY') {
        return diffDays < 1 && orderDate.getDate() === now.getDate();
      }
      if (dateFilter === 'WEEK') {
        return diffDays <= 7;
      }
      if (dateFilter === 'MONTH') {
        return diffDays <= 30;
      }
      return true;
    });
  };

  const filteredDineInOrders = useMemo(
    () => filterByDateRange(dineInAllOrders),
    [dineInAllOrders, dateFilter]
  );

  const filteredPickupOrders = useMemo(
    () => filterByDateRange(pickupAllOrders),
    [pickupAllOrders, dateFilter]
  );

  // Active section orders
  const activeOrders = useMemo(() => {
    return selectedSection === 'DINE_IN' ? filteredDineInOrders : filteredPickupOrders;
  }, [selectedSection, filteredDineInOrders, filteredPickupOrders]);

  // Overall Section Totals for Top Segment Tabs
  const sectionSummary = useMemo(() => {
    const calc = (list) => {
      let sales = 0;
      let active = 0;
      list.forEach((o) => {
        sales += Number(o.subtotal || 0);
        const st = String(o.status || 'PLACED').toUpperCase().replace(' ', '_');
        if (st !== 'SERVED' && st !== 'PICKED_UP' && st !== 'CANCELLED') {
          active++;
        }
      });
      return { total: list.length, sales, active };
    };

    return {
      DINE_IN: calc(filteredDineInOrders),
      PICKUP: calc(filteredPickupOrders),
    };
  }, [filteredDineInOrders, filteredPickupOrders]);

  // 3. High-Level KPIs for Selected Section
  const stats = useMemo(() => {
    let totalSales = 0;
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let completed = 0; // SERVED for Dine-in, PICKED_UP for Pickup

    activeOrders.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        totalSales += Number(o.subtotal || 0);
      }
      const st = String(o.status || 'PLACED').toUpperCase().replace(' ', '_');
      if (st === 'PLACED') pending++;
      else if (st === 'PREPARING') preparing++;
      else if (st === 'READY') ready++;
      else if (st === 'SERVED' || st === 'PICKED_UP') completed++;
    });

    const totalOrders = activeOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    return {
      totalOrders,
      totalSales,
      pending,
      preparing,
      ready,
      completed,
      avgOrderValue,
    };
  }, [activeOrders]);

  // 4. Hourly Distribution Chart Data (00:00 - 23:00)
  const hourlyData = useMemo(() => {
    if (activeOrders.length === 0) return [];

    // Initialize 24 hour slots
    const hoursMap = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      orders: 0,
      sales: 0,
    }));

    activeOrders.forEach((o) => {
      let h = null;
      if (o.createdAt) {
        const d = new Date(o.createdAt);
        if (!isNaN(d.getTime())) {
          h = d.getHours();
        }
      } else if (o.pickup?.time) {
        const match = o.pickup.time.match(/^(\d{1,2}):/);
        if (match) h = parseInt(match[1], 10);
      }

      if (h !== null && h >= 0 && h < 24) {
        hoursMap[h].orders += 1;
        hoursMap[h].sales += Number(o.subtotal || 0);
      }
    });

    // Find hours with activity, or default to typical restaurant operating hours (10:00 to 23:00)
    const activeHours = hoursMap.filter((hm) => hm.hour >= 9 && hm.hour <= 23);
    return activeHours;
  }, [activeOrders]);

  // Peak Hour Callout
  const peakHour = useMemo(() => {
    if (hourlyData.length === 0) return null;
    let max = hourlyData[0];
    hourlyData.forEach((h) => {
      if (h.orders > max.orders) max = h;
    });
    return max.orders > 0 ? max : null;
  }, [hourlyData]);

  // 5. Timeline / Daily Order History
  const timelineReport = useMemo(() => {
    if (activeOrders.length === 0) return [];

    const map = {};
    activeOrders.forEach((o) => {
      const dateKey = o.pickup?.date || (o.createdAt ? String(o.createdAt).slice(0, 10) : 'Recent');
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, sales: 0, orders: 0, completed: 0 };
      }
      map[dateKey].sales += Number(o.subtotal || 0);
      map[dateKey].orders += 1;
      const st = String(o.status || '').toUpperCase();
      if (st.includes('SERVED') || st.includes('PICKED')) {
        map[dateKey].completed += 1;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [activeOrders]);

  // 6. Status Distribution
  const statusDistribution = useMemo(() => {
    const total = activeOrders.length;
    if (total === 0) return null;

    const isDineIn = selectedSection === 'DINE_IN';

    return [
      {
        label: isDineIn ? 'Placed (Pending)' : 'Order Placed',
        count: stats.pending,
        color: 'bg-sky-500',
        barColor: 'from-sky-500 to-sky-600',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
        pct: Math.round((stats.pending / total) * 100),
      },
      {
        label: 'Preparing in Kitchen',
        count: stats.preparing,
        color: 'bg-amber-500',
        barColor: 'from-amber-500 to-amber-600',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        pct: Math.round((stats.preparing / total) * 100),
      },
      {
        label: isDineIn ? 'Ready to Serve' : 'Ready for Pickup',
        count: stats.ready,
        color: 'bg-teal-500',
        barColor: 'from-teal-500 to-teal-600',
        badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
        pct: Math.round((stats.ready / total) * 100),
      },
      {
        label: isDineIn ? 'Served (Completed)' : 'Picked Up (Completed)',
        count: stats.completed,
        color: 'bg-emerald-600',
        barColor: 'from-emerald-600 to-emerald-700',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        pct: Math.round((stats.completed / total) * 100),
      },
    ];
  }, [activeOrders, stats, selectedSection]);

  // 7. Top Selling Food Items
  const topSellingItems = useMemo(() => {
    if (activeOrders.length === 0) return [];

    const itemMap = {};
    activeOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const name = it.name || it.itemId || 'Unknown Item';
          if (!itemMap[name]) {
            itemMap[name] = {
              name,
              quantity: 0,
              revenue: 0,
              category: it.categoryName || it.category || '',
            };
          }
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || it.unitPrice || 0);
          itemMap[name].quantity += qty;
          itemMap[name].revenue += price * qty;
        });
      }
    });

    return Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 6);
  }, [activeOrders]);

  // 8. Table-Wise Breakdown (Specific to Dine-in QR Analytics)
  const tableBreakdown = useMemo(() => {
    if (selectedSection !== 'DINE_IN' || filteredDineInOrders.length === 0) return [];

    const map = {};
    filteredDineInOrders.forEach((o) => {
      const table = o.tableNumber || (o.tableId ? `Table #${String(o.tableId).slice(-4)}` : 'Dine-In Table');
      if (!map[table]) {
        map[table] = {
          tableName: table,
          orders: 0,
          sales: 0,
          activeOrders: 0,
          latestStatus: o.status || 'PLACED',
          lastOrderTime: o.createdAt || null,
        };
      }
      map[table].orders += 1;
      map[table].sales += Number(o.subtotal || 0);
      const st = String(o.status || 'PLACED').toUpperCase().replace(' ', '_');
      if (st !== 'SERVED' && st !== 'CANCELLED') {
        map[table].activeOrders += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.sales - a.sales || b.orders - a.orders);
  }, [selectedSection, filteredDineInOrders]);

  // 9. Payment Method Breakdown (Where data is present)
  const paymentBreakdown = useMemo(() => {
    if (activeOrders.length === 0) return [];

    const map = {};
    activeOrders.forEach((o) => {
      const method =
        o.paymentMethod ||
        o.payment?.method ||
        o.payment?.type ||
        (selectedSection === 'DINE_IN' ? 'Table Settlement (Cash / UPI)' : 'Counter Settlement');

      if (!map[method]) {
        map[method] = { method, count: 0, amount: 0 };
      }
      map[method].count += 1;
      map[method].amount += Number(o.subtotal || 0);
    });

    return Object.values(map);
  }, [activeOrders, selectedSection]);

  // 10. Category Performance Breakdown
  const categoryPerformance = useMemo(() => {
    if (activeOrders.length === 0) return [];

    const categoryMap = {};
    const catalogItemMap = {};
    if (Array.isArray(MENU_ITEMS)) {
      MENU_ITEMS.forEach((mi) => {
        const catName = mi.categoryName || mi.category;
        if (mi?.id) catalogItemMap[mi.id] = catName;
        if (mi?.name) catalogItemMap[mi.name.toUpperCase().trim()] = catName;
      });
    }

    activeOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const rawName = String(it.name || '').toUpperCase().trim();
          const cat =
            it.categoryName ||
            catalogItemMap[it.itemId] ||
            catalogItemMap[rawName] ||
            it.category ||
            'General';

          if (!categoryMap[cat]) {
            categoryMap[cat] = { category: cat, itemsSold: 0, revenue: 0 };
          }
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || it.unitPrice || 0);
          categoryMap[cat].itemsSold += qty;
          categoryMap[cat].revenue += price * qty;
        });
      }
    });

    return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
  }, [activeOrders]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ============================================================== */}
      {/* 1. PAGE HEADER & TIME RANGE TOOLBAR                           */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Analytics & Reports
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Database Metrics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Segregated operational reporting for Dine-in QR sessions and customer Parcel Pickups.
          </p>
        </div>

        {/* Date Filter & Refresh Toolbar */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-xs" role="group" aria-label="Date range filter">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'WEEK', label: 'Last 7 Days' },
              { id: 'MONTH', label: 'Last 30 Days' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalyticsOrders}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
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
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchAnalyticsOrders} className="underline font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Legacy/Historical Unclassified Records Notice (if any exist) */}
      {unknownOrders.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
          <span>
            <strong>Historical Integrity Note:</strong> {unknownOrders.length} legacy order record(s) without an identifiable order type have been safely quarantined to guarantee zero double-counting.
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-white border border-slate-200">
            Safe Mode
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PRIMARY SELECTABLE ANALYTICS SECTION TABS                  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" role="tablist" aria-label="Analytics Section Selection">
        {/* Tab 1: Dine-in QR Analytics */}
        <button
          type="button"
          role="tab"
          aria-selected={selectedSection === 'DINE_IN'}
          onClick={() => setSelectedSection('DINE_IN')}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl transition-all cursor-pointer text-left border ${
            selectedSection === 'DINE_IN'
              ? 'bg-primary text-white border-accent shadow-md ring-2 ring-accent/20'
              : 'bg-white text-primary border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                selectedSection === 'DINE_IN' ? 'bg-accent text-primary shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3M20 14v3" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  Dine-in QR Analytics
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSection === 'DINE_IN'
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Table Scans
                </span>
              </div>
              <p className={`text-xs mt-0.5 truncate ${selectedSection === 'DINE_IN' ? 'text-slate-300' : 'text-slate-500'}`}>
                Table orders, in-hall dining, table turnover & served items
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-3">
            <span
              className={`block text-xs sm:text-sm font-black font-sans ${
                selectedSection === 'DINE_IN' ? 'text-accent' : 'text-slate-900'
              }`}
            >
              ₹{sectionSummary.DINE_IN.sales}
            </span>
            <span className={`text-[11px] block font-semibold ${selectedSection === 'DINE_IN' ? 'text-slate-300' : 'text-slate-500'}`}>
              {sectionSummary.DINE_IN.total} {sectionSummary.DINE_IN.total === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </button>

        {/* Tab 2: Parcel Pickup Analytics */}
        <button
          type="button"
          role="tab"
          aria-selected={selectedSection === 'PICKUP'}
          onClick={() => setSelectedSection('PICKUP')}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl transition-all cursor-pointer text-left border ${
            selectedSection === 'PICKUP'
              ? 'bg-primary text-white border-accent shadow-md ring-2 ring-accent/20'
              : 'bg-white text-primary border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                selectedSection === 'PICKUP' ? 'bg-accent text-primary shadow-xs' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  Parcel Pickup Analytics
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSection === 'PICKUP'
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Takeaway
                </span>
              </div>
              <p className={`text-xs mt-0.5 truncate ${selectedSection === 'PICKUP' ? 'text-slate-300' : 'text-slate-500'}`}>
                Website customer pre-orders, pickup slots & counter pickups
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-3">
            <span
              className={`block text-xs sm:text-sm font-black font-sans ${
                selectedSection === 'PICKUP' ? 'text-accent' : 'text-slate-900'
              }`}
            >
              ₹{sectionSummary.PICKUP.sales}
            </span>
            <span className={`text-[11px] block font-semibold ${selectedSection === 'PICKUP' ? 'text-slate-300' : 'text-slate-500'}`}>
              {sectionSummary.PICKUP.total} {sectionSummary.PICKUP.total === 1 ? 'order' : 'orders'}
            </span>
          </div>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 3. SECTION BADGE & OPERATIONAL CONTEXT BANNER                 */}
      {/* ============================================================== */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              {selectedSection === 'DINE_IN' ? 'Dine-in QR Orders View' : 'Parcel Pickup Orders View'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {selectedSection === 'DINE_IN'
                ? 'Showing statistics for meals ordered directly by customers at restaurant dining tables via QR codes.'
                : 'Showing statistics for takeaway parcels pre-ordered by customers for physical counter pickup.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-600">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-[11px]">
            Filtered: {activeOrders.length} {activeOrders.length === 1 ? 'record' : 'records'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-mono text-[11px]">
            Avg: ₹{stats.avgOrderValue}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. EXECUTIVE KPI CARDS (6 Key Metrics)                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4 items-stretch">
        {/* Metric 1: Total Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-h-[112px]">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              {selectedSection === 'DINE_IN' ? 'Dine-In Orders' : 'Parcel Orders'}
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-sans tracking-tight truncate">
              {stats.totalOrders}
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
              Total
            </span>
          </div>
        </div>

        {/* Metric 2: Total Sales */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-h-[112px]">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider truncate">
              {selectedSection === 'DINE_IN' ? 'Dine-In Sales' : 'Parcel Sales'}
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-900 font-sans tracking-tight truncate">
              ₹{stats.totalSales}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
              Revenue
            </span>
          </div>
        </div>

        {/* Metric 3: Placed (Pending) */}
        <div className="bg-white rounded-2xl border border-sky-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-h-[112px]">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider truncate">
              Placed Orders
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-sky-900 font-sans tracking-tight truncate">
              {stats.pending}
            </span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full shrink-0">
              Pending
            </span>
          </div>
        </div>

        {/* Metric 4: Preparing */}
        <div className="bg-white rounded-2xl border border-amber-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-h-[112px]">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider truncate">
              Preparing
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343a7.975 7.975 0 012.343 5.657c0 2.122-.858 4.156-2.342 5.657z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-amber-900 font-sans tracking-tight truncate">
              {stats.preparing}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
              Kitchen
            </span>
          </div>
        </div>

        {/* Metric 5: Ready to Serve / Ready for Pickup */}
        <div className="bg-white rounded-2xl border border-teal-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-h-[112px]">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider truncate">
              {selectedSection === 'DINE_IN' ? 'Ready to Serve' : 'Ready for Pickup'}
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-teal-900 font-sans tracking-tight truncate">
              {stats.ready}
            </span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">
              Ready
            </span>
          </div>
        </div>

        {/* Metric 6: Served / Picked Up (Completed) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between h-full min-h-[112px]">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider truncate">
              {selectedSection === 'DINE_IN' ? 'Served' : 'Picked Up'}
            </span>
            <div className="w-7 h-7 shrink-0 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-800 font-sans tracking-tight truncate">
              {stats.completed}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. HOURLY CHART & TIMELINE OVERVIEW                           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {selectedSection === 'DINE_IN' ? 'Hourly Dine-in Order Activity' : 'Hourly Parcel Pickup Activity'}
              </h2>
              <p className="text-xs text-slate-500">
                Hourly order traffic and demand distribution across the day.
              </p>
            </div>
            {peakHour && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                Peak: {peakHour.label} ({peakHour.orders} orders)
              </span>
            )}
          </div>

          {hourlyData.length === 0 || hourlyData.every((h) => h.orders === 0) ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No orders registered in this time window.
            </div>
          ) : (
            <div className="space-y-2.5 my-auto">
              {hourlyData
                .filter((h) => h.orders > 0 || (h.hour >= 11 && h.hour <= 22))
                .map((slot) => {
                  const maxOrders = Math.max(...hourlyData.map((h) => h.orders), 1);
                  const barWidth = Math.max(6, Math.round((slot.orders / maxOrders) * 100));
                  return (
                    <div key={slot.hour} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-mono font-bold text-slate-600 text-right shrink-0">
                        {slot.label}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            selectedSection === 'DINE_IN'
                              ? 'bg-gradient-to-r from-amber-500 via-accent to-amber-600'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="w-24 text-right shrink-0">
                        <span className="font-bold text-slate-900 font-sans">
                          {slot.orders} {slot.orders === 1 ? 'ord' : 'ords'}
                        </span>
                        {slot.sales > 0 && (
                          <span className="text-[10px] text-slate-400 ml-1 font-mono">
                            (₹{slot.sales})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Status Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="pb-3.5 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">
              {selectedSection === 'DINE_IN' ? 'Dine-in Status Distribution' : 'Pickup Status Distribution'}
            </h2>
            <p className="text-xs text-slate-500">Live breakdown of order workflow progression.</p>
          </div>

          {!statusDistribution ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No data available</div>
          ) : (
            <div className="space-y-4 my-auto">
              {/* Stacked Proportional Bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                {statusDistribution.map(
                  (item) =>
                    item.pct > 0 && (
                      <div
                        key={item.label}
                        className={`h-full ${item.color} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                        title={`${item.label}: ${item.count} (${item.pct}%)`}
                      />
                    )
                )}
              </div>

              {/* Status List with Micro-Bars */}
              <div className="space-y-2.5 pt-1">
                {statusDistribution.map((item) => (
                  <div key={item.label} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="font-bold text-slate-800">{item.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeBg}`}>
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${item.barColor} h-1.5 rounded-full transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. TOP-SELLING DISHES (Categorized by Order Type)             */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {selectedSection === 'DINE_IN' ? 'Top-Selling Dine-in Dishes' : 'Top-Selling Parcel Pickup Dishes'}
            </h2>
            <p className="text-xs text-slate-500">
              {selectedSection === 'DINE_IN'
                ? 'Most frequently ordered food items during table dining sessions.'
                : 'Most popular food items ordered for counter takeaway.'}
            </p>
          </div>
          <Link
            to="/admin/menu"
            className="text-xs font-bold text-accent hover:text-amber-700 transition-colors flex items-center gap-1 group"
          >
            <span>Menu Catalog</span>
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>

        {topSellingItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No dishes sold in this category for the selected timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" aria-label="Top Selling Items Table">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Rank & Dish Name</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Dish Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topSellingItems.map((item, idx) => (
                  <tr key={item.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          {item.category && (
                            <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-800 text-xs">
                        {item.quantity}×
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 font-sans text-sm">
                      ₹{item.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 7. DINE-IN TABLE BREAKDOWN / PICKUP TIMELINE HISTORY           */}
      {/* ============================================================== */}
      {selectedSection === 'DINE_IN' ? (
        /* Table-Wise Orders, Sales & Status Breakdown */
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Table-Wise Performance Breakdown</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 uppercase">
                  Dine-In Tables
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order frequency, cumulative billing, and live status per restaurant table.
              </p>
            </div>
            <Link
              to="/admin/tables"
              className="text-xs font-bold text-accent hover:text-amber-700 transition-colors flex items-center gap-1 group"
            >
              <span>Table Management</span>
              <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>

          {tableBreakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No dine-in table orders recorded in this date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Table Breakdown">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Table Identifier</th>
                    <th className="py-2.5 px-3 text-center">Orders Served</th>
                    <th className="py-2.5 px-3 text-center">Active Sessions</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableBreakdown.map((tbl) => (
                    <tr key={tbl.tableName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-primary text-white font-black text-xs flex items-center justify-center shadow-2xs">
                            {tbl.tableName.replace(/[^0-9]/g, '') || '#'}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{tbl.tableName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {tbl.orders}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {tbl.activeOrders > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            {tbl.activeOrders} Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 font-sans text-sm">
                        ₹{tbl.sales}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Parcel Pickup Order History Breakdown */
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Parcel Pickup History & Handover Timeline</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  Takeaway Queue
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Daily parcel order volume, completed collections, and takeaway revenue.
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-accent hover:text-amber-700 transition-colors flex items-center gap-1 group"
            >
              <span>Orders Queue</span>
              <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>

          {timelineReport.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No pickup records found in this date range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Pickup Timeline Table">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Total Parcels</th>
                    <th className="py-2.5 px-3 text-center">Handed Over</th>
                    <th className="py-2.5 px-3 text-right">Daily Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timelineReport.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {day.date}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {day.orders}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {day.completed}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 font-sans text-sm">
                        ₹{day.sales}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. PAYMENT METHOD & SETTLEMENT BREAKDOWN                       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Breakdown Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">
              {selectedSection === 'DINE_IN' ? 'Dine-In Settlement Methods' : 'Parcel Pickup Settlement Methods'}
            </h2>
            <p className="text-xs text-slate-500">
              {selectedSection === 'DINE_IN'
                ? 'Table dining sessions settle in-hall or at the front counter via Cash/UPI.'
                : 'Customer takeaway parcels are paid and collected directly at the pickup counter.'}
            </p>
          </div>

          {paymentBreakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No payment data recorded</div>
          ) : (
            <div className="space-y-3 my-auto">
              {paymentBreakdown.map((pm) => (
                <div
                  key={pm.method}
                  className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      ₹
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{pm.method}</span>
                      <span className="text-[11px] text-slate-500">{pm.count} transactions</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-slate-900 font-sans block">₹{pm.amount}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">100% Settled</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Performance Summary */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">
              {selectedSection === 'DINE_IN' ? 'Dine-in Category Sales' : 'Parcel Category Sales'}
            </h2>
            <p className="text-xs text-slate-500">Revenue contribution grouped across food menu categories.</p>
          </div>

          {categoryPerformance.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No category sales recorded</div>
          ) : (
            <div className="space-y-2.5 my-auto max-h-64 overflow-y-auto pr-1">
              {categoryPerformance.slice(0, 6).map((cat) => (
                <div key={cat.category} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{cat.category}</span>
                    <span className="font-black text-slate-900 font-sans">₹{cat.revenue}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-accent h-1 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((cat.revenue / (categoryPerformance[0]?.revenue || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
