import Admin from '../../src/models/Admin.js';

console.log('====================================================');
console.log('ADMIN MODEL ARCHITECTURE & SECURITY TEST SUITE');
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
    assert(typeof Admin === 'function', 'Admin model loads successfully');

    // 2. Valid Admin Instantiation
    console.log('\n--- 2. Valid Admin Schema Validation ---');
    const validAdmin = new Admin({
      name: 'Restaurant Manager',
      email: 'admin@restaurant.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
    });
    const validErr = validAdmin.validateSync();
    assert(!validErr, 'Valid Admin passes schema validation without errors');
    assert(validAdmin.role === 'ADMIN', 'role defaults strictly to "ADMIN"');
    assert(validAdmin.isActive === true, 'isActive defaults strictly to true');

    // 3. Required Fields Enforcement
    console.log('\n--- 3. Required Fields Enforcement ---');
    const invalidAdmin = new Admin({});
    const invalidErr = invalidAdmin.validateSync();
    assert(invalidErr && invalidErr.errors['name'], 'Admin requires name');
    assert(invalidErr && invalidErr.errors['email'], 'Admin requires email');
    assert(invalidErr && invalidErr.errors['passwordHash'], 'Admin requires passwordHash');

    // 4. Password Security (select: false)
    console.log('\n--- 4. Password Security & Plaintext Prevention ---');
    const pwPath = Admin.schema.paths['passwordHash'];
    assert(
      pwPath.options.select === false,
      'passwordHash specifies select: false (Never exposed in default queries)'
    );

    // 5. Email Uniqueness & Validation
    console.log('\n--- 5. Email Validation & Indexes ---');
    const emailPath = Admin.schema.paths['email'];
    assert(emailPath.options.unique === true, 'email has unique constraint');

    const badEmailAdmin = new Admin({
      name: 'Bad Email',
      email: 'not-an-email',
      passwordHash: 'hash123',
    });
    const badEmailErr = badEmailAdmin.validateSync();
    assert(badEmailErr && badEmailErr.errors['email'], 'Rejects invalid email format');

    // 6. Duplicate Index Check
    const schemaIndexes = Admin.schema.indexes();
    const indexFieldCounts = {};
    schemaIndexes.forEach(([fields]) => {
      Object.keys(fields).forEach((f) => {
        indexFieldCounts[f] = (indexFieldCounts[f] || 0) + 1;
      });
    });
    assert(
      (indexFieldCounts['email'] || 0) <= 1,
      `No duplicate index on email (count: ${indexFieldCounts['email'] || 0})`
    );
  } catch (error) {
    console.error('Admin model test error:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`ADMIN SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
