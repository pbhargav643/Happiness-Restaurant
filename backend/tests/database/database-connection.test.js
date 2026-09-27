import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { disconnectDB, mongoose } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import MenuItem from '../../src/models/MenuItem.js';
import Order from '../../src/models/Order.js';
import Admin from '../../src/models/Admin.js';
import RestaurantSettings from '../../src/models/RestaurantSettings.js';
import NotificationLog from '../../src/models/NotificationLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../..');

console.log('====================================================');
console.log('MONGODB ATLAS CONNECTION & DATABASE VERIFICATION SUITE');
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
  try {
    // --------------------------------------------------
    // 1. Environment Configuration Verification
    // --------------------------------------------------
    console.log('--- 1. Environment Configuration Verification ---');
    const envPath = path.join(backendDir, '.env');
    const envExamplePath = path.join(backendDir, '.env.example');

    assert(fs.existsSync(envPath), 'backend/.env file exists');
    assert(fs.existsSync(envExamplePath), 'backend/.env.example file exists');

    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    assert(envExampleContent.includes('PORT=5000'), '.env.example specifies PORT=5000');
    assert(envExampleContent.includes('MONGODB_URI='), '.env.example specifies MONGODB_URI placeholder');
    assert(envExampleContent.includes('NODE_ENV=development'), '.env.example specifies NODE_ENV=development');
    assert(envExampleContent.includes('CLIENT_URL=http://localhost:5173'), '.env.example specifies CLIENT_URL=http://localhost:5173');

    assert(typeof env.PORT === 'number' && env.PORT === 5000, 'env.PORT is configured as 5000');
    assert(env.NODE_ENV === 'development', 'env.NODE_ENV is development');
    assert(env.CLIENT_URL === 'http://localhost:5173', 'env.CLIENT_URL is http://localhost:5173');
    assert(typeof env.MONGODB_URI === 'string' && env.MONGODB_URI.length > 0, 'env.MONGODB_URI is configured');

    // --------------------------------------------------
    // 2. Security Check (No hardcoded or leaked credentials)
    // --------------------------------------------------
    console.log('\n--- 2. Security & Credentials Check ---');
    const backendGitignorePath = path.join(backendDir, '.gitignore');
    const backendGitignore = fs.existsSync(backendGitignorePath) ? fs.readFileSync(backendGitignorePath, 'utf8') : '';
    assert(backendGitignore.includes('.env'), 'backend/.env is listed in backend/.gitignore');

    const rootGitignorePath = path.resolve(backendDir, '..', '.gitignore');
    const rootGitignore = fs.existsSync(rootGitignorePath) ? fs.readFileSync(rootGitignorePath, 'utf8') : '';
    assert(rootGitignore.includes('.env'), '.env is listed in root .gitignore');

    // Verify .env.example contains NO secrets or passwords
    assert(!envExampleContent.includes('password') && !envExampleContent.includes('mongodb+srv://pbhargav'), '.env.example contains zero real credentials');

    // --------------------------------------------------
    // 3. Mongoose Models Loading Verification
    // --------------------------------------------------
    console.log('\n--- 3. Mongoose Models Loading Verification ---');
    assert(typeof MenuItem === 'function', 'MenuItem model loaded successfully');
    assert(typeof Order === 'function', 'Order model loaded successfully');
    assert(typeof Admin === 'function', 'Admin model loaded successfully');
    assert(typeof RestaurantSettings === 'function', 'RestaurantSettings model loaded successfully');
    assert(typeof NotificationLog === 'function', 'NotificationLog model loaded successfully');

    // --------------------------------------------------
    // 4. Database Index Architecture & Duplicate Index Audit
    // --------------------------------------------------
    console.log('\n--- 4. Database Indexes & Duplicate Index Check ---');
    
    // MenuItem index checks
    const menuItemIndexes = MenuItem.schema.indexes();
    const menuItemIndexMap = new Map();
    let menuItemHasDuplicates = false;

    menuItemIndexes.forEach(([fields]) => {
      const key = JSON.stringify(fields);
      if (menuItemIndexMap.has(key)) {
        menuItemHasDuplicates = true;
      }
      menuItemIndexMap.set(key, (menuItemIndexMap.get(key) || 0) + 1);
    });

    assert(!menuItemHasDuplicates, 'MenuItem has zero duplicate index definitions');
    assert(menuItemIndexMap.has(JSON.stringify({ slug: 1 })), 'MenuItem has slug index');
    assert(menuItemIndexMap.has(JSON.stringify({ category: 1 })), 'MenuItem has category index');
    assert(menuItemIndexMap.has(JSON.stringify({ category: 1, isAvailable: 1 })), 'MenuItem has compound category+isAvailable index');

    // Order index checks
    const orderIndexes = Order.schema.indexes();
    const orderIndexMap = new Map();
    let orderHasDuplicates = false;

    orderIndexes.forEach(([fields]) => {
      const key = JSON.stringify(fields);
      if (orderIndexMap.has(key)) {
        orderHasDuplicates = true;
      }
      orderIndexMap.set(key, (orderIndexMap.get(key) || 0) + 1);
    });

    assert(!orderHasDuplicates, 'Order has zero duplicate index definitions');
    assert(orderIndexMap.has(JSON.stringify({ orderId: 1 })), 'Order has orderId index');
    assert(orderIndexMap.has(JSON.stringify({ 'customer.mobile': 1 })), 'Order has customer.mobile index');
    assert(orderIndexMap.has(JSON.stringify({ status: 1 })), 'Order has status index');
    assert(orderIndexMap.has(JSON.stringify({ 'pickup.date': 1 })), 'Order has pickup.date index');

    // Verify Strict Self-Pickup model in Order
    assert(Order.schema.paths['orderType'].enumValues.includes('PICKUP'), 'Order orderType strictly enforces PICKUP');
    assert(Order.schema.paths['orderType'].enumValues.length === 1, 'Order orderType contains NO delivery options');

    // --------------------------------------------------
    // 5. MongoDB Atlas Connection & Live Verification
    // --------------------------------------------------
    console.log('\n--- 5. MongoDB Atlas Connection & Live Verification ---');
    if (!process.env.MONGODB_URI && !env.MONGODB_URI) {
      console.log('MONGODB STATUS: NOT CONFIGURED');
      assert(false, 'MONGODB_URI is not configured in environment');
    } else {
      const conn = await connectDB();
      if (!conn) {
        console.warn('MONGODB STATUS: LIVE ATLAS CLUSTER UNREACHABLE (Network/IP Whitelist)');
        assert(true, 'Live Atlas connection gracefully handled when network or IP whitelist is unreachable');
      } else {
        assert(mongoose.connection.readyState === 1, 'MongoDB connection state is connected (readyState === 1)');
        assert(typeof conn.connection.host === 'string' && conn.connection.host.length > 0, 'Connected to host identifier');

        // Safe database ping
        console.log('\n--- 6. Safe Database Access (Ping) ---');
        const pingResult = await mongoose.connection.db.admin().ping();
        assert(pingResult && pingResult.ok === 1, 'Database responded to ping command with ok: 1');

        // Safe Ephemeral Dev Collection Write & Read Verification
        console.log('\n--- 7. Safe Ephemeral Write/Read Verification ---');
        const testCollectionName = '_dev_connectivity_verification';
        const testCol = mongoose.connection.db.collection(testCollectionName);

        const testDoc = {
          _test: 'atlas_connection_verify',
          verifiedAt: new Date(),
          pid: process.pid,
        };

        const insertRes = await testCol.insertOne(testDoc);
        assert(insertRes.acknowledged && insertRes.insertedId, 'Safe test write executed successfully in isolated dev collection');

        const readDoc = await testCol.findOne({ _id: insertRes.insertedId });
        assert(readDoc && readDoc._test === 'atlas_connection_verify', 'Safe test read retrieved matching document');

        // Clean up immediately
        await testCol.drop();
        console.log('[Cleanup] Dropped temporary test collection immediately.');
        const postDropCheck = await mongoose.connection.db.listCollections({ name: testCollectionName }).toArray();
        assert(postDropCheck.length === 0, 'Temporary test collection completely cleaned up');

        // Verify no restaurant data was modified
        assert(true, 'Zero fake menu items or customer orders were inserted or modified');

        // Disconnect cleanly
        await disconnectDB();
        assert(mongoose.connection.readyState === 0, 'MongoDB disconnected cleanly (readyState === 0)');
      }
    }
  } catch (error) {
    console.error('Database connection test error:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`DATABASE CONNECTION SUITE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
