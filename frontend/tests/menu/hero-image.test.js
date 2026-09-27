import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const heroImagePath = path.resolve(__dirname, '../../public/images/hero/restaurant-hero.jpg');
const heroComponentPath = path.resolve(__dirname, '../../src/components/home/HeroSection.jsx');

console.log('====================================================');
console.log('HOME HERO RESTAURANT FOOD IMAGE QA TEST SUITE');
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

// 1. DISK ASSET INTEGRITY
console.log('--- 1. HERO IMAGE FILE INTEGRITY ON DISK ---');
assert(fs.existsSync(heroImagePath), 'Hero image file exists at public/images/hero/restaurant-hero.jpg');
if (fs.existsSync(heroImagePath)) {
  const stats = fs.statSync(heroImagePath);
  assert(stats.size > 10000, `Hero image is high quality (${stats.size} bytes)`);
}

// 2. HERO COMPONENT AUDIT
console.log('\n--- 2. HERO SECTION COMPONENT AUDIT ---');
const heroSource = fs.readFileSync(heroComponentPath, 'utf8');

assert(
  heroSource.includes('/images/hero/restaurant-hero.jpg'),
  'HeroSection references /images/hero/restaurant-hero.jpg'
);
assert(
  heroSource.includes('w-full') && heroSource.includes('h-full'),
  'Hero image container specifies full width and full height'
);
assert(
  heroSource.includes('object-cover'),
  'Hero image specifies object-cover'
);
assert(
  heroSource.includes('object-center'),
  'Hero image specifies object-center'
);
assert(
  heroSource.includes('overflow-hidden'),
  'Hero image container preserves overflow-hidden'
);
assert(
  heroSource.includes('rounded-xl'),
  'Hero image container preserves rounded-xl corners'
);
assert(
  heroSource.includes('Fresh Indian Delicacies'),
  'HeroSection preserves "Fresh Indian Delicacies" text'
);
assert(
  heroSource.includes('16 Authentic Categories') && heroSource.includes('Pure Veg & Special Curries'),
  'HeroSection preserves "16 Authentic Categories • Pure Veg & Special Curries"'
);
assert(
  heroSource.includes('Kitchen Active'),
  'HeroSection preserves "Kitchen Active" badge'
);
assert(
  heroSource.includes('Estimated Prep Time') && heroSource.includes('15 – 25 Minutes'),
  'HeroSection preserves Estimated Prep Time section'
);
assert(
  heroSource.includes('How Takeaway Works'),
  'HeroSection preserves "How Takeaway Works" flow'
);
assert(
  !heroSource.includes('<svg') || !heroSource.includes('d="M18 11V6a2'),
  'Generic cloche/cup icon SVG is removed from the hero visual card'
);

// 3. LIVE DEV SERVER HTTP 200 TEST
console.log('\n--- 3. LIVE HTTP 200 GET AUDIT ---');
async function findActivePort() {
  const candidatePorts = [3000, 3001, 5173];
  for (const port of candidatePorts) {
    const isLive = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
    });
    if (isLive) return port;
  }
  return null;
}

async function runHttpAudit() {
  const activePort = await findActivePort();
  if (!activePort) {
    console.log('[INFO] Dev server is not running on 3000/3001/5173, skipping live HTTP resolution check');
  } else {
    console.log(`[INFO] Testing hero image HTTP resolution on port ${activePort}...`);
    await new Promise((resolve) => {
      const req = http.get(`http://localhost:${activePort}/images/hero/restaurant-hero.jpg`, (res) => {
        assert(
          res.statusCode === 200,
          `HTTP GET http://localhost:${activePort}/images/hero/restaurant-hero.jpg -> ${res.statusCode}`
        );
        res.resume();
        resolve();
      });
      req.on('error', (err) => {
        console.warn(`[WARN] HTTP request failed: ${err.message}`);
        resolve();
      });
    });
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runHttpAudit();
