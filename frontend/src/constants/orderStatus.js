/**
 * Parcel Order Lifecycle States
 * In-Store Restaurant Counter Pickup
 */
export const ORDER_STATUS = {
  PLACED: 'PLACED',
  APPROVED: 'APPROVED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  CANCELLED: 'CANCELLED',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PLACED]: 'Order Placed',
  [ORDER_STATUS.APPROVED]: 'Order Approved',
  [ORDER_STATUS.PREPARING]: 'Preparing in Kitchen',
  [ORDER_STATUS.READY]: 'Ready for Pickup',
  [ORDER_STATUS.PICKED_UP]: 'Picked Up',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
};
