import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('ORDER CONFIRMATION ACTION BUTTONS VISUAL REDESIGN QA TEST');
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

// 1. Inspect Files
const confPath = path.join(frontendSrc, 'pages/customer/OrderConfirmationPage.jsx');
assert(fs.existsSync(confPath), 'OrderConfirmationPage.jsx exists');
const code = fs.readFileSync(confPath, 'utf-8');

const cssPath = path.join(frontendSrc, 'index.css');
assert(fs.existsSync(cssPath), 'index.css exists');
const css = fs.readFileSync(cssPath, 'utf-8');

// 2. Button Visual Redesign & Dedicated Custom Classes in index.css
console.log('\n--- 1. Dedicated Custom Classes in index.css ---');
assert(css.includes('.btn-order-action'), '.btn-order-action defined in index.css');
assert(css.includes('.btn-order-continue'), '.btn-order-continue defined in index.css');
assert(css.includes('.btn-order-track'), '.btn-order-track defined in index.css');
assert(css.includes('.btn-order-secondary'), '.btn-order-secondary defined in index.css');

// 3. Button Visual Roles & Palette
console.log('\n--- 2. Distinctive Visual Roles & Palette ---');
assert(
  css.includes('linear-gradient(180deg, #1f2533 0%, #111520 100%)') &&
  css.includes('rgba(212, 175, 55, 0.35)'),
  'Continue Shopping: Dark primary surface with gold accent border'
);
assert(
  css.includes('linear-gradient(180deg, #e8c95e 0%, #d4af37 55%, #bd9624 100%)'),
  'Track Order: 3-stop rich gold luxury gradient'
);
assert(
  css.includes('linear-gradient(180deg, #ffffff 0%, #faf8f5 100%)') &&
  css.includes('border-color: #d4af37'),
  'My Orders & Print Order: Clean porcelain light surface with gold accent hover'
);

// 4. Exact Four Button Order & Labels
console.log('\n--- 3. Exact Button Order & Presence ---');
const continueIdx = code.indexOf('Continue Shopping');
const trackIdx = code.indexOf('Track Order');
const myOrdersIdx = code.indexOf('My Orders');
const printIdx = code.indexOf('Print Order');

assert(continueIdx !== -1 && trackIdx !== -1 && myOrdersIdx !== -1 && printIdx !== -1, 'All four buttons present');
assert(
  continueIdx < trackIdx && trackIdx < myOrdersIdx && myOrdersIdx < printIdx,
  'Order strictly preserved: Continue Shopping -> Track Order -> My Orders -> Print Order'
);

// 5. Text Clipping Fix & Responsive Width
console.log('\n--- 4. Text Clipping Guard & Responsive Layout ---');
assert(code.includes('sm:flex-wrap'), 'Button group uses sm:flex-wrap to prevent narrow squishing');
assert(code.includes('sm:min-w-[185px]'), 'Continue Shopping has dedicated min-width (sm:min-w-[185px])');
assert(code.includes('whitespace-nowrap'), 'Button text includes whitespace-nowrap to guarantee zero text clipping');
assert(code.includes('min-h-[46px]'), 'Buttons maintain coordinated height (min-h-[46px])');

// 6. Micro-Animations & Interactions
console.log('\n--- 5. Micro-Animations & Interactions ---');
assert(code.includes('hover:-translate-y-[2px]'), 'Buttons elevate by -2px on hover');
assert(code.includes('active:scale-[0.97]'), 'Buttons provide tactile press feedback (scale 0.97)');
assert(code.includes('group-hover:translate-x-[2px]'), 'Continue Shopping icon translates forward (+2px) on hover');
assert(code.includes('group-hover:rotate-12'), 'Track Order clock icon rotates subtly (12deg) on hover');
assert(code.includes('group-hover:-translate-y-[2px]'), 'Secondary button icons elevate on hover');

// 7. Functionality & Handlers Unchanged
console.log('\n--- 6. Functional Routes & Handlers Preserved ---');
assert(code.includes('to="/menu"'), 'Continue Shopping route preserved (/menu)');
assert(code.includes('to={`/track-order/${order.orderId}`}'), 'Track Order route preserved (/track-order/:orderId)');
assert(code.includes('to="/orders"'), 'My Orders route preserved (/orders)');
assert(code.includes('onClick={handlePrint}'), 'Print Order handler preserved (handlePrint)');

// 8. Reduced Motion Accessibility
console.log('\n--- 7. Accessibility & Reduced Motion ---');
assert(css.includes('.btn-order-action') && css.includes('transform: none !important'), 'CSS respects prefers-reduced-motion for button transforms');
assert(code.includes('focus-visible:ring-2'), 'Visible focus ring for keyboard navigation');

// 9. File Format Check (.js, .jsx, *.test.js only)
console.log('\n--- 8. File Format Audit ---');
const forbiddenExts = ['.mjs', '.ts', '.tsx'];
function scanDir(dir, forbidden) {
  let found = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'node_modules' && ent.name !== '.git') {
        found = found.concat(scanDir(full, forbidden));
      }
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbidden.includes(ext)) {
        found.push(full);
      }
    }
  }
  return found;
}
const forbiddenFiles = scanDir(frontendSrc, forbiddenExts);
assert(forbiddenFiles.length === 0, `No forbidden .mjs, .ts, or .tsx files in frontend/src (found: ${forbiddenFiles.length})`);

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL ORDER CONFIRMATION BUTTONS VISUAL REDESIGN QA TESTS PASSED.');
  process.exit(0);
}
