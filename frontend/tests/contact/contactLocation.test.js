/**
 * Happiness Restaurant - Contact Page Location Verification Test Suite
 *
 * Verifies that the temporary location placeholder has been completely replaced
 * with the verified physical location of HAPPINESS RESTAURANT:
 * - Address: QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India
 * - Landmark: Rajhans Complex / Opposite L.M.P. School, College Road / Chikhli Road, Bilimora
 * - Google Maps integration (iframe preview, GET DIRECTIONS button, Open in Google Maps button)
 * - Self-pickup exclusivity (NO home delivery)
 * - Zero fake locations, zero Google Maps API keys exposed
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
console.log('CONTACT PAGE VERIFIED LOCATION & MAPS TEST SUITE');
console.log('====================================================');

const contactPath = path.join(frontendDir, 'src/pages/customer/ContactPage.jsx');
const configPath = path.join(frontendDir, 'src/constants/restaurantConfig.js');

assert(fs.existsSync(contactPath), 'ContactPage.jsx exists');
assert(fs.existsSync(configPath), 'restaurantConfig.js exists');

const contactContent = fs.readFileSync(contactPath, 'utf-8');
const configContent = fs.readFileSync(configPath, 'utf-8');

// 1. TEMPORARY TEXT REMOVAL
console.log('\n[1] Temporary Placeholder Purge');
assert(
  !contactContent.includes('Restaurant location will be available soon'),
  'Old placeholder "Restaurant location will be available soon" is completely removed'
);
assert(
  !contactContent.includes('Temporary Route Placeholder'),
  'No "Temporary Route Placeholder" exists in ContactPage.jsx'
);

// 2. VERIFIED RESTAURANT ADDRESS
console.log('\n[2] Verified Restaurant Address');
assert(
  contactContent.includes('QX8M+J67, Navjivan Colony,'),
  'Address Line 1: "QX8M+J67, Navjivan Colony," present'
);
assert(
  contactContent.includes('Bilimora, Gujarat 396325, India'),
  'Address Line 2: "Bilimora, Gujarat 396325, India" present'
);
assert(
  contactContent.includes('Rajhans Complex / Opposite L.M.P. School'),
  'Landmark reference "Rajhans Complex / Opposite L.M.P. School" present'
);
assert(
  configContent.includes('QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325, India'),
  'Central restaurantConfig.js contains verified address'
);

// 3. GOOGLE MAPS INTEGRATION & DIRECTIONS BUTTON
console.log('\n[3] Google Maps & Navigation Buttons');
assert(contactContent.includes('GET DIRECTIONS'), 'Button text "GET DIRECTIONS" present');
assert(
  contactContent.includes('https://www.google.com/maps/dir/?api=1&destination='),
  'GET DIRECTIONS targets Google Maps Directions API'
);
assert(
  contactContent.includes('QX8M%2BJ67'),
  'Directions destination contains verified Plus Code QX8M+J67'
);
assert(contactContent.includes('Open in Google Maps'), 'Button text "Open in Google Maps" present');
assert(
  contactContent.includes('https://www.google.com/maps/search/?api=1&query='),
  'Open in Google Maps targets verified query location'
);
assert(
  contactContent.includes('iframe') && contactContent.includes('maps.google.com/maps?q='),
  'Includes responsive map preview iframe'
);
assert(
  !contactContent.includes('key=AIza') && !contactContent.includes('REACT_APP_GOOGLE_MAPS'),
  'No Google Maps API key required or exposed'
);

// 4. SELF-PICKUP EXCLUSIVITY
console.log('\n[4] Self-Pickup Exclusivity');
assert(contactContent.includes('Parcel Pickup Only'), 'Mentions Parcel Pickup Only');
assert(
  contactContent.includes('In-store Counter Collection') ||
    contactContent.includes('In-Store Counter Collection'),
  'Mentions In-store Counter Collection'
);
assert(
  !contactContent.toLowerCase().includes('home delivery'),
  'Zero mentions of home delivery in ContactPage.jsx'
);

// 5. RESPONSIVE DESIGN INTEGRITY
console.log('\n[5] Responsive & Layout Integrity');
assert(contactContent.includes('grid-cols-1 lg:grid-cols-12'), 'Responsive 12-column grid container');
assert(contactContent.includes('aspect-[16/9]'), 'Responsive map aspect ratio wrapper');
assert(contactContent.includes('overflow-hidden'), 'Map container has overflow-hidden to prevent horizontal scroll');

console.log('\n====================================================');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL CONTACT LOCATION TESTS PASSED!\n');
}
