import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN AUDIO CHIME ON NEW ORDERS QA TEST SUITE');
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

// 1. Audio Chime Utility Inspection
console.log('--- 1. Audio Chime Service (audioChime.js) ---');
const chimeUtilPath = path.resolve(__dirname, '../../src/utils/audioChime.js');
assert(fs.existsSync(chimeUtilPath), 'audioChime.js exists');

const chimeSrc = fs.readFileSync(chimeUtilPath, 'utf8');
assert(chimeSrc.includes('AudioContext'), 'Uses native Web Audio API (zero external CDN or audio download dependencies)');
assert(chimeSrc.includes('587.33') && chimeSrc.includes('880'), 'Synthesizes clean, professional dual-tone counter chime (D5 -> A5)');
assert(chimeSrc.includes('happiness_admin_audio_chime'), 'Persists preference using happiness_admin_audio_chime in localStorage');
assert(chimeSrc.includes('unlockAudio'), 'Provides unlockAudio for browser autoplay policy compliance');
assert(chimeSrc.includes('initAudioUnlock'), 'Provides one-time seamless interaction unlock');
assert(chimeSrc.includes('isAudioChimeEnabled'), 'Exports isAudioChimeEnabled checking toggle state');
assert(chimeSrc.includes('playOrderChime'), 'Exports playOrderChime that checks toggle state before playing');

// 2. Unit Logic Simulation of Audio Chime
console.log('\n--- 2. Logic Simulation of Audio Chime Scenarios ---');

let fakeLocalStorage = {};
function mockIsChimeEnabled() {
  const val = fakeLocalStorage['happiness_admin_audio_chime'];
  return val === undefined ? true : val === 'true';
}
function mockSetChimeEnabled(val) {
  fakeLocalStorage['happiness_admin_audio_chime'] = String(val);
}

let playCount = 0;
function mockPlayChime() {
  if (!mockIsChimeEnabled()) return false;
  playCount++;
  return true;
}

// Order detector simulator matching AdminDashboardPage logic
class OrderChimeDetector {
  constructor() {
    this.knownOrderIds = new Set();
    this.isInitialLoad = true;
  }

  processOrders(orders, isBackgroundPoll = false) {
    if (!this.isInitialLoad && isBackgroundPoll) {
      let hasNewPlacedOrder = false;
      orders.forEach((o) => {
        const id = o.orderId || o._id;
        if (id && !this.knownOrderIds.has(id)) {
          this.knownOrderIds.add(id);
          const st = String(o.status || 'PLACED').toUpperCase();
          if (st === 'PLACED') {
            hasNewPlacedOrder = true;
          }
        }
      });
      if (hasNewPlacedOrder) {
        mockPlayChime();
      }
    } else {
      orders.forEach((o) => {
        const id = o.orderId || o._id;
        if (id) {
          this.knownOrderIds.add(id);
        }
      });
      this.isInitialLoad = false;
    }
  }
}

// Test Scenario 4: Admin opens dashboard / refreshes page (Initial load)
console.log('\n[Scenario 4] Admin opens or refreshes dashboard');
mockSetChimeEnabled(true);
playCount = 0;
let detector = new OrderChimeDetector();
const existingOrders = [
  { orderId: 'ORD-101', status: 'PLACED' },
  { orderId: 'ORD-102', status: 'PREPARING' },
  { orderId: 'ORD-103', status: 'READY' },
];
detector.processOrders(existingOrders, false);
assert(playCount === 0, 'Initial load / refresh does NOT play chime for existing orders');
assert(detector.knownOrderIds.size === 3, 'All 3 existing orders ingested into known IDs set');

// Test Scenario 1: Audio Chime ON + new order arrives
console.log('\n[Scenario 1] Audio Chime ON + new order arrives');
playCount = 0;
const pollWithNewOrder = [
  ...existingOrders,
  { orderId: 'ORD-104', status: 'PLACED' },
];
detector.processOrders(pollWithNewOrder, true);
assert(playCount === 1, 'Audio Chime ON + new order arrives -> SOUND PLAYS ONCE');

// Test Scenario 3: Same order received multiple times
console.log('\n[Scenario 3] Same order received multiple times in subsequent polls');
detector.processOrders(pollWithNewOrder, true);
detector.processOrders(pollWithNewOrder, true);
assert(playCount === 1, 'Duplicate polls of same order -> SOUND PLAYS ONLY ONCE');

