import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../config/database.js';
import Table, { getNormalizedTableKey } from '../models/Table.js';

export const DEFAULT_BASELINE_TABLES = [
  {
    tableNumber: 'Table 1',
    name: 'Window Bay',
    capacity: 4,
    status: 'Active',
  },
  {
    tableNumber: 'Table 2',
    name: 'Garden Alcove',
    capacity: 2,
    status: 'Active',
  },
  {
    tableNumber: 'Table 3',
    name: 'Family Central',
    capacity: 6,
    status: 'Active',
  },
  {
    tableNumber: 'Table 4',
    name: 'Terrace Corner',
    capacity: 4,
    status: 'Inactive',
  },
];

/**
 * Seed Database with Initial 4 Dining Tables
 *
 * Rules:
 * - Does not invent extra tables
 * - Matches Phase 1–3 established mock baseline
 * - Idempotent: Only seeds if collection is empty (or force is true)
 */
export async function seedTables(force = false) {
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.warn('[Seed Tables] Database not connected. Skipping table seed.');
    return { success: false, reason: 'Database not connected' };
  }

  const existingCount = await Table.countDocuments();
  if (existingCount > 0 && !force) {
    console.log(`[Seed Tables] Tables already populated (${existingCount} tables). Skipping seed.`);
    return { success: true, count: existingCount, seeded: false };
  }

  if (force) {
    console.log('[Seed Tables] Force re-seeding: Clearing existing tables...');
    await Table.deleteMany({});
  }

  console.log(`[Seed Tables] Seeding ${DEFAULT_BASELINE_TABLES.length} baseline restaurant tables...`);

  const docs = DEFAULT_BASELINE_TABLES.map((t) => ({
    tableNumber: t.tableNumber,
    normalizedNumber: getNormalizedTableKey(t.tableNumber),
    name: t.name,
    capacity: t.capacity,
    status: t.status,
    isOccupied: false,
    activeOrderId: null,
  }));

  const inserted = await Table.insertMany(docs, { ordered: false });
  console.log(`[Seed Tables] Successfully seeded ${inserted.length} tables to MongoDB.`);

  return { success: true, count: inserted.length, seeded: true };
}

// Allow direct script execution: node src/utils/seedTables.js
if (process.argv[1]?.endsWith('seedTables.js')) {
  (async () => {
    try {
      await seedTables(process.argv.includes('--force'));
    } catch (err) {
      console.error('[Seed Tables Error]:', err.message);
    } finally {
      await disconnectDB();
    }
  })();
}

export default seedTables;
