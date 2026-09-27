import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import adminOrderApi from '../../services/adminOrderApi';
import { MENU_ITEMS } from '../../data/menuData';

/**
 * AdminAnalyticsPage Component
 * Premium real-time operational analytics & sales reports (/admin/analytics)
 *
 * Implements:
 * - Real live data computation from existing orders via adminOrderApi
 * - Cohesive visual hierarchy, refined typography, and executive KPI cards
 * - Smart multi-factor category breakdown matching real menu items
 * - Clean date range filters with synchronized refresh control
 * - Responsive layout across Desktop, Tablet, and Mobile
 */
export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'

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

  // Filter orders according to selected date window
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    if (dateFilter === 'ALL') return orders;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return orders.filter((o) => {
      const rawDate = o.createdAt || o.pickup?.date || '';
      const orderDate = new Date(rawDate);
      if (isNaN(orderDate.getTime())) {
        return dateFilter === 'TODAY' ? rawDate.startsWith(todayStr) : true;
      }

      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

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
  }, [orders, dateFilter]);

  // High-Level KPIs
  const stats = useMemo(() => {
    let totalSales = 0;
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let pickedUp = 0;

    filteredOrders.forEach((o) => {
      totalSales += Number(o.subtotal || 0);
      const st = String(o.status || 'PLACED').toUpperCase().replace(' ', '_');
      if (st === 'PLACED') pending++;
      else if (st === 'PREPARING') preparing++;
      else if (st === 'READY') ready++;
      else if (st === 'PICKED_UP') pickedUp++;
    });

    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    return {
      totalOrders,
      totalSales,
      pending,
      preparing,
      ready,
      pickedUp,
      avgOrderValue,
    };
  }, [filteredOrders]);

  // Report 1 & 2: Sales and Orders Breakdown by Date
  const timelineReport = useMemo(() => {
    if (filteredOrders.length === 0) return [];

    const map = {};
    filteredOrders.forEach((o) => {
      const dateKey = o.pickup?.date || (o.createdAt ? String(o.createdAt).slice(0, 10) : 'Recent');
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, sales: 0, orders: 0, completed: 0 };
      }
      map[dateKey].sales += Number(o.subtotal || 0);
      map[dateKey].orders += 1;
      const st = String(o.status || '').toUpperCase();
      if (st.includes('PICKED')) {
        map[dateKey].completed += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  }, [filteredOrders]);

  // Report 3: Order Status Distribution
  const statusDistribution = useMemo(() => {
    const total = filteredOrders.length;
    if (total === 0) return null;

    return [
      {
        label: 'Pending (Placed)',
        count: stats.pending,
        color: 'bg-sky-500',
        barColor: 'from-sky-500 to-sky-600',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
        pct: Math.round((stats.pending / total) * 100),
      },
      {
        label: 'Preparing',
        count: stats.preparing,
        color: 'bg-amber-500',
        barColor: 'from-amber-500 to-amber-600',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        pct: Math.round((stats.preparing / total) * 100),
      },
      {
        label: 'Ready for Pickup',
        count: stats.ready,
        color: 'bg-emerald-500',
        barColor: 'from-emerald-500 to-emerald-600',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        pct: Math.round((stats.ready / total) * 100),
      },
      {
        label: 'Picked Up (Completed)',
        count: stats.pickedUp,
        color: 'bg-slate-600',
        barColor: 'from-slate-600 to-slate-700',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
        pct: Math.round((stats.pickedUp / total) * 100),
      },
    ];
  }, [filteredOrders, stats]);

  // Report 4: Top Selling Items
  const topSellingItems = useMemo(() => {
    if (filteredOrders.length === 0) return [];

    const itemMap = {};
    filteredOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          const name = it.name || it.itemId || 'Unknown Item';
          if (!itemMap[name]) {
            itemMap[name] = { name, quantity: 0, revenue: 0, category: it.categoryName || it.category || '' };
          }
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || 0);
          itemMap[name].quantity += qty;
          itemMap[name].revenue += price * qty;
        });
      }
    });

    return Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // Report 5: Category Performance (Smart multi-factor lookup across menu catalog)
  const categoryPerformance = useMemo(() => {
    if (filteredOrders.length === 0) return [];

    const categoryMap = {};
    const catalogItemMap = {};
    if (Array.isArray(MENU_ITEMS)) {
      MENU_ITEMS.forEach((mi) => {
        const catName = mi.categoryName || mi.category;
        if (mi?.id) catalogItemMap[mi.id] = catName;
        if (mi?.name) catalogItemMap[mi.name.toUpperCase().trim()] = catName;
      });
    }

    filteredOrders.forEach((o) => {
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
          const price = Number(it.price || 0);
          categoryMap[cat].itemsSold += qty;
          categoryMap[cat].revenue += price * qty;
        });
      }
    });

    return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ============================================================== */}
      {/* 1. PAGE HEADER & COMPACT FILTER TOOLBAR                       */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Analytics & Reports
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Performance metrics, sales overview, order volume, and catalog trends.
          </p>
        </div>

        {/* Date Filter & Refresh Toolbar in One Clean Row */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-xs">
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

      {/* ============================================================== */}
      {/* 2. TOP METRICS SUMMARY CARDS (Balanced, Iconic, Luxury)       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-tight">
              {stats.totalOrders}
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              Orders
            </span>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/30 to-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Total Sales
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-sans tracking-tight">
              ₹{stats.totalSales}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Revenue
            </span>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-2xl border border-sky-200/90 bg-gradient-to-b from-sky-50/30 to-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-sky-900 font-sans tracking-tight">
              {stats.pending}
            </span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
              Placed
            </span>
          </div>
        </div>

        {/* Preparing Orders */}
        <div className="bg-white rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/30 to-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Preparing Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343a7.975 7.975 0 012.343 5.657c0 2.122-.858 4.156-2.342 5.657z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-900 font-sans tracking-tight">
              {stats.preparing}
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              Kitchen
            </span>
          </div>
        </div>

        {/* Ready Orders */}
        <div className="bg-white rounded-2xl border border-teal-200/90 bg-gradient-to-b from-teal-50/30 to-white p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              Ready Orders
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-teal-900 font-sans tracking-tight">
              {stats.ready}
            </span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
              Counter
            </span>
          </div>
        </div>

        {/* Picked Up */}
        <div className="bg-white rounded-2xl border border-slate-300 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Picked Up
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-800 font-sans tracking-tight">
              {stats.pickedUp}
            </span>
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
              Done
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. ROW 2: SALES OVERVIEW & ORDERS OVERVIEW                     */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Overview */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Sales Overview</h2>
              <p className="text-xs text-slate-500">Daily takeaway revenue generated from customer parcels.</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              Avg ₹{stats.avgOrderValue}/order
            </span>
          </div>

          {timelineReport.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No data available</div>
          ) : (
            <div className="space-y-3.5 my-auto">
              {timelineReport.map((day) => {
                const maxSales = Math.max(...timelineReport.map((d) => d.sales), 1);
                const barWidth = Math.max(8, Math.round((day.sales / maxSales) * 100));
                return (
                  <div key={day.date} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        <span className="font-mono font-bold text-slate-800">{day.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">{day.orders} {day.orders === 1 ? 'order' : 'orders'}</span>
                        <span className="font-extrabold text-sm text-slate-900 font-sans">₹{day.sales}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-accent to-amber-600 h-2 rounded-full transition-all duration-500 shadow-2xs"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Orders Overview */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Orders Overview</h2>
              <p className="text-xs text-slate-500">Daily parcel order volume and completed handovers.</p>
            </div>
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              {stats.totalOrders} Total
            </span>
          </div>

          {timelineReport.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No data available</div>
          ) : (
            <div className="space-y-3 my-auto">
              {timelineReport.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-black shadow-xs">
                      <span className="text-xs leading-none">{day.orders}</span>
                      <span className="text-[8px] font-bold uppercase text-accent tracking-tighter">pkgs</span>
                    </div>
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-xs block">{day.date}</span>
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {day.completed} completed pickups
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block font-sans">
                      ₹{day.sales}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">subtotal</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. ROW 3: STATUS DISTRIBUTION & TOP SELLING ITEMS             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Distribution (1 col) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="pb-3.5 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900">Order Status Distribution</h2>
            <p className="text-xs text-slate-500">Proportion of orders currently in each operational phase.</p>
          </div>

          {!statusDistribution ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No data available</div>
          ) : (
            <div className="space-y-4 my-auto">
              {/* Stacked Proportional Distribution Bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                {statusDistribution.map((item) => (
                  item.pct > 0 && (
                    <div
                      key={item.label}
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                      title={`${item.label}: ${item.count} (${item.pct}%)`}
                    />
                  )
                ))}
              </div>

              {/* Status List with Progress */}
              <div className="space-y-3 pt-1">
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

        {/* Top Selling Items (2 cols) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Top Selling Items</h2>
              <p className="text-xs text-slate-500">Highest volume dishes ordered for restaurant pickup.</p>
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
            <div className="py-12 text-center text-slate-400 text-xs font-medium">No data available</div>
          ) : (
            <div className="overflow-x-auto my-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Top Selling Items Table">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank & Item Name</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
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
                          {item.quantity}
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
      </div>

      {/* ============================================================== */}
      {/* 5. ROW 4: CATEGORY PERFORMANCE                                 */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Category Performance</h2>
            <p className="text-xs text-slate-500">Sales and order breakdown aggregated across menu categories.</p>
          </div>
          {categoryPerformance.length > 0 && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              {categoryPerformance.length} Categories Active
            </span>
          )}
        </div>

        {categoryPerformance.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">No data available</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
            {categoryPerformance.map((cat, idx) => (
              <div
                key={cat.category}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 hover:border-accent/50 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-1 mb-2.5">
                  <span className="font-extrabold text-slate-800 text-xs leading-tight truncate" title={cat.category}>
                    {cat.category}
                  </span>
                  <span className="text-[10px] font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0">
                    {cat.itemsSold} sold
                  </span>
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-sans tracking-tight">
                    ₹{cat.revenue}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className="bg-accent h-1 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((cat.revenue / (categoryPerformance[0]?.revenue || 1)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
