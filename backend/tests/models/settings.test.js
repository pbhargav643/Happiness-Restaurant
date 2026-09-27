import RestaurantSettings from '../../src/models/RestaurantSettings.js';

console.log('====================================================');
console.log('RESTAURANT SETTINGS MODEL ARCHITECTURE TEST SUITE');
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
    // 1. Model Loading
    console.log('--- 1. Model Loading & Instantiation ---');
    assert(typeof RestaurantSettings === 'function', 'RestaurantSettings model loads successfully');

    // 2. Default Values Verification
    console.log('\n--- 2. Default Configuration Values ---');
    const settings = new RestaurantSettings();
    assert(settings.restaurantName === 'HAPPINESS RESTAURANT', 'restaurantName has sensible default');
    assert(settings.pickupEnabled === true, 'pickupEnabled defaults to true');
    assert(settings.openingTime === '11:00', 'openingTime defaults to 11:00');
    assert(settings.closingTime === '22:30', 'closingTime defaults to 22:30');
    assert(settings.slotInterval === 15, 'slotInterval defaults to 15 mins');
    assert(settings.preparationBuffer === 20, 'preparationBuffer defaults to 20 mins');

    // 3. Zero Delivery Settings Audit
    console.log('\n--- 3. Strict Self-Pickup / Zero Delivery Fields Audit ---');
    const paths = Object.keys(RestaurantSettings.schema.paths);
    const deliveryForbidden = ['delivery', 'rider', 'driver', 'courier', 'shipping', 'deliveryfee'];
    const foundDelivery = paths.filter((p) =>
      deliveryForbidden.some((term) => p.toLowerCase().includes(term))
    );
    assert(
      foundDelivery.length === 0,
      `RestaurantSettings schema contains zero delivery fields (Found: ${foundDelivery.join(', ') || 'None'})`
    );

    // 4. Slot & Buffer Validations
    console.log('\n--- 4. Constraints Validation ---');
    const invalidSettings = new RestaurantSettings({
      slotInterval: 2, // min is 5
      preparationBuffer: -5, // min is 0
    });
    const err = invalidSettings.validateSync();
    assert(err && err.errors['slotInterval'], 'Rejects slotInterval < 5 mins');
    assert(err && err.errors['preparationBuffer'], 'Rejects negative preparationBuffer');
  } catch (error) {
    console.error('Settings model test error:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`SETTINGS SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
