/**
 * Centralized Restaurant Pickup Configuration & Slot Generation Utilities
 *
 * This configuration controls:
 * - Restaurant daily operating / kitchen hours
 * - Pickup slot interval (e.g. 15 minutes)
 * - Preparation buffer time (e.g. minimum 20 minutes from now)
 * - Maximum advance ordering window
 *
 * STRICT BUSINESS MODEL: RESTAURANT SELF-PICKUP ONLY (ZERO HOME DELIVERY)
 */

export const PICKUP_CONFIG = {
  openingTime: '11:00', // 11:00 AM (24h format)
  closingTime: '22:30', // 10:30 PM (Kitchen last order, 24h format)
  slotIntervalMinutes: 15,
  preparationBufferMinutes: 20,
  maxDaysAhead: 7, // Today + next 6 days
  serviceMode: 'Restaurant Self-Pickup',
  pickupNotice:
    'Your order will be prepared fresh in our kitchen and collected by you directly from the restaurant counter. No home delivery is available.',
};

/**
 * Format a 24h 'HH:mm' string into human-friendly 12-hour AM/PM format
 * e.g. '11:00' -> '11:00 AM', '20:15' -> '8:15 PM'
 */
export function formatTime12h(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minuteStr = m < 10 ? `0${m}` : `${m}`;
  return `${hour12}:${minuteStr} ${ampm}`;
}

/**
 * Get available pickup dates starting from today up to maxDaysAhead
 */
export function getAvailablePickupDates(maxDays = PICKUP_CONFIG.maxDaysAhead, referenceDate = new Date()) {
  const dates = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoString = `${year}-${month}-${day}`;

    let label = '';
    if (i === 0) {
      label = `Today (${daysOfWeek[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]})`;
    } else if (i === 1) {
      label = `Tomorrow (${daysOfWeek[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]})`;
    } else {
      label = `${daysOfWeek[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    dates.push({
      value: isoString,
      label,
      isToday: i === 0,
      dateObject: d,
    });
  }

  return dates;
}

/**
 * Generate pickup time slots from configuration for a selected date
 * Automatically respects preparation buffer if the date is Today.
 */
export function generatePickupSlots(selectedDateStr, config = PICKUP_CONFIG, currentTime = new Date()) {
  const slots = [];
  if (!selectedDateStr) return slots;

  const [openH, openM] = config.openingTime.split(':').map((n) => parseInt(n, 10));
  const [closeH, closeM] = config.closingTime.split(':').map((n) => parseInt(n, 10));

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Determine if selected date is Today
  const year = currentTime.getFullYear();
  const month = String(currentTime.getMonth() + 1).padStart(2, '0');
  const day = String(currentTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const isToday = selectedDateStr === todayStr;

  const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const earliestAllowedMinutesToday = currentTotalMinutes + config.preparationBufferMinutes;

  for (let m = openMinutes; m <= closeMinutes; m += config.slotIntervalMinutes) {
    const slotH = Math.floor(m / 60);
    const slotM = m % 60;
    const time24 = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
    const label = formatTime12h(time24);

    let isAvailable = true;
    let reason = '';

    if (isToday) {
      if (m < currentTotalMinutes) {
        isAvailable = false;
        reason = 'Past time';
      } else if (m < earliestAllowedMinutesToday) {
        isAvailable = false;
        reason = 'Kitchen prep buffer';
      }
    }

    slots.push({
      time: time24,
      label,
      isAvailable,
      reason,
      totalMinutes: m,
    });
  }

  return slots;
}

/**
 * Validate customer contact information
 */
export function validateCustomerDetails({ name, phone, email }) {
  const errors = {};

  // 1. Name validation
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Please enter your name.';
  } else if (name.trim().length < 2) {
    errors.name = 'Please enter your full name (at least 2 characters).';
  }

  // 2. Mobile validation (Indian 10-digit number)
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    errors.phone = 'Please enter your mobile number.';
  } else {
    // Normalize phone: strip spaces, dashes, parentheses
    let cleanedPhone = phone.replace(/[\s\-()]/g, '');
    if (cleanedPhone.startsWith('+91')) {
      cleanedPhone = cleanedPhone.slice(3);
    } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
      cleanedPhone = cleanedPhone.slice(2);
    } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
      cleanedPhone = cleanedPhone.slice(1);
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(cleanedPhone)) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }
  }

  // 3. Email validation (Optional)
  if (email && typeof email === 'string' && email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address or leave blank.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Normalize Indian mobile number to clean 10-digit format
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  return cleaned;
}

/**
 * Format ISO date string (YYYY-MM-DD) into readable format
 * e.g. '2026-09-15' -> 'Tuesday, 15 September 2026'
 */
export function formatDateReadable(dateStr) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map((n) => parseInt(n, 10));
    const d = new Date(year, month - 1, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

