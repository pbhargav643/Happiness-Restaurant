import MenuItem, { generateSlug } from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('MENU ITEM MODEL & VALIDATION TEST SUITE');
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
    // 1. Valid MenuItem Schema Validation
    console.log('--- Test 1: Valid MenuItem Schema Validation ---');
    const validItem = new MenuItem({
      name: 'Paneer Tikka Dry',
      category: 'tandoori-starter',
      price: 260,
      description: 'Cottage cheese marinated in yogurt and spices',
    });

    const validationError = validItem.validateSync();
    assert(!validationError, 'Valid MenuItem passes schema validation without errors');
    assert(validItem.isAvailable === true, 'isAvailable defaults to true');
    assert(validItem.slug === 'paneer-tikka-dry', 'Slug is automatically generated from name');

    // 2. Missing Required Fields
    console.log('\n--- Test 2: Missing Required Fields Validation ---');
    const missingNameItem = new MenuItem({ category: 'soup', price: 120 });
    const missingNameErr = missingNameItem.validateSync();
    assert(!!missingNameErr?.errors?.name, 'MenuItem requires name');

    const emptyNameItem = new MenuItem({ name: '   ', category: 'soup', price: 120 });
    const emptyNameErr = emptyNameItem.validateSync();
    assert(!!emptyNameErr?.errors?.name, 'MenuItem rejects empty whitespace name');

    const missingCatItem = new MenuItem({ name: 'Veg Soup', price: 120 });
    const missingCatErr = missingCatItem.validateSync();
    assert(!!missingCatErr?.errors?.category, 'MenuItem requires category');

    const missingPriceItem = new MenuItem({ name: 'Veg Soup', category: 'soup' });
    const missingPriceErr = missingPriceItem.validateSync();
    assert(!!missingPriceErr?.errors?.price, 'MenuItem requires price');

    // 3. Price Constraints Validation
    console.log('\n--- Test 3: Price Constraints Validation ---');
    const negativePriceItem = new MenuItem({
      name: 'Invalid Price Soup',
      category: 'soup',
      price: -50,
    });
    const negPriceErr = negativePriceItem.validateSync();
    assert(!!negPriceErr?.errors?.price, 'MenuItem rejects negative price (< 0)');

    const zeroPriceItem = new MenuItem({
      name: 'Complimentary Sauce',
      category: 'starter',
      price: 0,
    });
    const zeroPriceErr = zeroPriceItem.validateSync();
    assert(!zeroPriceErr, 'MenuItem accepts non-negative price (>= 0)');

    // 4. Quantity Field Non-Existence (Architectural Rule)
    console.log('\n--- Test 4: Quantity Field Audit ---');
    assert(!MenuItem.schema.paths['quantity'], 'MenuItem schema strictly does NOT have a quantity field');

    // 5. Slug Generation Utility
    console.log('\n--- Test 5: Slug Generation Utility ---');
    assert(generateSlug('VEG. HOT & SOUR SOUP') === 'veg-hot-sour-soup', 'Slug cleans special characters and spaces');
    assert(generateSlug('   Paneer Malai Kabab   ') === 'paneer-malai-kabab', 'Slug trims leading/trailing spaces');
    assert(generateSlug('Soup / 123') === 'soup-123', 'Slug handles slash and alphanumeric characters');

    // 6. Index Configuration
    console.log('\n--- Test 6: Index Configuration ---');
    assert(MenuItem.schema.paths['slug'].options.unique === true, 'slug has unique constraint');
    assert(MenuItem.schema.paths['slug'].options.index === true, 'slug has single-field index');
    assert(MenuItem.schema.paths['category'].options.index === true, 'category has index');
    assert(MenuItem.schema.paths['isAvailable'].options.index === true, 'isAvailable has index');

    // Check compound index definition
    const indexes = MenuItem.schema.indexes();
    const hasCompoundIndex = indexes.some(([idx]) => idx.category === 1 && idx.isAvailable === 1);
    assert(hasCompoundIndex, 'Compound index { category: 1, isAvailable: 1 } is configured');
  } catch (err) {
    console.error('Validation test error:', err);
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
