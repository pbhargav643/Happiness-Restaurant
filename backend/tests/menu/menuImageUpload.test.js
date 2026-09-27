import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import MenuItem from '../../src/models/MenuItem.js';
import Admin from '../../src/models/Admin.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('ADMIN MENU DIRECT IMAGE UPLOAD TEST SUITE');
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../../frontend/public/images/menu');
const createdFiles = [];

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';

  try {
    await connectDB();

    // Setup Admin and Customer tokens
    const admin = await Admin.findOne({ role: 'ADMIN', isActive: true });
    assert(Boolean(admin), 'Active Admin document retrieved from database');

    const adminToken = generateToken({ sub: admin._id.toString(), role: 'ADMIN' });
    const customerToken = generateToken({ sub: admin._id.toString(), role: 'CUSTOMER' });

    // 1. Security: Unauthenticated request rejected with 401
    console.log('--- 1. Authentication & Role Security ---');
    const unauthRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, { method: 'POST' });
    assert(unauthRes.status === 401, 'Unauthenticated upload rejected with HTTP 401');

    // 2. Security: Customer token rejected with 403
    const custRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custRes.status === 403, 'Customer role blocked from uploading image with HTTP 403');

    // 3. Validation: Missing file rejected with 400
    console.log('\n--- 2. File Format & Validation ---');
    const emptyForm = new FormData();
    const missingRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: emptyForm,
    });
    assert(missingRes.status === 400, 'Rejects missing file with HTTP 400');

    // 4. Validation: Reject SVG
    const svgBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>'], {
      type: 'image/svg+xml',
    });
    const svgForm = new FormData();
    svgForm.append('image', svgBlob, 'malicious.svg');
    const svgRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: svgForm,
    });
    const svgData = await svgRes.json();
    assert(svgRes.status === 400, 'Rejects SVG image with HTTP 400');
    assert(svgData.message.includes('SVG format is not allowed'), 'Explains SVG rejection clearly');

    // 5. Validation: Reject GIF
    const gifBlob = new Blob([Buffer.from('GIF89a')], { type: 'image/gif' });
    const gifForm = new FormData();
    gifForm.append('image', gifBlob, 'animated.gif');
    const gifRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: gifForm,
    });
    assert(gifRes.status === 400, 'Rejects GIF image with HTTP 400');

    // 6. Validation: Reject Executables / Scripts
    const exeBlob = new Blob([Buffer.from('MZ')], { type: 'application/octet-stream' });
    const exeForm = new FormData();
    exeForm.append('image', exeBlob, 'virus.exe');
    const exeRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: exeForm,
    });
    assert(exeRes.status === 400, 'Rejects executable with HTTP 400');

    // 7. Validation: Reject Oversized file (> 5 MB)
    const bigBlob = new Blob([Buffer.alloc(6 * 1024 * 1024, 0xaa)], { type: 'image/jpeg' });
    const bigForm = new FormData();
    bigForm.append('image', bigBlob, 'giant_photo.jpg');
    const bigRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: bigForm,
    });
    const bigData = await bigRes.json();
    assert(bigRes.status === 400, 'Rejects file > 5 MB with HTTP 400');
    assert(bigData.message.includes('5 MB limit'), 'Explains 5 MB limit clearly');

    // 8. Valid Upload: JPEG Image
    console.log('\n--- 3. Successful Valid Uploads ---');
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
    ]);
    const jpgForm = new FormData();
    jpgForm.append('image', new Blob([jpegBuffer], { type: 'image/jpeg' }), 'Shahi Paneer Special.jpg');

    const jpgRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: jpgForm,
    });
    const jpgData = await jpgRes.json();
    assert(jpgRes.status === 200, 'Valid JPEG upload returns HTTP 200');
    assert(jpgData.success === true, 'Upload response contains success: true');
    assert(typeof jpgData.imagePath === 'string', 'Returns imagePath string');
    assert(jpgData.imagePath.startsWith('/images/menu/'), 'imagePath begins with /images/menu/');
    assert(jpgData.imagePath.endsWith('.jpg'), 'imagePath preserves .jpg extension');
    assert(!jpgData.imagePath.includes('..'), 'imagePath contains no directory traversal');

    // Verify physical file written to disk
    const diskPathJpg = path.resolve(UPLOAD_DIR, jpgData.filename);
    assert(fs.existsSync(diskPathJpg), 'Uploaded JPEG file physically exists on disk in frontend/public/images/menu/');
    createdFiles.push(diskPathJpg);

    // 9. Valid Upload: PNG Image
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const pngForm = new FormData();
    pngForm.append('image', new Blob([pngBuffer], { type: 'image/png' }), 'paneer_tikka.png');

    const pngRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: pngForm,
    });
    const pngData = await pngRes.json();
    assert(pngRes.status === 200, 'Valid PNG upload returns HTTP 200');
    assert(pngData.imagePath.endsWith('.png'), 'imagePath preserves .png extension');
    const diskPathPng = path.resolve(UPLOAD_DIR, pngData.filename);
    assert(fs.existsSync(diskPathPng), 'Uploaded PNG file physically exists on disk');
    createdFiles.push(diskPathPng);

    // 10. Valid Upload: WEBP Image
    const webpBuffer = Buffer.from('RIFF....WEBPVP8 ');
    const webpForm = new FormData();
    webpForm.append('image', new Blob([webpBuffer], { type: 'image/webp' }), 'crispy_corn.webp');

    const webpRes = await fetch(`${BASE_URL}/admin/menu/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: webpForm,
    });
    const webpData = await webpRes.json();
    assert(webpRes.status === 200, 'Valid WEBP upload returns HTTP 200');
    assert(webpData.imagePath.endsWith('.webp'), 'imagePath preserves .webp extension');
    const diskPathWebp = path.resolve(UPLOAD_DIR, webpData.filename);
    assert(fs.existsSync(diskPathWebp), 'Uploaded WEBP file physically exists on disk');
    createdFiles.push(diskPathWebp);

    // 11. Database Integration: Create new dish with uploaded image
    console.log('\n--- 4. Full Menu Item Creation & Update Lifecycle ---');
    const testDishPayload = {
      name: `Direct Upload Dish ${Date.now()}`,
      category: 'main-course',
      price: 320,
      image: jpgData.imagePath,
      description: 'Delicious dish with directly uploaded photo.',
      isVeg: true,
      isAvailable: true,
    };

    const createRes = await fetch(`${BASE_URL}/admin/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(testDishPayload),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'POST /api/admin/menu with uploaded image path returns HTTP 201');
    assert(createData.data?.image === jpgData.imagePath, 'Created menu item image field stores uploaded path in MongoDB');

    const createdId = createData.data?._id;

    // 12. Customer Access: GET /api/menu/:itemId returns correct image path
    const customerGetRes = await fetch(`${BASE_URL}/menu/${createdId}`);
    const customerGetData = await customerGetRes.json();
    assert(customerGetRes.status === 200, 'Customer GET /api/menu/:itemId returns HTTP 200');
    assert(customerGetData.data?.image === jpgData.imagePath, 'Customer view receives authoritative uploaded image path');

    // 13. Update Item Image (Simulate Replace Image)
    const updateRes = await fetch(`${BASE_URL}/admin/menu/${createdId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ image: webpData.imagePath }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Admin can update existing dish with replacement uploaded image');
    assert(updateData.data?.image === webpData.imagePath, 'Updated image path saved to MongoDB');

    // 14. Existing Menu Items Invariant Check
    console.log('\n--- 5. Existing Menu Invariant Verification ---');
    const totalCount = await MenuItem.countDocuments();
    assert(totalCount >= 153, `Existing menu items preserved (current count: ${totalCount})`);

    // Clean up created test menu item
    if (createdId) {
      await MenuItem.deleteOne({ _id: createdId });
      console.log('Cleaned up test menu item from DB');
    }

  } catch (err) {
    console.error('Test error:', err);
    failCount++;
  } finally {
    // Clean up all temporary files created during testing
    createdFiles.forEach((file) => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`Cleaned up temp test file: ${path.basename(file)}`);
        }
      } catch (e) {}
    });

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
