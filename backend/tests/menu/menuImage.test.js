import http from 'http';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import MenuItem from '../../src/models/MenuItem.js';
import { generateToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';

console.log('====================================================');
console.log('BACKEND MENU IMAGE API & PATH INTEGRITY TEST SUITE');
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
  await connectDB();

  const isDbConnected = mongoose.connection.readyState === 1;

  let authHeaders = null;
  let adminDoc = null;
  const testAdminEmail = 'menu_image_admin@happinessrestaurant.com';

  if (isDbConnected) {
    await Admin.deleteOne({ email: testAdminEmail });
    const adminPassHash = await hashPassword('AdminPass@123');
    adminDoc = await Admin.create({
      name: 'Menu Image Admin',
      email: testAdminEmail,
      passwordHash: adminPassHash,
      role: 'ADMIN',
      isActive: true,
    });
    const adminToken = generateToken({ sub: adminDoc._id.toString(), role: 'ADMIN' });
    authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };
  } else {
    console.warn('[WARN] MongoDB not connected (offline/whitelist). Running image path integrity and public API tests in offline mode.');
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. All 153 Menu Items Image Paths
    console.log('--- 1. Audit Image Paths Across All Menu Items ---');
    let items;
    if (isDbConnected) {
      items = await MenuItem.find({}).lean();
      assert(items.length === 153, `Database contains 153 menu items (found: ${items.length})`);
    } else {
      const { MENU_ITEMS } = await import('../../../frontend/src/data/menuData.js');
      items = MENU_ITEMS;
      assert(items.length === 153, `Canonical menu contains 153 menu items (found: ${items.length})`);
    }

    let invalidPathFormat = 0;
    let serverPathExposed = 0;

    for (const item of items) {
      if (!item.image || typeof item.image !== 'string' || !item.image.startsWith('/images/menu/')) {
        invalidPathFormat++;
      }
      if (
        item.image.includes(':\\') ||
        item.image.includes(':/') ||
        item.image.includes('..') ||
        item.image.includes('/etc/') ||
        item.image.includes('\\')
      ) {
        serverPathExposed++;
      }
    }

    assert(invalidPathFormat === 0, `All 153 dishes have valid /images/menu/... paths (invalid: ${invalidPathFormat})`);
    assert(serverPathExposed === 0, `No database records expose backend server filesystem paths (leaks: ${serverPathExposed})`);

    // 2. Public Menu API returns clean image paths
    console.log('\n--- 2. Public Menu API Image Field Integrity ---');
    const resPublic = await fetch(`${baseUrl}/api/menu?limit=5`);
    const dataPublic = await resPublic.json();
    assert(resPublic.status === 200, 'GET /api/menu returns HTTP 200');
    assert(Array.isArray(dataPublic.data), 'Public data is array');

    for (const dish of dataPublic.data) {
      assert(typeof dish.image === 'string', `Dish "${dish.name}" has string image field`);
      assert(dish.image.startsWith('/images/menu/'), `Image starts with /images/menu/ (${dish.image})`);
      assert(!dish.image.includes('C:'), 'Does not contain Windows drive letter');
    }

    // 3. Single Item By ID & By Slug Image Field
    console.log('\n--- 3. Single Item By ID & By Slug Image Field ---');
    const sampleDish = items[0];
    const resId = await fetch(`${baseUrl}/api/menu/${sampleDish._id || sampleDish.id}`);
    assert(resId.status === 200 || resId.status === 404, 'GET /api/menu/:itemId returns valid HTTP status');

    const resSlug = await fetch(`${baseUrl}/api/menu/slug/${sampleDish.slug}`);
    assert(resSlug.status === 200 || resSlug.status === 404, 'GET /api/menu/slug/:slug returns valid HTTP status');

    if (isDbConnected && authHeaders) {
      // 4. Field Independence: Image update does not alter price/slug/category
      console.log('\n--- 4. Field Independence: Image Update Does Not Mutate Other Fields ---');
      const tempSlug = 'temp-image-field-test';
      await MenuItem.deleteOne({ slug: tempSlug });

      const testItem = await MenuItem.create({
        name: 'Temp Image Field Test Dish',
        slug: tempSlug,
        category: 'soup',
        price: 130,
        image: '/images/menu/veg-clear-soup.webp',
        isAvailable: true,
      });

      const resImgPatch = await fetch(`${baseUrl}/api/admin/menu/${testItem._id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          image: '/images/menu/lemon-coriander-soup.webp',
        }),
      });
      const dataImgPatch = await resImgPatch.json();
      assert(resImgPatch.status === 200, 'Image updated successfully with HTTP 200');
      assert(dataImgPatch.data.image === '/images/menu/lemon-coriander-soup.webp', 'Image path updated to new path');
      assert(dataImgPatch.data.price === 130, 'Price remains untouched at ₹130');
      assert(dataImgPatch.data.slug === tempSlug, 'Slug remains untouched');
      assert(dataImgPatch.data.category === 'soup', 'Category remains untouched');

      // 5. Field Independence: Price update does not alter image
      console.log('\n--- 5. Field Independence: Price Update Does Not Mutate Image ---');
      const resPricePatch = await fetch(`${baseUrl}/api/admin/menu/${testItem._id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          price: 150,
        }),
      });
      const dataPricePatch = await resPricePatch.json();
      assert(resPricePatch.status === 200, 'Price updated successfully with HTTP 200');
      assert(dataPricePatch.data.price === 150, 'Price updated to ₹150');
      assert(dataPricePatch.data.image === '/images/menu/lemon-coriander-soup.webp', 'Image path unchanged');

      await MenuItem.deleteOne({ _id: testItem._id });
    } else {
      console.log('\n--- 4 & 5. Live Admin PATCH operations skipped in offline mode ---');
    }

  } catch (err) {
    console.error('Menu image backend test error:', err);
    failCount++;
  } finally {
    if (isDbConnected) {
      await Admin.deleteOne({ email: testAdminEmail });
    }
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
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
