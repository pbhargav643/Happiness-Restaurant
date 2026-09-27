import React from 'react';
import { Link } from 'react-router-dom';
import {
  ORDER_STATUS_STEPS,
  getOrderStatusStepIndex,
  getOrderStatusDescription,
  isOrderCompleted,
} from '../../services/orderService.js';

const STATUS_DETAILS = [
  {
    key: 'PLACED',
    stepNumber: 1,
    label: 'Order Placed',
    subLabel: 'Registered with restaurant',
    description: 'Your order has been placed.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'PREPARING',
    stepNumber: 2,
    label: 'Preparing',
    subLabel: 'Kitchen preparing parcel',
    description: 'Your order is being prepared.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    key: 'READY',
    stepNumber: 3,
    label: 'Ready for Pickup',
    subLabel: 'Available at pickup desk',
    description: 'Your parcel is ready for pickup.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    key: 'PICKED UP',
    stepNumber: 4,
    label: 'Picked Up',
    subLabel: 'Handed over to customer',
    description: 'Your order has been completed.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

/**
 * Customer-friendly status label mapping (Section 3)
 * PLACED -> Order Placed
 * PREPARING -> Preparing
 * READY -> Ready for Pickup
 * PICKED_UP -> Picked Up
 */
export function getCustomerFriendlyStatus(status) {
  if (!status) return 'Order Placed';
  const norm = String(status).trim().toUpperCase().replace('_', ' ');
  switch (norm) {
    case 'PREPARING':
      return 'Preparing';
    case 'READY':
      return 'Ready for Pickup';
    case 'PICKED UP':
      return 'Picked Up';
    case 'PLACED':
    default:
      return 'Order Placed';
  }
}

/**
 * OrderStatusIndicator Component
 * Visual 4-stage progression indicator:
 * PLACED -> PREPARING -> READY -> PICKED UP
 *
 * Implements:
 * - Accurate display of stored status (no automatic / simulated changes)
 * - Required UI status descriptions
 * - Prominent "Ready for Pickup" section when status is READY
 * - Completed order visual distinction when status is PICKED UP
 * - Accessible stepper with semantic markup
 */
export default function OrderStatusIndicator({
  status = 'PLACED',
  compact = false,
  orderId = null,
  pickupDate = null,
  pickupTime = null,
  readyTime = null,
}) {
  const normStatus = String(status || 'PLACED').trim().toUpperCase().replace('_', ' ');
  const currentStep = getOrderStatusStepIndex(status);
  const isCompleted = isOrderCompleted(status);
  const statusDescription = getOrderStatusDescription(status);
  const customerFriendlyLabel = getCustomerFriendlyStatus(status);

  // Status badge config
  const getBadgeStyle = () => {
    switch (normStatus) {
      case 'PREPARING':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'READY':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/40 animate-pulse';
      case 'PICKED UP':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'PLACED':
      default:
        return 'bg-sky-100 text-sky-900 border-sky-300';
    }
  };

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide ${getBadgeStyle()}`}
      >
        {isCompleted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-current" />
        )}
        <span>{customerFriendlyLabel}</span>
      </span>
    );
  }

  return (
    <div className="w-full space-y-5" aria-label={`Order status: ${status}`}>
      {/* Current status header badge & description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
        <div>
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-0.5">
            Current Order Status
          </span>
          <p className="text-sm font-semibold text-primary">
            {statusDescription}
            {readyTime && normStatus !== 'PICKED UP' && (
              <span className="ml-2 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Ready around: {readyTime}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${getBadgeStyle()}`}
          >
            {isCompleted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-2 h-2 rounded-full bg-current" />
            )}
            <span>{isCompleted ? 'Order Completed' : customerFriendlyLabel}</span>
          </span>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="relative pt-2 pb-1">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative z-10">
          {STATUS_DETAILS.map((step, idx) => {
            const isStepCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            let circleClasses = 'bg-white border-2 border-surface-border text-muted-light';
            let titleClasses = 'text-muted-light font-medium';

            if (isStepCompleted) {
              circleClasses = 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-xs';
              titleClasses = 'text-emerald-800 font-bold';
            } else if (isCurrent) {
              if (isCompleted) {
                circleClasses = 'bg-slate-700 border-2 border-slate-700 text-white shadow-xs';
                titleClasses = 'text-slate-900 font-extrabold';
              } else if (status === 'READY') {
                circleClasses = 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-md ring-4 ring-emerald-200';
                titleClasses = 'text-emerald-900 font-extrabold';
              } else {
                circleClasses = 'bg-accent border-2 border-accent text-white shadow-md ring-4 ring-accent/20';
                titleClasses = 'text-primary font-extrabold';
              }
            }

            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 ${circleClasses}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {idx <= currentStep ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="w-3 h-3 rounded-full border-2 border-slate-300 block" aria-hidden="true" />
                  )}
                </div>

                {/* Step Number & Label */}
                <span className="text-[9px] text-muted-light mt-1.5 uppercase font-semibold">
                  Step {step.stepNumber}
                </span>
                <span className={`text-[11px] sm:text-xs leading-tight ${titleClasses}`}>
                  {step.label}
                </span>

                {/* Sub-label for larger screens */}
                <span className="hidden md:block text-[10px] text-muted mt-0.5 max-w-[110px] leading-tight">
                  {step.subLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Connecting progress bar line */}
        <div className="absolute top-6 sm:top-7 left-[12%] right-[12%] h-0.5 bg-surface-border -z-0">
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted ? 'bg-slate-600' : 'bg-accent'
            }`}
            style={{
              width: `${(currentStep / (STATUS_DETAILS.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* SPECIAL SECTION: When Status is READY */}
      {(status === 'READY' || normStatus === 'READY') && (
        <div
          role="region"
          aria-label="Ready for Pickup Alert"
          className="p-5 sm:p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 animate-ping flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
              READY FOR PICKUP
            </h3>
          </div>

          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-emerald-900 leading-snug">
              Your parcel is ready for pickup.
            </p>
            <p className="text-xs sm:text-sm text-emerald-800 font-medium">
              Please collect your parcel from HAPPINESS RESTAURANT.
            </p>
          </div>

          {/* Schedule & Ready Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 text-xs">
            {orderId && (
              <div className="bg-white/90 rounded-2xl p-3 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Order ID</span>
                <strong className="font-mono text-xs text-primary block mt-0.5">{orderId}</strong>
              </div>
            )}
            {pickupDate && (
              <div className="bg-white/90 rounded-2xl p-3 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Pickup Date</span>
                <strong className="text-xs text-primary block mt-0.5">{pickupDate}</strong>
              </div>
            )}
            {pickupTime && (
              <div className="bg-white/90 rounded-2xl p-3 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Pickup Time</span>
                <strong className="text-xs text-accent font-extrabold block mt-0.5">{pickupTime}</strong>
              </div>
            )}
            {readyTime && (
              <div className="bg-white/90 rounded-2xl p-3 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Ready Time</span>
                <strong className="text-xs text-emerald-900 font-extrabold block mt-0.5">{readyTime}</strong>
              </div>
            )}
          </div>

          {/* Verified Restaurant Pickup Location Card */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-300/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                Pickup Counter Location
              </span>
            </div>
            <div>
              <strong className="text-sm font-extrabold text-primary block">
                HAPPINESS RESTAURANT
              </strong>
              <p className="text-xs text-muted leading-relaxed mt-0.5">
                QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India
              </p>
              <p className="text-[11px] text-muted-dark font-medium mt-0.5">
                Landmark: Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora.
              </p>
            </div>
          </div>

          {/* Action CTAs: Get Directions and View Order Details */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Happiness+Restaurant+Navjivan+Colony+Bilimora+Gujarat+396325"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
              aria-label="Get Directions to Happiness Restaurant on Google Maps"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Get Directions</span>
            </a>

            {orderId && (
              <Link
                to={`/orders/${orderId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-secondary text-primary border border-surface-border text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer"
                aria-label={`View full details for order ${orderId}`}
              >
                <span>View Order Details</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* COMPLETED STATUS CALLOUT: When Status is PICKED UP */}
      {isCompleted && (
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex items-start gap-3.5 text-xs shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-700" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">
              ORDER COMPLETED
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Your parcel was successfully collected from HAPPINESS RESTAURANT. This order remains permanently recorded in your Order History.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
