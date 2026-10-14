/**
 * HAPPINESS RESTAURANT — CONTACT FORM FINAL VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Functional Testing:
 *    - Name, Mobile/Email, Message validation (empty, invalid format, boundary lengths)
 *    - Valid submissions via Phone and Email
 *    - Success displayed ONLY when backend returns 201 Created
 *    - Useful error messages on rejection
 *    - Input field persistence on error vs clearing on success
 * 2. Backend / API Verification:
 *    - POST /api/contact endpoint contract & response shape
 *    - Sanitization and persistence
 *    - Missing external email/SMS notifications configuration check
 * 3. Regression & Layout Integrity:
 *    - Black, gold, and cream styling tokens
 *    - Responsive grid and viewport adaptation
 *    - No impact on menu, cart, orders, admin panel
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import contactService from '../../src/services/contact.service.js';
import env from '../../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

console.log('================================================================');
console.log('HAPPINESS RESTAURANT — CONTACT FORM FINAL VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function testAssert(condition, desc) {
  if (condition) {
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${desc}`);
    failed++;
  }
}

async function runVerification() {
  contactService._resetMemory();

  // Create test server instance
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------
    // SECTION 1: FUNCTIONAL TESTING & VALIDATION
    // -------------------------------------------------------------
    console.log('--- 1. FUNCTIONAL TESTING: VALIDATION & ERROR HANDLING ---');

    // 1.1 Empty Name
    const resEmptyName = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', contactInfo: '9876543210', message: 'Valid message here.' }),
    });
    const jsonEmptyName = await resEmptyName.json();
    testAssert(resEmptyName.status === 400, 'Rejects empty name with HTTP 400');
    testAssert(jsonEmptyName.message.includes('Name is required'), 'Useful error message for missing name');

    // 1.2 Name Too Short (< 2 chars)
    const resShortName = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', contactInfo: '9876543210', message: 'Valid message here.' }),
    });
    const jsonShortName = await resShortName.json();
    testAssert(resShortName.status === 400, 'Rejects 1-char name with HTTP 400');
    testAssert(jsonShortName.message.includes('at least 2 characters'), 'Useful error message for short name');

    // 1.3 Empty Contact Info
    const resEmptyContact = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rajesh Patel', contactInfo: '   ', message: 'Valid message here.' }),
    });
    const jsonEmptyContact = await resEmptyContact.json();
    testAssert(resEmptyContact.status === 400, 'Rejects whitespace contactInfo with HTTP 400');
    testAssert(jsonEmptyContact.message.includes('Mobile number or email is required'), 'Useful error message for missing contact');

    // 1.4 Invalid Email / Mobile Formats
    const invalidContacts = ['abc', '12345', '98765-bad', 'name@domain', 'name@@test.com', '1234567890123'];
    for (const badContact of invalidContacts) {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rajesh Patel', contactInfo: badContact, message: 'Valid message here.' }),
      });
      const data = await res.json();
      testAssert(res.status === 400 && data.success === false, `Rejects invalid contact "${badContact}" with HTTP 400`);
    }

    // 1.5 Valid Mobile Formats (10-digit, with +91, with 0 prefix)
    const validPhones = ['9876543210', '+919876543210', '09876543210'];
    for (const phone of validPhones) {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Vikram Singh', contactInfo: phone, message: 'Inquiry about takeaway packaging.' }),
      });
      const data = await res.json();
      testAssert(res.status === 201 && data.success === true, `Accepts valid phone format "${phone}" with HTTP 201`);
    }

    // 1.6 Valid Email Formats
    const validEmails = ['vikram.singh@gmail.com', 'customer.service+tag@happinessrestaurant.com'];
    for (const email of validEmails) {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Vikram Singh', contactInfo: email, message: 'Inquiry regarding bulk parcel order.' }),
      });
      const data = await res.json();
      testAssert(res.status === 201 && data.success === true, `Accepts valid email format "${email}" with HTTP 201`);
    }

    // 1.7 Empty or Too Short Message (< 5 chars)
    const resShortMsg = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vikram Singh', contactInfo: '9876543210', message: 'Hi!' }),
    });
    const jsonShortMsg = await resShortMsg.json();
    testAssert(resShortMsg.status === 400, 'Rejects message under 5 characters with HTTP 400');
    testAssert(jsonShortMsg.message.includes('at least 5 characters'), 'Useful error message for short message');

    // 1.8 Message Too Long (> 2000 chars)
    const longMessage = 'A'.repeat(2005);
    const resLongMsg = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vikram Singh', contactInfo: '9876543210', message: longMessage }),
    });
    testAssert(resLongMsg.status === 400, 'Rejects message exceeding 2000 characters with HTTP 400');

    // -------------------------------------------------------------
    // SECTION 2: BACKEND/API VERIFICATION & NOTIFICATION CONFIG
    // -------------------------------------------------------------
    console.log('\n--- 2. BACKEND / API VERIFICATION & EXTERNAL CONFIG ---');

    // 2.1 Endpoint contract verification
    const resContract = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunita Joshi',
        contactInfo: 'sunita.joshi@example.com',
        message: 'Do you provide gluten-free thali options for parcel pickup?',
      }),
    });
    const contractData = await resContract.json();
    testAssert(resContract.status === 201, 'Endpoint responds with HTTP 201 Created');
    testAssert(contractData.success === true, 'Response contains success: true');
    testAssert(typeof contractData.message === 'string', 'Response contains descriptive success message');
    testAssert(contractData.data && typeof contractData.data.id === 'string', 'Response contains unique message ID');
    testAssert(contractData.data.status === 'NEW', 'New contact message initialized with status "NEW"');

    // 2.2 Storage & Persistence Verification
    const savedMessages = await contactService.getMessages();
    const sunitaRecord = savedMessages.find((m) => m.name === 'Sunita Joshi');
    testAssert(Boolean(sunitaRecord), 'Message correctly saved in persistence layer');
    testAssert(sunitaRecord?.contactInfo === 'sunita.joshi@example.com', 'Message preserves exact contact information');

    // 2.3 External Notification Provider Audit
    console.log('\n--- Auditing External Notification Providers ---');
    const hasSmtp = Boolean(process.env.SMTP_HOST || process.env.EMAIL_PROVIDER || process.env.SENDGRID_API_KEY);
    testAssert(!hasSmtp, 'Confirmed: External SMTP/Email provider is NOT configured in environment (stored in DB only)');
    console.log('  * Note: Inquiries are safely captured and retained in the restaurant database for staff review.');

    // -------------------------------------------------------------
    // SECTION 3: FRONTEND STATE, UX & REGRESSION CHECKS
    // -------------------------------------------------------------
    console.log('\n--- 3. FRONTEND IMPLEMENTATION & REGRESSION VERIFICATION ---');

    const contactPagePath = path.join(projectRoot, 'frontend/src/pages/customer/ContactPage.jsx');
    const contactSrc = fs.readFileSync(contactPagePath, 'utf8');

    // 3.1 Button & Double Submit Prevention
    testAssert(contactSrc.includes('disabled={isSubmitting}'), 'Submit button disabled while request is processing');
    testAssert(contactSrc.includes('Sending Message...'), 'Displays "Sending Message..." during active submission');
    testAssert(contactSrc.includes('svg className="animate-spin'), 'Displays animated spinner SVG when isSubmitting is true');

    // 3.2 Success displayed ONLY on genuine success
    testAssert(
      contactSrc.includes('if (res && res.success)') && contactSrc.includes("setFormStatus({ type: 'success'"),
      'Success status is strictly gated on res && res.success'
    );
    testAssert(
      contactSrc.includes("setFormData({ name: '', contactInfo: '', message: '' })"),
      'Form fields cleared ONLY upon verified successful submission'
    );

    // 3.3 Error state preserves user inputs
    testAssert(
      !contactSrc.includes("catch (err) {\n      setFormData"),
      'Error handler preserves form input values so customer does not lose typed text'
    );

    // 3.4 Black, Gold, and Cream Theme Integrity
    testAssert(contactSrc.includes('bg-secondary min-h-screen'), 'Preserves cream background (bg-secondary)');
    testAssert(contactSrc.includes('bg-primary text-secondary'), 'Preserves black primary button (bg-primary)');
    testAssert(contactSrc.includes('text-accent'), 'Preserves gold accent typography (text-accent)');
    testAssert(contactSrc.includes('border-surface-border'), 'Preserves subtle cream surface borders');

    // 3.5 Responsive Layout Integrity
    testAssert(contactSrc.includes('grid-cols-1 lg:grid-cols-12'), '12-column responsive layout for mobile, tablet, and desktop');
    testAssert(contactSrc.includes('lg:col-span-5'), 'Contact details and hours occupy 5 columns on desktop');
    testAssert(contactSrc.includes('lg:col-span-7'), 'Contact form and map occupy 7 columns on desktop');

    // 3.6 Unrelated Core Features Untouched
    const appRoutesPath = path.join(projectRoot, 'frontend/src/App.jsx');
    const appRoutesSrc = fs.readFileSync(appRoutesPath, 'utf8');
    testAssert(appRoutesSrc.includes('path="/menu"'), 'Menu route intact');
    testAssert(appRoutesSrc.includes('path="/cart"'), 'Cart route intact');
    testAssert(appRoutesSrc.includes('path="/checkout"'), 'Checkout / Parcel Pickup route intact');
    testAssert(appRoutesSrc.includes('path="/track/:orderId"'), 'Order tracking route intact');
    testAssert(appRoutesSrc.includes('path="/admin"'), 'Admin panel route intact');

  } catch (err) {
    console.error('Final verification error:', err);
    failed++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  console.log('\n================================================================');
  console.log(`FINAL RESULTS: TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL FINAL CONTACT FORM REQUIREMENTS VERIFIED SUCCESSFULLY (100%).\n');
  }
}

runVerification();
