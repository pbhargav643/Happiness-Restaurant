import mongoose from 'mongoose';
import MenuItem, { generateSlug } from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('MENU ITEM MODEL & SCHEMA AUDIT TEST SUITE');
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
    // 1. Slug Generator Function
    console.log('--- Test 1: Slug Generation Utility ---');
    assert(generateSlug('Veg Manchurian') === 'veg-manchurian', 'Slugifies standard text');
    assert(generateSlug('SP. PANEER BHURJI (DRY)') === 'sp-paneer-bhurji-dry', 'Handles dots and parentheses');
    assert(generateSlug('CHEESE CHILLI GARLIC NAAN') === 'cheese-chilli-garlic-naan', 'Handles all uppercase words');
    assert(generateSlug('  Extra  Spaces  ') === 'extra-spaces', 'Trims whitespace');
    assert(generateSlug('') === '', 'Handles empty string');
    assert(generateSlug(null) === '', 'Handles null gracefully');

    // 2. Schema Fields Inspection
    console.log('\n--- Test 2: MenuItem Schema Fields Inspection ---');
    const schemaPaths = MenuItem.schema.paths;
    
    assert(schemaPaths['_id'] !== undefined, '_id field exists in schema');
    assert(schemaPaths['name'] !== undefined, 'name field exists in schema');
    assert(schemaPaths['slug'] !== undefined, 'slug field exists in schema');
    assert(schemaPaths['category'] !== undefined, 'category field exists in schema');
    assert(schemaPaths['price'] !== undefined, 'price field exists in schema');
    assert(schemaPaths['image'] !== undefined, 'image field exists in schema');
    assert(schemaPaths['description'] !== undefined, 'description field exists in schema');
    assert(schemaPaths['isAvailable'] !== undefined, 'isAvailable field exists in schema');
    assert(schemaPaths['createdAt'] !== undefined, 'createdAt field exists (timestamps)');
    assert(schemaPaths['updatedAt'] !== undefined, 'updatedAt field exists (timestamps)');

    // 3. Field Types and Constraints
    console.log('\n--- Test 3: Field Types and Constraints ---');
    assert(schemaPaths['price'].instance === 'Number', 'price is Number type');
    assert(schemaPaths['isAvailable'].instance === 'Boolean', 'isAvailable is Boolean type');
    assert(schemaPaths['name'].isRequired === true, 'name is required');
    assert(schemaPaths['category'].isRequired === true, 'category is required');
    assert(schemaPaths['price'].isRequired === true, 'price is required');
    assert(schemaPaths['slug'].options.unique === true, 'slug has unique constraint');

    // 4. Client Validation Hook
    console.log('\n--- Test 4: Document Validation and Defaults ---');
    const validDoc = new MenuItem({
      name: 'Paneer Butter Masala Test',
      category: 'paneer-ka-khajana',
      price: 250,
      image: '/images/menu/paneer_butter_masala.jpg',
      description: 'Rich tomato and cashew gravy with fresh cottage cheese.',
    });

    // Run validation without saving
    await validDoc.validate();
    assert(validDoc.slug === 'paneer-butter-masala-test', 'Slug auto-generated from name if not provided');
    assert(validDoc.isAvailable === true, 'isAvailable defaults to true');

    // 5. Invalid Price Validation Rejection
    console.log('\n--- Test 5: Model Rejects Negative Price ---');
    const negativeDoc = new MenuItem({
      name: 'Negative Price Dish',
      category: 'starter',
      price: -50,
    });
    let negPriceErr = null;
    try {
      await negativeDoc.validate();
    } catch (err) {
      negPriceErr = err;
    }
    assert(negPriceErr !== null, 'Rejects negative price');
    assert(negPriceErr?.errors?.price !== undefined, 'Validation error points to price');

    // 6. Missing Name Rejection
    console.log('\n--- Test 6: Model Rejects Missing Name ---');
    const noNameDoc = new MenuItem({
      category: 'starter',
      price: 100,
    });
    let noNameErr = null;
    try {
      await noNameDoc.validate();
    } catch (err) {
      noNameErr = err;
    }
    assert(noNameErr !== null, 'Rejects missing item name');
    assert(noNameErr?.errors?.name !== undefined, 'Validation error points to name');

  } catch (err) {
    console.error('Menu model test error:', err);
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