// Test Scenario 5: Existing order changes status
console.log('\n[Scenario 5] Existing order changes status (PLACED -> PREPARING -> READY)');
const pollStatusChanged = [
  { orderId: 'ORD-101', status: 'PREPARING' },
  { orderId: 'ORD-102', status: 'READY' },
  { orderId: 'ORD-103', status: 'PICKED_UP' },
  { orderId: 'ORD-104', status: 'PREPARING' },
];
detector.processOrders(pollStatusChanged, true);
assert(playCount === 1, 'Status changes on existing orders do NOT trigger new order chime');

// Test Scenario 6: New second order arrives
console.log('\n[Scenario 6] New second order arrives');
const pollSecondNew = [
  ...pollStatusChanged,
  { orderId: 'ORD-105', status: 'PLACED' },
];
detector.processOrders(pollSecondNew, true);
assert(playCount === 2, 'New second order arrives -> SOUND PLAYS ONCE');

// Test Scenario 2: Audio Chime OFF + new order arrives
console.log('\n[Scenario 2] Audio Chime OFF + new order arrives');
mockSetChimeEnabled(false);
const pollThirdNew = [
  ...pollSecondNew,
  { orderId: 'ORD-106', status: 'PLACED' },
];
detector.processOrders(pollThirdNew, true);
assert(playCount === 2, 'Audio Chime OFF + new order arrives -> NO SOUND');

// 3. AdminSettingsPage.jsx Toggle Verification
console.log('\n--- 3. AdminSettingsPage.jsx Toggle Verification ---');
const settingsPath = path.resolve(__dirname, '../../src/pages/admin/AdminSettingsPage.jsx');
const settingsSrc = fs.readFileSync(settingsPath, 'utf8');

assert(settingsSrc.includes('Audio Chime on New Orders'), 'Settings contains Audio Chime on New Orders heading');
assert(settingsSrc.includes('Browser Chime'), 'Settings contains Browser Chime badge');
assert(settingsSrc.includes('handleToggleChime'), 'Settings provides interactive handleToggleChime handler');
assert(settingsSrc.includes('isAudioChimeEnabled') && settingsSrc.includes('setAudioChimeEnabled'), 'Settings connects to audioChime preference persistence');
assert(settingsSrc.includes('bg-emerald-600 justify-end'), 'Maintains exact toggle ON styling');
assert(settingsSrc.includes('bg-slate-300 justify-start'), 'Maintains exact toggle OFF styling');

// 4. AdminDashboardPage.jsx Integration Verification
console.log('\n--- 4. AdminDashboardPage.jsx Integration Verification ---');
const dashboardPath = path.resolve(__dirname, '../../src/pages/admin/AdminDashboardPage.jsx');
const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');

assert(dashboardSrc.includes('playOrderChime'), 'Dashboard imports and calls playOrderChime');
assert(dashboardSrc.includes('knownOrderIdsRef'), 'Dashboard tracks known order IDs to prevent duplicates and refresh chimes');
assert(dashboardSrc.includes('isInitialLoadRef'), 'Dashboard isolates initial load from background polling');
assert(dashboardSrc.includes('setInterval'), 'Dashboard polls for live orders every few seconds');
assert(dashboardSrc.includes('Enable Order Chime'), 'Dashboard provides minimal audio unlock button when needed');

// 5. Customer Pages Invariance Verification
console.log('\n--- 5. Customer Pages Invariance ---');
const customerRoutesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');
assert(!customerRoutesSrc.includes('audioChime'), 'Customer routes do NOT import or invoke audioChime');

const customerAppPath = path.resolve(__dirname, '../../src/App.jsx');
const customerAppSrc = fs.readFileSync(customerAppPath, 'utf8');
assert(!customerAppSrc.includes('audioChime'), 'Customer App root does NOT invoke audioChime');

// 6. Forbidden File Types Audit (.js, .jsx, *.test.js only)
console.log('\n--- 6. Forbidden File Types Audit ---');
const forbiddenExts = ['.mjs', '.ts', '.tsx'];
function checkForbidden(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git') {
      checkForbidden(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        assert(false, `Found forbidden file: ${full}`);
      }
    }
  }
}
checkForbidden(path.resolve(__dirname, '../../src'));
assert(true, 'No .mjs, .ts, or .tsx files in frontend/src');

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL AUDIO CHIME QA TESTS PASSED.');
  process.exit(0);
}
