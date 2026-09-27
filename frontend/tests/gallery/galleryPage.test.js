/**
 * Gallery Page Comprehensive Verification Test Suite
 *
 * Tests:
 * 1. Component existence & structure
 * 2. Purge of all temporary placeholder content
 * 3. 100% verified local menu image assets (zero broken/external/fake stock URLs)
 * 4. Responsive grid architecture (1 to 4 columns)
 * 5. Consistent aspect ratio & object-fit styling
 * 6. Category filters coverage (Signature, Paneer, Starters, Pizza, Chinese, Rice, Breads, Beverages)
 * 7. Interactive modal preview accessibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('GALLERY PAGE COMPREHENSIVE QA TEST SUITE');
console.log('====================================================');

const galleryPath = path.join(frontendDir, 'src/pages/customer/GalleryPage.jsx');

// 1. FILE EXISTENCE
console.log('\n[1] Component Existence');
assert(fs.existsSync(galleryPath), 'GalleryPage.jsx exists');
const galleryContent = fs.readFileSync(galleryPath, 'utf-8');

// 2. PLACEHOLDER PURGE
console.log('\n[2] Placeholder Removal');
assert(
  !galleryContent.includes('Temporary Route Placeholder'),
  'No "Temporary Route Placeholder" in GalleryPage.jsx'
);
assert(
  !galleryContent.includes('will be implemented in Phase 10'),
  'No "will be implemented in Phase 10" in GalleryPage.jsx'
);
assert(!galleryContent.includes('Phase 10'), 'No "Phase 10" in GalleryPage.jsx');

// 3. IMAGE INTEGRITY & VALIDITY
console.log('\n[3] Image Asset Verification');
const imageMatches = galleryContent.match(/\/images\/menu\/[a-zA-Z0-9_\-\.]+\.(jpg|webp|png)/g) || [];
assert(imageMatches.length >= 24, `Found ${imageMatches.length} local menu image references (min 24)`);

let allImagesExist = true;
const missingImages = [];
for (const relImg of imageMatches) {
  const fullImgPath = path.join(frontendDir, 'public', relImg);
  if (!fs.existsSync(fullImgPath)) {
    allImagesExist = false;
    missingImages.push(relImg);
  }
}
assert(allImagesExist, `All referenced images exist on disk (Missing: ${missingImages.join(', ') || 'None'})`);
assert(!/<img[^>]+src=["']https?:\/\//i.test(galleryContent), 'Zero external image URLs');
assert(!galleryContent.includes('images.unsplash.com'), 'Zero unverified stock photo links');

// 4. CATEGORY TAXONOMY
console.log('\n[4] Category Filter Taxonomy');
const expectedCategories = [
  'Signature Dishes',
  'Paneer Specialties',
  'Starters',
  'Pizza',
  'Chinese',
  'Rice & Biryani',
  'Indian Breads',
  'Beverages',
];
for (const cat of expectedCategories) {
  assert(galleryContent.includes(cat), `Category filter "${cat}" present`);
}

// 5. RESPONSIVE & LAYOUT INTEGRITY
console.log('\n[5] Responsive Grid & Image Cards');
assert(
  galleryContent.includes('grid-cols-1') &&
    galleryContent.includes('sm:grid-cols-2') &&
    galleryContent.includes('lg:grid-cols-3') &&
    galleryContent.includes('xl:grid-cols-4'),
  'Responsive 1-to-4 column grid system implemented'
);
assert(galleryContent.includes('aspect-[4/3]'), 'Consistent 4:3 card aspect ratio');
assert(galleryContent.includes('object-cover'), 'object-cover styling to prevent image stretching');
assert(galleryContent.includes('rounded-2xl'), 'Consistent rounded corners design');
assert(galleryContent.includes('loading="lazy"'), 'Lazy loading enabled for off-screen images');

// 6. ACCESSIBILITY & PREVIEW MODAL
console.log('\n[6] Accessibility & Modal Dialog');
assert(galleryContent.includes('role="dialog"'), 'Preview modal has role="dialog"');
assert(galleryContent.includes('aria-modal="true"'), 'Preview modal has aria-modal="true"');
assert(galleryContent.includes('aria-labelledby'), 'Preview modal has aria-labelledby');
assert(galleryContent.includes('alt={item.title}'), 'Image cards have descriptive alt text');

console.log('\n====================================================');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL GALLERY PAGE TESTS PASSED!\n');
}
