import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../config/database.js';
import MenuItem, { generateSlug } from '../models/MenuItem.js';
import { MENU_ITEMS } from '../data/menuData.js';

/**
 * Seed Database with Verified 144 Physical Menu Dishes
 *
 * Rules:
 * - Does not invent items or prices
 * - Exactly preserves physical menu card data
 * - Only seeds if collection is empty (or force is true)
 */
export async function seedMenu(force = false) {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.warn('[Seed Menu] Database not connected. Skipping seed.');
    return { success: false, reason: 'Database not connected' };
  }

  const existingCount = await MenuItem.countDocuments();
  if (existingCount > 0 && !force) {
    console.log(`[Seed Menu] Menu already populated (${existingCount} items). Skipping seed.`);
    return { success: true, count: existingCount, seeded: false };
  }

  if (force) {
    console.log('[Seed Menu] Force re-seeding: Clearing existing menu items...');
    await MenuItem.deleteMany({});
  }

  console.log(`[Seed Menu] Seeding ${MENU_ITEMS.length} verified physical menu items...`);

  const docs = MENU_ITEMS.map((item) => ({
    name: item.name.trim(),
    slug: generateSlug(item.name),
    category: item.category.trim().toLowerCase(),
    price: item.price,
    image: item.image || null,
    description: item.description || '',
    isAvailable: item.available !== false,
  }));

  // Use ordered: false to skip duplicate slugs if any
  const inserted = await MenuItem.insertMany(docs, { ordered: false });
  console.log(`[Seed Menu] Successfully seeded ${inserted.length} items to MongoDB.`);

  return { success: true, count: inserted.length, seeded: true };
}

// Allow direct script execution: node src/utils/seedMenu.js
if (process.argv[1]?.endsWith('seedMenu.js')) {
  (async () => {
    try {
      await seedMenu(process.argv.includes('--force'));
    } catch (err) {
      console.error('[Seed Menu Error]:', err.message);
    } finally {
      await disconnectDB();
      process.exit(0);
    }
  })();
}

export default seedMenu;
