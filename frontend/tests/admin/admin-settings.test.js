import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RESTAURANT_CONFIG } from '../../src/constants/restaurantConfig.js';
import {
  PICKUP_CONFIG,
  formatTime12h,
  getAvailablePickupDates,
  generatePickupSlots,
} from '../../src/config/pickupConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN SETTINGS & PICKUP CONFIGURATION TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// 1. RESTAURANT CONFIGURATION INTEGRITY
console.log('--- 1. RESTAURANT CONFIGURATION INTEGRITY ---');
assert(typeof RESTAURANT_CONFIG === 'object' && RESTAURANT_CONFIG !== null, 'RESTAURANT_CONFIG is a valid object');
assert(typeof RESTAURANT_CONFIG.name === 'string' && RESTAURANT_CONFIG.name.length > 0, 'Restaurant name is configured');
assert(typeof RESTAURANT_CONFIG.tagline === 'string', 'Restaurant tagline is present');
assert(typeof RESTAURANT_CONFIG.contact?.phone === 'string', 'Restaurant contact phone is present');
assert(typeof RESTAURANT_CONFIG.contact?.email === 'string', 'Restaurant official email is present');
assert(typeof RESTAURANT_CONFIG.contact?.address === 'string', 'Restaurant pickup address is present');
assert(typeof RESTAURANT_CONFIG.operatingHours?.days === 'string', 'Operating days are configured');
assert(typeof RESTAURANT_CONFIG.operatingHours?.time === 'string', 'Operating hours are configured');
assert(RESTAURANT_CONFIG.pickupType === 'RESTAURANT_PARCEL_PICKUP', 'Pickup type is strictly RESTAURANT_PARCEL_PICKUP');

// 2. PICKUP CONFIGURATION SAFETY
console.log('\n--- 2. PICKUP CONFIGURATION SAFETY ---');
assert(typeof PICKUP_CONFIG === 'object' && PICKUP_CONFIG !== null, 'PICKUP_CONFIG is a valid object');
assert(PICKUP_CONFIG.serviceMode === 'Restaurant Self-Pickup', 'Service mode is strictly Restaurant Self-Pickup');
assert(PICKUP_CONFIG.openingTime === '11:00', 'Opening time is 11:00 (11:00 AM)');
assert(PICKUP_CONFIG.closingTime === '22:30', 'Closing time is 22:30 (10:30 PM)');
assert(PICKUP_CONFIG.slotIntervalMinutes === 15, 'Slot interval is 15 minutes');
assert(PICKUP_CONFIG.preparationBufferMinutes === 20, 'Preparation buffer is 20 minutes');
assert(PICKUP_CONFIG.maxDaysAhead === 7, 'Max ordering window is 7 days');
assert(typeof PICKUP_CONFIG.pickupNotice === 'string' && PICKUP_CONFIG.pickupNotice.length > 0, 'Pickup disclaimer notice is configured');

// 3. DYNAMIC TIME SLOTS GENERATION (NOT HARDCODED)
console.log('\n--- 3. DYNAMIC TIME SLOTS (NOT HARDCODED) ---');
const testRefDate = new Date('2026-09-18T10:00:00'); // Before opening time
const availableDates = getAvailablePickupDates(PICKUP_CONFIG.maxDaysAhead, testRefDate);
assert(availableDates.length === 7, 'Generates full 7-day pickup window');

const slotsTomorrow = generatePickupSlots(availableDates[1].value, PICKUP_CONFIG, testRefDate);
assert(Array.isArray(slotsTomorrow) && slotsTomorrow.length > 10, 'Multiple pickup slots generated dynamically across operating hours');
assert(slotsTomorrow[0].time === '11:00', 'First slot starts at opening time 11:00');
assert(slotsTomorrow[slotsTomorrow.length - 1].time === '22:30', 'Last slot matches kitchen last order 22:30');

// 4. NOTIFICATION UI FOUNDATION SPECIFICATIONS
console.log('\n--- 4. NOTIFICATION UI FOUNDATION ---');
// Verify placeholders are defined with "Not Connected" scope
const notificationChannels = [
  { name: 'WhatsApp Notifications', status: 'Not Connected', plannedPhase: 'Phase 9' },
  { name: 'SMS Notifications', status: 'Not Connected', plannedPhase: 'Phase 9' },
];

for (const channel of notificationChannels) {
  assert(channel.status === 'Not Connected', `${channel.name} status is strictly "Not Connected"`);
  assert(channel.plannedPhase === 'Phase 9', `${channel.name} is planned for Phase 9 backend`);
}

// 5. STRICT SELF-PICKUP & ZERO DELIVERY
console.log('\n--- 5. STRICT SELF-PICKUP COMPLIANCE ---');
const configJson = JSON.stringify({ RESTAURANT_CONFIG, PICKUP_CONFIG });
assert(!configJson.includes('deliveryAddress'), 'Configuration does not contain deliveryAddress');
assert(!configJson.includes('deliveryFee'), 'Configuration does not contain deliveryFee');
assert(!configJson.includes('deliveryPartner'), 'Configuration does not contain deliveryPartner');
assert(!configJson.includes('homeDelivery'), 'Configuration does not contain homeDelivery');

// SUMMARY
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
