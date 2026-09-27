import MenuItem from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('MENU ITEM MODEL ARCHITECTURE TEST SUITE');
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
    assert(typeof MenuItem === 'function', 'MenuItem model loads successfully');

    // 2. Valid MenuItem
    console.log('\n--- 2. Valid Schema Instantiation ---');
    const validItem = new MenuItem({
      name: 'Paneer Butter Masala',
      slug: 'paneer-butter-masala',
      category: 'paneer-ka-khajana',
      price: 260,
      description: 'Cottage cheese cubes simmered in rich tomato gravy',
      isAvailable: true,
      image: '/images/menu/paneer_butter_masala.jpg',
    });
    const validErr = validItem.validateSync();
    assert(!validErr, 'Valid MenuItem passes schema validation without errors');
    assert(validItem.isAvailable === true, 'isAvailable defaults to true');
    assert(validItem.price === 260, 'Price is numeric');

    // 3. Required Fields Verification
    console.log('\n--- 3. Required Fields Enforcement ---');
    const invalidItem = new MenuItem({});
    const invalidErr = invalidItem.validateSync();
    assert(invalidErr && invalidErr.errors['name'], 'name is required');
    assert(invalidErr && invalidErr.errors['slug'], 'slug is required');
    assert(invalidErr && invalidErr.errors['category'], 'category is required');
    assert(invalidErr && invalidErr.errors['price'], 'price is required');

    // 4. Numeric & Non-Negative Price Constraint
    console.log('\n--- 4. Price Constraints ---');
    const negativePriceItem = new MenuItem({
      name: 'Test Item',
      slug: 'test-item',
      category: 'starter',
      price: -10,
    });
    const negErr = negativePriceItem.validateSync();
    assert(negErr && negErr.errors['price'], 'Rejects negative price (< 0)');

    const zeroPriceItem = new MenuItem({
      name: 'Special Papad',
      slug: 'special-papad',
      category: 'starter',
      price: 0,
    });
    assert(!zeroPriceItem.validateSync(), 'Accepts zero price (>= 0)');

    // 5. Index Definitions & Duplicate Index Check
    console.log('\n--- 5. Database Indexes Audit ---');
    const slugPath = MenuItem.schema.paths['slug'];
    const categoryPath = MenuItem.schema.paths['category'];

    assert(slugPath.options.unique === true, 'slug has unique constraint');
    assert(categoryPath.options.index === true, 'category has index constraint');

    const schemaIndexes = MenuItem.schema.indexes();
    const seenIndexSignatures = new Set();
    let hasDuplicateIndex = false;
    schemaIndexes.forEach(([fields]) => {
      const sig = JSON.stringify(fields);
      if (seenIndexSignatures.has(sig)) {
        hasDuplicateIndex = true;
      }
      seenIndexSignatures.add(sig);
    });

    assert(!hasDuplicateIndex, 'No duplicate index definitions in MenuItem schema');
    assert(seenIndexSignatures.has(JSON.stringify({ slug: 1 })), 'slug has dedicated index');
    assert(seenIndexSignatures.has(JSON.stringify({ category: 1 })), 'category has dedicated index');
  } catch (error) {
    console.error('MenuItem test error:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`MENU ITEM SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
