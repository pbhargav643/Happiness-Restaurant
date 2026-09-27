import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('CUSTOMER REVIEWS & RATINGS BACKEND API QA TEST SUITE');
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
  // 1. Model Inspection
  console.log('--- 1. Review Model Inspection ---');
  const modelPath = path.join(backendSrc, 'models/Review.js');
  assert(fs.existsSync(modelPath), 'Review.js model exists');
  const modelSrc = fs.readFileSync(modelPath, 'utf8');

  assert(modelSrc.includes('customerId') && modelSrc.includes('unique: true'), 'Review enforces unique customerId (1 active review per customer)');
  assert(modelSrc.includes('customerName') && modelSrc.includes('required: [true'), 'Review requires customerName');
  assert(modelSrc.includes('rating') && modelSrc.includes('min: [1') && modelSrc.includes('max: [5'), 'Rating field validated between 1 and 5 stars');
  assert(modelSrc.includes('comment') && modelSrc.includes('required: [true'), 'Review text/comment field required');
  assert(modelSrc.includes('timestamps: true'), 'Schema includes createdAt & updatedAt timestamps');

  // 2. Service Logic & Invariance
  console.log('\n--- 2. Review Service Verification ---');
  const servicePath = path.join(backendSrc, 'services/review.service.js');
  assert(fs.existsSync(servicePath), 'review.service.js exists');
  const serviceSrc = fs.readFileSync(servicePath, 'utf8');

  assert(serviceSrc.includes('getPublicReviews'), 'Exposes getPublicReviews');
  assert(serviceSrc.includes('createReview'), 'Exposes createReview');
  assert(serviceSrc.includes('getAdminReviews'), 'Exposes getAdminReviews');
  assert(serviceSrc.includes('deleteReview'), 'Exposes deleteReview');
  assert(serviceSrc.includes('Review.findByIdAndDelete'), 'Admin delete ONLY removes the specific review document');
  assert(serviceSrc.includes('You have already submitted a review.'), 'Duplicate review rejection message present');

  // 3. Controller Inspection
  console.log('\n--- 3. Review Controller Verification ---');
  const controllerPath = path.join(backendSrc, 'controllers/review.controller.js');
  assert(fs.existsSync(controllerPath), 'review.controller.js exists');
  const controllerSrc = fs.readFileSync(controllerPath, 'utf8');

  assert(controllerSrc.includes('req.customer?.id') && controllerSrc.includes('req.customer?.name'), 'Uses authenticated customer identity from req.customer');
  assert(controllerSrc.includes('Rating is required'), 'Validates rating presence and range');
  assert(controllerSrc.includes('Review text is required'), 'Validates non-empty review comment');
  assert(controllerSrc.includes('Please sign in to submit a review.'), 'Guards against unauthenticated customer submission');

  // 4. Routes Inspection
  console.log('\n--- 4. Review Routes & Security Verification ---');
  const routesPath = path.join(backendSrc, 'routes/review.routes.js');
  assert(fs.existsSync(routesPath), 'review.routes.js exists');
  const routesSrc = fs.readFileSync(routesPath, 'utf8');

  assert(routesSrc.includes('router.get(\'/\', reviewController.getReviews)'), 'Public GET /api/reviews endpoint mounted');
  assert(routesSrc.includes('router.post(\'/\', authenticateCustomer, reviewController.createReview)'), 'POST /api/reviews strictly protected by authenticateCustomer');

  const adminRoutesPath = path.join(backendSrc, 'routes/admin.routes.js');
  const adminRoutesSrc = fs.readFileSync(adminRoutesPath, 'utf8');
  assert(adminRoutesSrc.includes('router.use(authenticateAdmin)'), 'Admin routes protected by authenticateAdmin');
  assert(adminRoutesSrc.includes('router.get(\'/reviews\', reviewController.getAdminReviews)'), 'Admin GET /api/admin/reviews endpoint mounted');
  assert(adminRoutesSrc.includes('router.delete(\'/reviews/:reviewId\', reviewController.deleteReview)'), 'Admin DELETE /api/admin/reviews/:reviewId endpoint mounted');

  // 5. App Route Mount Verification
  console.log('\n--- 5. App.js Route Mount Verification ---');
  const appPath = path.join(backendSrc, 'app.js');
  const appSrc = fs.readFileSync(appPath, 'utf8');
  assert(appSrc.includes('import reviewRoutes from \'./routes/review.routes.js\''), 'app.js imports reviewRoutes');
  assert(appSrc.includes('app.use(\'/api/reviews\', reviewRoutes)'), 'app.js mounts /api/reviews');

  // 6. Non-Pollution / Isolation Audit
  console.log('\n--- 6. Isolation & Invariance Audit ---');
  const orderModelPath = path.join(backendSrc, 'models/Order.js');
  const orderModelSrc = fs.readFileSync(orderModelPath, 'utf8');
  assert(!orderModelSrc.includes('reviewId'), 'Order model not modified for reviews (strictly isolated)');

  const settingsModelPath = path.join(backendSrc, 'models/RestaurantSettings.js');
  const settingsModelSrc = fs.readFileSync(settingsModelPath, 'utf8');
  assert(!settingsModelSrc.includes('review'), 'RestaurantSettings model not modified for reviews');

  // 7. Dynamic Service Execution Test
  console.log('\n--- 7. Dynamic Review Service Execution ---');
  const { reviewService } = await import('../../src/services/review.service.js');
  reviewService._clearMemory();

  // Test creation
  const rev1 = await reviewService.createReview({
    customerId: '507f1f77bcf86cd799439011',
    customerName: 'Aarav Sharma',
    rating: 5,
    comment: 'Amazing parcel service! Food was piping hot and ready right on time.',
  });
  assert(rev1 && rev1.rating === 5 && rev1.customerName === 'Aarav Sharma', 'Review created successfully in service');

  // Test duplicate prevention
  let dupError = null;
  try {
    await reviewService.createReview({
      customerId: '507f1f77bcf86cd799439011',
      customerName: 'Aarav Sharma',
      rating: 4,
      comment: 'Trying to submit a second review',
    });
  } catch (err) {
    dupError = err;
  }
  assert(dupError && dupError.message === 'You have already submitted a review.', 'Duplicate review rejected with exact error message');

  // Test second customer review
  const rev2 = await reviewService.createReview({
    customerId: '507f1f77bcf86cd799439022',
    customerName: 'Priya Mehta',
    rating: 4,
    comment: 'Delicious paneer dishes and neat packaging.',
  });
  assert(rev2 && rev2.rating === 4, 'Second customer review created');

  // Test public reviews list
  const publicRevs = await reviewService.getPublicReviews();
  assert(publicRevs.length === 2, 'getPublicReviews returns both reviews');
  assert(publicRevs[0].customerId === '507f1f77bcf86cd799439022', 'Newest review returned first');

  // Test admin delete
  const deleteResult = await reviewService.deleteReview(rev1._id);
  assert(deleteResult && deleteResult.deletedId === rev1._id, 'Admin delete successfully removed rev1');

  const afterDelete = await reviewService.getPublicReviews();
  assert(afterDelete.length === 1 && afterDelete[0].customerId === '507f1f77bcf86cd799439022', 'Only targeted review deleted; other reviews unaffected');

  // 8. Forbidden File Format Audit
  console.log('\n--- 8. Forbidden File Formats Audit ---');
  const forbiddenExts = ['.mjs', '.ts', '.tsx'];
  function checkForbidden(dir) {
    let found = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.git') {
          found = found.concat(checkForbidden(full));
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (forbiddenExts.includes(ext)) {
          found.push(full);
        }
      }
    }
    return found;
  }
  const forbiddenFiles = checkForbidden(backendSrc);
  assert(forbiddenFiles.length === 0, `No forbidden .mjs, .ts, or .tsx files in backend/src (found: ${forbiddenFiles.length})`);

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL REVIEWS BACKEND QA TESTS PASSED.');
    process.exit(0);
  }
}

runTests();
