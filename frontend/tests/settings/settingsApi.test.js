import settingsApi, { DEFAULT_FRONTEND_SETTINGS } from '../../src/services/settingsApi.js';

console.log('====================================================');
console.log('FRONTEND SETTINGS API INTEGRATION TEST SUITE');
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

async function runTests() {
  try {
    // 1. Default Frontend Settings Verification
    console.log('--- Test 1: Default Settings Configuration ---');
    assert(typeof DEFAULT_FRONTEND_SETTINGS.restaurantName === 'string', 'Default restaurantName is a string');
    assert(typeof DEFAULT_FRONTEND_SETTINGS.pickupEnabled === 'boolean', 'Default pickupEnabled is a boolean');
    assert(DEFAULT_FRONTEND_SETTINGS.serviceMode === 'Restaurant Self-Pickup', 'Default serviceMode is "Restaurant Self-Pickup"');
    assert(typeof DEFAULT_FRONTEND_SETTINGS.openingTime === 'string', 'Default openingTime is present');
    assert(typeof DEFAULT_FRONTEND_SETTINGS.closingTime === 'string', 'Default closingTime is present');
    assert(typeof DEFAULT_FRONTEND_SETTINGS.slotInterval === 'number', 'Default slotInterval is numeric');
    assert(typeof DEFAULT_FRONTEND_SETTINGS.preparationBuffer === 'number', 'Default preparationBuffer is numeric');

    // 2. Zero Delivery Parameters Audit
    console.log('\n--- Test 2: Zero Delivery Parameters Audit ---');
    assert(DEFAULT_FRONTEND_SETTINGS.deliveryFee === undefined, 'Zero deliveryFee attribute');
    assert(DEFAULT_FRONTEND_SETTINGS.deliveryAddress === undefined, 'Zero deliveryAddress attribute');
    assert(DEFAULT_FRONTEND_SETTINGS.deliveryPartner === undefined, 'Zero deliveryPartner attribute');
    assert(DEFAULT_FRONTEND_SETTINGS.deliveryEnabled === undefined, 'Zero deliveryEnabled attribute');

    // 3. settingsApi.getSettings Live Retrieval
    console.log('\n--- Test 3: settingsApi.getSettings Live Retrieval ---');
    const liveSettings = await settingsApi.getSettings();
    assert(typeof liveSettings === 'object', 'getSettings returns an object');
    assert(typeof liveSettings.restaurantName === 'string', 'liveSettings.restaurantName is a string');
    assert(typeof liveSettings.pickupEnabled === 'boolean', 'liveSettings.pickupEnabled is a boolean');
    assert(liveSettings.serviceMode === 'Restaurant Self-Pickup', 'serviceMode strictly equals "Restaurant Self-Pickup"');
    assert(typeof liveSettings.slotInterval === 'number', 'liveSettings.slotInterval is a number');
    assert(typeof liveSettings.preparationBuffer === 'number', 'liveSettings.preparationBuffer is a number');

    // 4. Zero Delivery Attributes in Live Response
    console.log('\n--- Test 4: Live Response Zero Delivery Audit ---');
    assert(liveSettings.deliveryFee === undefined, 'Live settings contains zero deliveryFee');
    assert(liveSettings.deliveryAddress === undefined, 'Live settings contains zero deliveryAddress');
    assert(liveSettings.deliveryPartner === undefined, 'Live settings contains zero deliveryPartner');
    assert(liveSettings.deliveryEnabled === undefined, 'Live settings contains zero deliveryEnabled');
  } catch (err) {
    console.error('Settings API test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
