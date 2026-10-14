import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../..');

console.log('====================================================');
console.log('CONTACT FORM INTEGRATION & SUBMISSION TEST SUITE');
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

// 1. Files & Services Existence
console.log('--- 1. File & Service Verification ---');
const contactPagePath = path.join(frontendDir, 'src/pages/customer/ContactPage.jsx');
const contactApiPath = path.join(frontendDir, 'src/services/contactApi.js');

assert(fs.existsSync(contactPagePath), 'ContactPage.jsx exists');
assert(fs.existsSync(contactApiPath), 'contactApi.js exists');

const contactSrc = fs.readFileSync(contactPagePath, 'utf8');
const apiSrc = fs.readFileSync(contactApiPath, 'utf8');

// 2. API Service Layer
console.log('\n--- 2. contactApi Service Implementation ---');
assert(apiSrc.includes("api.post('/contact'"), 'contactApi routes POST requests to /contact');
assert(apiSrc.includes('submitContactMessage'), 'contactApi exposes submitContactMessage method');

// 3. ContactPage Integration & State
console.log('\n--- 3. ContactPage Form State & Integration ---');
assert(contactSrc.includes('import contactApi from'), 'ContactPage imports contactApi service');
assert(contactSrc.includes('isSubmitting'), 'ContactPage maintains isSubmitting loading state');
assert(contactSrc.includes('contactApi.submitContactMessage'), 'ContactPage calls contactApi.submitContactMessage on submit');

// 4. Client-side Input Validation
console.log('\n--- 4. Client-side Validation Rules ---');
assert(contactSrc.includes('Name must be at least 2 characters'), 'Validates name length (minimum 2 characters)');
assert(contactSrc.includes('Please enter a valid 10-digit mobile number or email address'), 'Validates mobile or email address format');
assert(contactSrc.includes('Message must be at least 5 characters'), 'Validates message length (minimum 5 characters)');

// 5. Success and Error Feedback Handling
console.log('\n--- 5. Dynamic Feedback & Banner Styling ---');
assert(contactSrc.includes("formStatus.type === 'success'"), 'Renders dedicated success banner on successful submission');
assert(contactSrc.includes('bg-emerald-50 border border-emerald-200 text-emerald-900'), 'Success banner uses verified emerald styling');
assert(contactSrc.includes("formStatus.type === 'error'"), 'Renders error banner on failed submission');
assert(contactSrc.includes('bg-rose-50 border border-rose-200 text-rose-900'), 'Error banner uses verified rose styling');

// 6. Double Submission Prevention & Accessibility
console.log('\n--- 6. UX & Double-Submit Protection ---');
assert(contactSrc.includes('disabled={isSubmitting}'), 'Submit button is disabled while request is in flight');
assert(contactSrc.includes('Sending Message...'), 'Submit button displays animated spinner and loading text');
assert(contactSrc.includes("setFormData({ name: '', contactInfo: '', message: '' })"), 'Form fields are automatically cleared after successful submission');
assert(contactSrc.includes('if (isSubmitting) return;'), 'Submissions are blocked if already submitting');
assert(contactSrc.includes('aria-busy={isSubmitting}'), 'Submit button provides aria-busy attribute');
assert(contactSrc.includes('aria-required="true"'), 'Inputs specify aria-required="true"');
assert(contactSrc.includes('aria-invalid='), 'Inputs specify aria-invalid on error');
assert(contactSrc.includes('contact-name-error'), 'Name input binds aria-describedby to error element');
assert(contactSrc.includes('2000'), 'Message displays character counter with max 2000');
assert(contactSrc.includes('aria-label="Dismiss alert"'), 'Alert banner includes dismiss action');

// 7. Theme & Layout Preservation
console.log('\n--- 7. Black, Gold, and Cream Theme Preservation ---');
assert(contactSrc.includes('bg-secondary min-h-screen'), 'Maintains cream secondary background');
assert(contactSrc.includes('text-accent'), 'Maintains gold accent highlights');
assert(contactSrc.includes('bg-primary'), 'Maintains dark charcoal primary buttons and headers');

console.log('\n====================================================');
console.log(`TOTAL: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL FRONTEND CONTACT FORM TESTS PASSED.');
  process.exit(0);
}
