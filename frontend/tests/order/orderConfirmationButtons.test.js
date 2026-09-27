import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('ORDER CONFIRMATION BUTTONS ANIMATION & STYLE AUDIT');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

function runTests() {
  const confPath = path.join(frontendSrc, 'pages/customer/OrderConfirmationPage.jsx');
  assert(fs.existsSync(confPath), 'OrderConfirmationPage.jsx exists');
  const code = fs.readFileSync(confPath, 'utf-8');

  const cssPath = path.join(frontendSrc, 'index.css');
  assert(fs.existsSync(cssPath), 'index.css exists');
  const css = fs.readFileSync(cssPath, 'utf-8');

  console.log('--- 1. Button Presence & Text Labels ---');
  assert(code.includes('Continue Shopping'), 'Button 1: Continue Shopping present');
  assert(code.includes('Track Order'), 'Button 2: Track Order present');
  assert(code.includes('My Orders'), 'Button 3: My Orders present');
  assert(code.includes('Print Order'), 'Button 4: Print Order present');

  console.log('\n--- 2. Color Hierarchy ---');
  assert(code.includes('bg-primary hover:bg-[#1E1E24]'), 'Continue Shopping: Black background');
  assert(code.includes('bg-accent hover:bg-accent-hover'), 'Track Order: Gold background');
  assert(code.includes('bg-white hover:bg-[#FAF7F0]'), 'My Orders & Print Order: White/light background');

  console.log('\n--- 3. Multi-Stage Hover & Active Animations ---');
  assert(code.includes('hover:-translate-y-[2px]'), 'Buttons lift approximately 2-3px on hover');
  assert(code.includes('active:scale-[0.97]'), 'Buttons subtly scale down to ~0.97 on active click');
  assert(code.includes('duration-200 ease-out'), 'Smooth 200ms transition curve');

  console.log('\n--- 4. Icon Micro-Animations ---');
  assert(code.includes('group-hover:translate-x-[2px]'), 'Continue Shopping icon moves forward/right on hover');
  assert(code.includes('group-hover:rotate-12'), 'Track Order clock icon rotates subtly on hover');
  assert(code.includes('group-hover:-translate-y-[2px]'), 'My Orders & Print Order icons move upward on hover');

  console.log('\n--- 5. Unique Light Sweep Shine Effect ---');
  assert(code.includes('btn-premium-shine'), 'Buttons use btn-premium-shine class');
  assert(css.includes('.btn-premium-shine::after'), 'CSS pseudo-element ::after defined for shine sweep');
  assert(css.includes('transform: translateX(450%)'), 'Shine sweep moves from left to right on hover');
  assert(css.includes('pointer-events: none'), 'Shine sweep does not interfere with click events');

  console.log('\n--- 6. Accessibility & Reduced Motion ---');
  assert(code.includes('motion-reduce:hover:translate-y-0'), 'Disables transform lift when reduced motion is preferred');
  assert(css.includes('.btn-premium-shine::after') && css.includes('display: none !important'), 'Shine sweep disabled in reduced motion media query');
  assert(code.includes('focus-visible:ring-2'), 'Visible focus ring for keyboard accessibility');

  console.log('\n--- 7. Functional Routes & Handlers Preserved ---');
  assert(code.includes('to="/menu"'), 'Continue Shopping navigates to /menu');
  assert(code.includes('to={`/track-order/${order.orderId}`}'), 'Track Order navigates to /track-order/:orderId');
  assert(code.includes('to="/orders"'), 'My Orders navigates to /orders');
  assert(code.includes('onClick={handlePrint}'), 'Print Order triggers handlePrint');

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
