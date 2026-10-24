import React, { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ThermalReceiptSlip Component
 * Clean, readable receipt layout for thermal POS roll printers.
 * Supports both 80mm and 53mm widths with responsive monospace typography.
 */
export function ThermalReceiptSlip({ order, paperWidth = '80mm', isPreview = false }) {
  if (!order) return null;

  const isDineIn = (order.orderType || '').toUpperCase() === 'DINE_IN';
  const is53mm = paperWidth === '53mm';
  const customerName = order.customer?.name;
  const customerPhone = order.customer?.phone || order.customer?.mobile;

  const orderDateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

  return (
    <div
      className={`bg-white text-black font-mono select-none ${
        isPreview
          ? `mx-auto p-4 border border-dashed border-slate-400 shadow-md rounded-lg ${
              is53mm ? 'w-[230px] text-[11px]' : 'w-[320px] text-xs'
            }`
          : `${is53mm ? 'text-[10px] leading-tight' : 'text-xs leading-normal'}`
      }`}
      style={{
        width: isPreview ? undefined : paperWidth,
        maxWidth: isPreview ? undefined : paperWidth,
      }}
    >
      {/* 1. RESTAURANT HEADER */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <h1 className={`${is53mm ? 'text-sm font-black' : 'text-base font-black'} uppercase tracking-tight`}>
          TRUPTI SNACKS RESTAURANT
        </h1>
        <p className={`${is53mm ? 'text-[9px]' : 'text-[11px]'} font-semibold uppercase`}>
          Pure Vegetarian Delicacies
        </p>
        <p className={`${is53mm ? 'text-[8.5px]' : 'text-[10px]'} text-slate-700`}>
          Fresh Preparation &bull; Authentic Taste
        </p>
      </div>

      {/* 2. ORDER META INFO */}
      <div className="py-2 border-b border-dashed border-black space-y-1">
        <div className="flex justify-between font-bold">
          <span>ORDER #:</span>
          <span className="font-black">{order.orderId}</span>
        </div>

        <div className="flex justify-between">
          <span>TYPE:</span>
          <span className="font-bold">
            {isDineIn
              ? `DINE-IN (${order.tableNumber || (order.tableId ? 'Table #' + String(order.tableId).slice(-4) : 'Table')})`
              : 'PARCEL PICKUP'}
          </span>
        </div>

        <div className="flex justify-between text-[9.5px]">
          <span>DATE/TIME:</span>
          <span>{orderDateStr}</span>
        </div>

        {!isDineIn && (order.pickup?.dateFormatted || order.pickup?.date) && (
          <div className="flex justify-between text-[9.5px] font-bold">
            <span>PICKUP TIME:</span>
            <span>
              {order.pickup?.dateFormatted || order.pickup?.date} at{' '}
              {order.pickup?.timeFormatted || order.pickup?.time}
            </span>
          </div>
        )}

        {customerName && (
          <div className="flex justify-between">
            <span>CUSTOMER:</span>
            <span className="font-semibold">{customerName}</span>
          </div>
        )}

        {customerPhone && (
          <div className="flex justify-between text-[9.5px]">
            <span>PHONE:</span>
            <span>+91 {customerPhone}</span>
          </div>
        )}
      </div>

      {/* 3. ITEMS TABLE */}
      <div className="py-2 border-b border-dashed border-black">
        {is53mm ? (
          /* Compact 53mm Items Layout: Item name on line 1, Qty x Price & Line Total on line 2 */
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold border-b border-black pb-0.5">
              <span>ITEM DESCRIPTION</span>
              <span>TOTAL</span>
            </div>
            {(order.items || []).map((item, idx) => {
              const qty = Number(item.quantity) || 1;
              const unitPrice = Number(item.price || item.unitPrice || 0);
              const total = Number(item.itemTotal) || unitPrice * qty;
              return (
                <div key={idx} className="leading-snug">
                  <div className="font-bold break-words">{item.name}</div>
                  <div className="flex justify-between text-[9px] text-slate-800">
                    <span>
                      {qty} &times; ₹{unitPrice}
                    </span>
                    <span className="font-bold">₹{total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard 80mm Table Layout */
          <div>
            <div className="grid grid-cols-12 text-[10px] font-bold border-b border-black pb-0.5 mb-1">
              <span className="col-span-6">ITEM</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-2 text-right">PRICE</span>
              <span className="col-span-2 text-right">TOTAL</span>
            </div>
            <div className="space-y-1">
              {(order.items || []).map((item, idx) => {
                const qty = Number(item.quantity) || 1;
                const unitPrice = Number(item.price || item.unitPrice || 0);
                const total = Number(item.itemTotal) || unitPrice * qty;
                return (
                  <div key={idx} className="grid grid-cols-12 text-[11px] items-baseline">
                    <span className="col-span-6 font-semibold break-words pr-1">{item.name}</span>
                    <span className="col-span-2 text-center">{qty}</span>
                    <span className="col-span-2 text-right">₹{unitPrice}</span>
                    <span className="col-span-2 text-right font-bold">₹{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. TOTALS & BILLING */}
      <div className="py-2 border-b border-dashed border-black space-y-1">
        <div className="flex justify-between text-[11px]">
          <span>Subtotal:</span>
          <span>₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>Delivery / Packing:</span>
          <span>₹0.00</span>
        </div>
        <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
          <span>TOTAL AMOUNT:</span>
          <span>₹{order.subtotal}</span>
        </div>
      </div>

      {/* 5. PAYMENT STATUS */}
      <div className="py-1.5 border-b border-dashed border-black text-[10px]">
        {order.payment && order.payment.status === 'COMPLETED' ? (
          <div>
            <div className="flex justify-between font-bold">
              <span>PAYMENT:</span>
              <span className="uppercase">PAID via {order.payment.method} (₹{order.payment.amount || order.subtotal})</span>
            </div>
            {order.payment.recordedAt && (
              <div className="text-[9px] text-slate-700 text-right mt-0.5">
                Settled: {new Date(order.payment.recordedAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-between font-bold">
            <span>PAYMENT:</span>
            <span className="text-black uppercase">UNPAID / PENDING</span>
          </div>
        )}
      </div>

      {/* 6. CUSTOMER NOTE (IF PRESENT) */}
      {order.instructions && (
        <div className="py-1.5 border-b border-dashed border-black text-[9.5px]">
          <span className="font-bold block">CUSTOMER NOTE:</span>
          <span className="italic break-words">&ldquo;{order.instructions}&rdquo;</span>
        </div>
      )}

      {/* 7. RECEIPT FOOTER */}
      <div className="pt-2 text-center text-[9.5px] space-y-0.5">
        <p className="font-bold">*** THANK YOU! VISIT AGAIN ***</p>
        <p className="text-[8px] text-slate-600">Trupti Snacks Restaurant &bull; Pure Veg Delicacies</p>
      </div>
    </div>
  );
}

/**
 * ThermalPrintModal Component
 * Interactive modal for selecting paper roll width (80mm vs 53mm)
 * and triggering a clean, print-only browser print job without page clutter.
 */
export default function ThermalPrintModal({ isOpen, order, onClose }) {
  const [paperWidth, setPaperWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('happiness_receipt_paper_width') || '80mm';
    }
    return '80mm';
  });

  if (!isOpen || !order) return null;

  const handleSelectPaperWidth = (width) => {
    setPaperWidth(width);
    try {
      localStorage.setItem('happiness_receipt_paper_width', width);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* SCREEN MODAL DIALOG */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="thermal-print-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn no-print"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleUp overflow-hidden">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-accent border border-amber-200 flex items-center justify-center text-lg shrink-0">
                🖨️
              </div>
              <div>
                <h3 id="thermal-print-modal-title" className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Thermal Print Slip
                </h3>
                <p className="text-xs text-slate-500">
                  Order #{order.orderId} &bull; Thermal POS Receipt
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs transition cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Paper Size Selector Toolbar */}
          <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Paper Width:
              </span>
              <span className="text-xs font-mono font-bold text-primary">
                {paperWidth} roll
              </span>
            </div>

            {/* Selector Pills */}
            <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-2xs" role="group" aria-label="Receipt Paper Width">
              <button
                type="button"
                onClick={() => handleSelectPaperWidth('80mm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard 80mm thermal receipt paper (3-inch roll)"
              >
                80 mm (Standard)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaperWidth('53mm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  paperWidth === '53mm'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Compact 53mm thermal receipt paper (2-inch roll)"
              >
                53 mm (Compact)
              </button>
            </div>
          </div>

          {/* Scrollable Receipt Preview Area */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 flex flex-col items-center justify-start">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Live Receipt Preview ({paperWidth})
            </div>
            <ThermalReceiptSlip
              order={order}
              paperWidth={paperWidth}
              isPreview={true}
            />
            <p className="text-[10px] text-slate-400 text-center max-w-xs mt-3 leading-relaxed">
              Hardware Note: Page width is passed via CSS `@page size`. If your browser&apos;s print dialog defaults to Letter/A4, choose your thermal roll printer in the Destination dropdown and set Margins to None.
            </p>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Slip ({paperWidth})</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED THERMAL RECEIPT PORTAL (Rendered directly into document.body for clean @media print) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="thermal-print-portal">
            <ThermalReceiptSlip
              order={order}
              paperWidth={paperWidth}
              isPreview={false}
            />
          </div>,
          document.body
        )}

      {/* DYNAMIC THERMAL PRINT STYLES */}
      <style>{`
        @media print {
          @page {
            size: ${paperWidth} auto;
            margin: 0mm !important;
          }
          html, body {
            width: ${paperWidth} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Completely hide app root, modals, backdrops and navigation */
          #root, body > *:not(#thermal-print-portal), [role="dialog"], .no-print {
            display: none !important;
          }
          /* Print exclusively the thermal receipt portal */
          #thermal-print-portal {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            margin: 0 !important;
            padding: ${paperWidth === '53mm' ? '2mm 2.5mm' : '4mm 4mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Courier New', Courier, monospace, system-ui, sans-serif !important;
          }
          #thermal-print-portal * {
            visibility: visible !important;
            color: #000000 !important;
          }
        }
        @media screen {
          #thermal-print-portal {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
