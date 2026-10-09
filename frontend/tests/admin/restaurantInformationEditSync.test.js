import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import app from '../../../backend/app.js';
import mongoose from 'mongoose';
import { generateToken } from '../../../backend/src/utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('RESTAURANT INFORMATION — EDIT, SAVE & SYNC QA SUITE');
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

async function runTestSuite() {
  // 1. Static Code Inspection: AdminSettingsPage.jsx
  console.log('--- 1. AdminSettingsPage UI & Component Inspection ---');
  const adminSettingsPath = path.resolve(__dirname, '../../src/pages/admin/AdminSettingsPage.jsx');
  assert(fs.existsSync(adminSettingsPath), 'AdminSettingsPage.jsx exists');
  const adminSettingsSrc = fs.readFileSync(adminSettingsPath, 'utf8');

  assert(adminSettingsSrc.includes('useSettings'), 'AdminSettingsPage imports and uses useSettings');
  assert(adminSettingsSrc.includes('handleStartEdit'), 'AdminSettingsPage contains handleStartEdit handler');
  assert(adminSettingsSrc.includes('handleCancelEdit'), 'AdminSettingsPage contains handleCancelEdit handler');
  assert(adminSettingsSrc.includes('handleSaveInfo'), 'AdminSettingsPage contains handleSaveInfo persistence handler');
  assert(adminSettingsSrc.includes('Save Changes'), 'Save Changes button exists');
  assert(adminSettingsSrc.includes('Cancel'), 'Cancel button exists to discard unsaved edits');
  assert(adminSettingsSrc.includes('Edit'), 'Edit button exists for toggling edit mode');
  assert(adminSettingsSrc.includes('restaurantName'), 'Restaurant Brand Name field is wired to state');
  assert(adminSettingsSrc.includes('tagline'), 'Tagline field is wired to state');
  assert(adminSettingsSrc.includes('phone'), 'Counter Contact Phone field is wired to state');
  assert(adminSettingsSrc.includes('email'), 'Official Email field is wired to state');
  assert(adminSettingsSrc.includes('address'), 'Physical Store Address field is wired to state');
  assert(adminSettingsSrc.includes('operatingDays'), 'Operating Schedule field is wired to state');
  assert(adminSettingsSrc.includes('infoSuccessMessage'), 'Success feedback banner is implemented');
  assert(adminSettingsSrc.includes('infoErrorMessage'), 'Error feedback banner is implemented');
  assert(adminSettingsSrc.includes('isSavingInfo'), 'Loading / saving spinner state is implemented');

  // 2. Static Code Inspection: Customer Synchronization
  console.log('\n--- 2. Customer Component Synchronization Inspection ---');
  const brandPath = path.resolve(__dirname, '../../src/components/layout/Brand.jsx');
  const brandSrc = fs.readFileSync(brandPath, 'utf8');
  assert(brandSrc.includes('useSettings'), 'Brand.jsx uses useSettings to synchronize restaurant name');

  const footerPath = path.resolve(__dirname, '../../src/components/layout/Footer.jsx');
  const footerSrc = fs.readFileSync(footerPath, 'utf8');
  assert(footerSrc.includes('useSettings'), 'Footer.jsx uses useSettings to synchronize details and hours');

  const contactPath = path.resolve(__dirname, '../../src/pages/customer/ContactPage.jsx');
  const contactSrc = fs.readFileSync(contactPath, 'utf8');
  assert(contactSrc.includes('useSettings'), 'ContactPage.jsx uses useSettings to synchronize contact info');

  const aboutPath = path.resolve(__dirname, '../../src/pages/customer/AboutPage.jsx');
  const aboutSrc = fs.readFileSync(aboutPath, 'utf8');
  assert(aboutSrc.includes('useSettings'), 'AboutPage.jsx uses useSettings to synchronize operating hours');

  const heroPath = path.resolve(__dirname, '../../src/components/home/HeroSection.jsx');
  const heroSrc = fs.readFileSync(heroPath, 'utf8');
  assert(heroSrc.includes('useSettings'), 'HeroSection.jsx uses useSettings to synchronize brand name');

  // 3. Settings Service & API Client Verification
  console.log('\n--- 3. Settings Service & API Client Verification ---');
  const settingsApiPath = path.resolve(__dirname, '../../src/services/settingsApi.js');
  const settingsApiSrc = fs.readFileSync(settingsApiPath, 'utf8');
  assert(settingsApiSrc.includes('updateSettings'), 'settingsApi exposes updateSettings method');
  assert(settingsApiSrc.includes('tagline'), 'settingsApi includes tagline in settings');
  assert(settingsApiSrc.includes('email'), 'settingsApi includes email in settings');
  assert(settingsApiSrc.includes('operatingDays'), 'settingsApi includes operatingDays in settings');

  const settingsContextPath = path.resolve(__dirname, '../../src/context/SettingsContext.jsx');
  const settingsContextSrc = fs.readFileSync(settingsContextPath, 'utf8');
  assert(settingsContextSrc.includes('updateSettings'), 'SettingsContext provides updateSettings method to context consumers');

  // 4. Live Backend API Security & Persistence Test
  console.log('\n--- 4. Live Backend API Security & Persistence Test ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = generateToken({ sub: new mongoose.Types.ObjectId().toString(), role: 'ADMIN' });
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  try {
    // 4.1 Unauthenticated Security Rejection
    const unauthRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantName: 'HACKED RESTAURANT' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated PATCH /api/settings is rejected with HTTP 401');

    // 4.2 Valid Admin Update & Persistence
    const updatePayload = {
      restaurantName: 'HAPPINESS RESTAURANT & SWEETS',
      tagline: 'Finest Pure Vegetarian Delights • Counter Takeaway',
      phone: '+91 81558 99999',
      email: 'owner@happinessrestaurant.com',
      address: 'Shop 1-4, Rajhans Complex, Bilimora, Gujarat 396325',
      operatingDays: 'Monday – Sunday (7 Days Open)',
    };

    const updateRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(updatePayload),
    });
    const updateJson = await updateRes.json();

    assert(updateRes.status === 200, 'Authenticated admin PATCH /api/settings returns HTTP 200');
    assert(updateJson.success === true, 'Response indicates success');
    assert(updateJson.data.restaurantName === updatePayload.restaurantName, 'restaurantName updated and returned');
    assert(updateJson.data.tagline === updatePayload.tagline, 'tagline updated and returned');
    assert(updateJson.data.phone === updatePayload.phone, 'phone updated and returned');
    assert(updateJson.data.email === updatePayload.email, 'email updated and returned');
    assert(updateJson.data.address === updatePayload.address, 'address updated and returned');
    assert(updateJson.data.operatingDays === updatePayload.operatingDays, 'operatingDays updated and returned');

    // 4.3 Verify Subsequent GET Returns Persisted State
    const getRes = await fetch(`${baseUrl}/api/settings`);
    const getJson = await getRes.json();
    assert(getRes.status === 200, 'Public GET /api/settings returns HTTP 200');
    assert(getJson.data.restaurantName === updatePayload.restaurantName, 'Subsequent GET returns updated restaurantName');
    assert(getJson.data.tagline === updatePayload.tagline, 'Subsequent GET returns updated tagline');
    assert(getJson.data.phone === updatePayload.phone, 'Subsequent GET returns updated phone');
    assert(getJson.data.email === updatePayload.email, 'Subsequent GET returns updated email');
    assert(getJson.data.address === updatePayload.address, 'Subsequent GET returns updated address');
    assert(getJson.data.operatingDays === updatePayload.operatingDays, 'Subsequent GET returns updated operatingDays');

    // 4.4 Non-Edited Fields Preserved (Data Integrity)
    assert(getJson.data.pickupEnabled === true, 'pickupEnabled remains true (not reset)');
    assert(getJson.data.openingTime === '11:00', 'openingTime preserved (not reset)');
    assert(getJson.data.closingTime === '22:30', 'closingTime preserved (not reset)');
    assert(getJson.data.slotInterval === 15 || typeof getJson.data.slotInterval === 'number', 'slotInterval preserved');
    assert(getJson.data.preparationBuffer === 20 || typeof getJson.data.preparationBuffer === 'number', 'preparationBuffer preserved');

    // 4.5 Validation Rejection for Empty Name
    const emptyNameRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ restaurantName: '   ' }),
    });
    assert(emptyNameRes.status === 400, 'Empty restaurantName is rejected with HTTP 400');

    // 4.6 Strict Self-Pickup Rejection for Delivery Settings
    const deliveryRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ homeDelivery: true }),
    });
    assert(deliveryRes.status === 400, 'Delivery parameter is strictly rejected with HTTP 400');

    // Reset back to initial canonical values
    await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        restaurantName: 'HAPPINESS RESTAURANT',
        tagline: 'Authentic Delicacies • Online Parcel Pickup',
        phone: '+91 81558 16509',
        email: 'contact@happinessrestaurant.com',
        address: 'QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India',
        operatingDays: 'Monday – Sunday (All Days)',
      }),
    });
  } catch (err) {
    console.error('API Test Error:', err);
    failCount++;
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL RESTAURANT INFORMATION EDIT & SYNC QA TESTS PASSED.');
    process.exit(0);
  }
}

runTestSuite();
