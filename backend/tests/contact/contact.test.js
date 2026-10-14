import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import contactService from '../../src/services/contact.service.js';

console.log('====================================================');
console.log('CONTACT MESSAGE BACKEND API & VALIDATION TEST SUITE');
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
  contactService._resetMemory();

  // Create ephemeral HTTP test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Valid Submission with Mobile Number
    console.log('--- 1. Valid Submission with 10-Digit Mobile ---');
    const resMobile = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Amit Shah',
        contactInfo: '9876543210',
        message: 'Hello, what are your takeaway counter timings on weekends?',
      }),
    });
    const jsonMobile = await resMobile.json();
    assert(resMobile.status === 201, 'POST /api/contact returns HTTP 201 Created');
    assert(jsonMobile.success === true, 'Response contains success: true');
    assert(jsonMobile.data?.name === 'Amit Shah', 'Response contains submitted name');
    assert(Boolean(jsonMobile.data?.id), 'Response contains persistent message identifier');

    // 2. Valid Submission with Email Address
    console.log('\n--- 2. Valid Submission with Email Address ---');
    const resEmail = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Verma',
        contactInfo: 'priya.verma@example.com',
        message: 'Can I place an advance parcel order for tomorrow morning?',
      }),
    });
    const jsonEmail = await resEmail.json();
    assert(resEmail.status === 201, 'POST /api/contact with email returns HTTP 201 Created');
    assert(jsonEmail.success === true, 'Response contains success: true');

    // 3. Validation: Missing / Short Name
    console.log('\n--- 3. Validation: Missing or Short Name ---');
    const resNoName = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: ' ',
        contactInfo: '9876543210',
        message: 'Valid message content here.',
      }),
    });
    const jsonNoName = await resNoName.json();
    assert(resNoName.status === 400, 'Rejects empty name with HTTP 400');
    assert(jsonNoName.success === false, 'Returns success: false for invalid name');

    // 4. Validation: Invalid Contact Info (Neither Phone nor Email)
    console.log('\n--- 4. Validation: Invalid Contact Info ---');
    const resBadContact = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Mehta',
        contactInfo: 'not-a-phone-or-email',
        message: 'Valid message content here.',
      }),
    });
    const jsonBadContact = await resBadContact.json();
    assert(resBadContact.status === 400, 'Rejects invalid contact info with HTTP 400');
    assert(jsonBadContact.message.includes('valid 10-digit mobile number or email address'), 'Provides helpful contact error message');

    // 5. Validation: Missing / Too Short Message
    console.log('\n--- 5. Validation: Missing or Too Short Message ---');
    const resShortMsg = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Mehta',
        contactInfo: '9876543210',
        message: 'Hi',
      }),
    });
    assert(resShortMsg.status === 400, 'Rejects message shorter than 5 characters with HTTP 400');

    // 6. Persistence Verification
    console.log('\n--- 6. Storage & Message Retrieval ---');
    const messages = await contactService.getMessages();
    assert(messages.length >= 2, `Saved messages exist in store (found: ${messages.length})`);
    assert(messages.some((m) => m.name === 'Amit Shah'), 'Stored messages include Amit Shah inquiry');
    assert(messages.some((m) => m.name === 'Priya Verma'), 'Stored messages include Priya Verma inquiry');

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  console.log('\n====================================================');
  console.log(`TOTAL: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL CONTACT MESSAGE TESTS PASSED WITH 100% SUCCESS.');
  }
}

runTests();
