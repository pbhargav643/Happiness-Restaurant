import mongoose from 'mongoose';
import Table, { getNormalizedTableKey } from '../../src/models/Table.js';

console.log('====================================================');
console.log('TABLE MODEL ARCHITECTURE & VALIDATION TEST SUITE');
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
    // 1. Model Loading & Instantiation
    console.log('--- 1. Model Loading & Instantiation ---');
    assert(typeof Table === 'function', 'Table model loads successfully as Mongoose Model');
    assert(typeof getNormalizedTableKey === 'function', 'getNormalizedTableKey helper is exported');

    // 2. Normalization Helper Logic
    console.log('\n--- 2. Normalization Key Logic ---');
    assert(getNormalizedTableKey('Table 1') === '1', 'Normalizes "Table 1" -> "1"');
    assert(getNormalizedTableKey('table 1') === '1', 'Normalizes "table 1" -> "1"');
    assert(getNormalizedTableKey('  Table 1  ') === '1', 'Trims whitespace "  Table 1  " -> "1"');
    assert(getNormalizedTableKey('1') === '1', 'Normalizes "1" -> "1"');
    assert(getNormalizedTableKey('T-1') === '1', 'Normalizes "T-1" -> "1"');
    assert(getNormalizedTableKey('tbl 04') === '04', 'Normalizes "tbl 04" -> "04"');
    assert(getNormalizedTableKey('Terrace Corner') === 'terrace corner', 'Normalizes custom name "Terrace Corner"');
    assert(getNormalizedTableKey('') === '', 'Handles empty string gracefully');
    assert(getNormalizedTableKey(null) === '', 'Handles null gracefully');

    // 3. Valid Table Instantiation
    console.log('\n--- 3. Valid Schema Instantiation ---');
    const validTable = new Table({
      tableNumber: 'Table 1',
      name: 'Window Bay',
      capacity: 4,
      status: 'Active',
    });
    const validErr = validTable.validateSync();
    assert(!validErr, 'Valid Table passes schema validation without errors');
    assert(validTable.normalizedNumber === '1', 'Pre-validate hook sets normalizedNumber to "1"');
    assert(validTable.status === 'Active', 'Status defaults to "Active"');
    assert(validTable.isOccupied === false, 'isOccupied defaults to false');
    assert(validTable.activeOrderId === null, 'activeOrderId defaults to null');

    // 4. Required Fields Enforcement
    console.log('\n--- 4. Required Fields Enforcement ---');
    const emptyTable = new Table({});
    const emptyErr = emptyTable.validateSync();
    assert(emptyErr && emptyErr.errors['tableNumber'], 'tableNumber is required');
    assert(emptyErr && emptyErr.errors['capacity'], 'capacity is required');

    // 5. Capacity Constraints
    console.log('\n--- 5. Capacity Constraint Validations ---');
    const zeroCapacity = new Table({ tableNumber: 'T-99', capacity: 0 });
    const zeroErr = zeroCapacity.validateSync();
    assert(zeroErr && zeroErr.errors['capacity'], 'Rejects capacity 0 (min is 1)');

    const negativeCapacity = new Table({ tableNumber: 'T-99', capacity: -4 });
    const negErr = negativeCapacity.validateSync();
    assert(negErr && negErr.errors['capacity'], 'Rejects negative capacity (-4)');

    const floatCapacity = new Table({ tableNumber: 'T-99', capacity: 3.5 });
    const floatErr = floatCapacity.validateSync();
    assert(floatErr && floatErr.errors['capacity'], 'Rejects non-integer capacity (3.5)');

    const overCapacity = new Table({ tableNumber: 'T-99', capacity: 51 });
    const overErr = overCapacity.validateSync();
    assert(overErr && overErr.errors['capacity'], 'Rejects capacity > 50 (max is 50)');

    const validCapacity = new Table({ tableNumber: 'T-99', capacity: 8 });
    const validCapErr = validCapacity.validateSync();
    assert(!validCapErr?.errors?.['capacity'], 'Accepts valid integer capacity (8)');

    // 6. Status Enum Enforcement
    console.log('\n--- 6. Status Enum Constraint ---');
    const invalidStatus = new Table({ tableNumber: 'T-10', capacity: 4, status: 'Archived' });
    const statusErr = invalidStatus.validateSync();
    assert(statusErr && statusErr.errors['status'], 'Rejects invalid status "Archived"');

    const inactiveStatus = new Table({ tableNumber: 'T-10', capacity: 4, status: 'Inactive' });
    const inactiveErr = inactiveStatus.validateSync();
    assert(!inactiveErr?.errors?.['status'], 'Accepts valid "Inactive" status');

    // 7. Isolation & Zero Customer Data Verification
    console.log('\n--- 7. Zero Customer Data in Table Model ---');
    const paths = Object.keys(Table.schema.paths);
    assert(!paths.includes('customer'), 'Table model contains no customer field');
    assert(!paths.includes('customerId'), 'Table model contains no customerId field');
    assert(!paths.includes('customerName'), 'Table model contains no customerName field');
    assert(!paths.includes('customerPhone'), 'Table model contains no customerPhone field');
    assert(!paths.includes('customerEmail'), 'Table model contains no customerEmail field');
    assert(!paths.includes('authToken'), 'Table model contains no authToken field');
    assert(paths.includes('createdAt') && paths.includes('updatedAt'), 'Table model contains createdAt & updatedAt timestamps');

    // 8. Database Index Definitions
    console.log('\n--- 8. Database Index Configuration ---');
    const normPath = Table.schema.paths['normalizedNumber'];
    assert(normPath.options.unique === true, 'normalizedNumber has database-level unique constraint');

    const schemaIndexes = Table.schema.indexes();
    const seenIndexSignatures = new Set();
    let hasDuplicateIndex = false;
    schemaIndexes.forEach(([fields]) => {
      const sig = JSON.stringify(fields);
      if (seenIndexSignatures.has(sig)) {
        hasDuplicateIndex = true;
      }
      seenIndexSignatures.add(sig);
    });
    assert(!hasDuplicateIndex, 'No redundant or duplicate index definitions in Table schema');

  } catch (error) {
    console.error('Table model test exception:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TABLE MODEL SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
