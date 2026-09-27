import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function audit() {
  try {
    const res = await fetch('http://localhost:5000/api/menu?limit=300&includeUnavailable=true');
    const json = await res.json();
    
    if (!json.success || !Array.isArray(json.data)) {
      console.error('Failed to fetch menu:', json);
      return;
    }

    const items = json.data;
    console.log(`Total items in database: ${items.length}`);

    const categories = {};
    const slugs = new Set();
    const duplicateSlugs = [];
    const names = new Set();
    const duplicateNames = [];
    const missingImages = [];
    const invalidPrices = [];
    const invalidAvailability = [];

    const publicDir = 'e:/Restaurant Foods Project/frontend/public';

    for (const item of items) {
      // Category count
      const cat = item.category;
      categories[cat] = (categories[cat] || 0) + 1;

      // Duplicate slug check
      if (slugs.has(item.slug)) {
        duplicateSlugs.push({ id: item._id, slug: item.slug, name: item.name });
      } else {
        slugs.add(item.slug);
      }

      // Duplicate name check
      const normName = (item.name || '').trim().toLowerCase();
      if (names.has(normName)) {
        duplicateNames.push({ id: item._id, name: item.name });
      } else {
        names.add(normName);
      }

      // Price check
      if (typeof item.price !== 'number' || item.price < 0 || isNaN(item.price)) {
        invalidPrices.push({ id: item._id, name: item.name, price: item.price });
      }

      // Availability check
      if (typeof item.isAvailable !== 'boolean') {
        invalidAvailability.push({ id: item._id, name: item.name, isAvailable: item.isAvailable });
      }

      // Image check
      if (item.image) {
        const fullImagePath = path.join(publicDir, item.image);
        if (!fs.existsSync(fullImagePath)) {
          missingImages.push({ id: item._id, name: item.name, image: item.image, fullPath: fullImagePath });
        }
      } else {
        missingImages.push({ id: item._id, name: item.name, image: null });
      }
    }

    console.log('\n--- CATEGORIES BREAKDOWN ---');
    for (const [cat, count] of Object.entries(categories).sort()) {
      console.log(`  ${cat}: ${count}`);
    }

    console.log('\n--- AUDIT RESULTS ---');
    console.log(`Duplicate Slugs: ${duplicateSlugs.length}`, duplicateSlugs);
    console.log(`Duplicate Names: ${duplicateNames.length}`, duplicateNames);
    console.log(`Invalid Prices: ${invalidPrices.length}`, invalidPrices);
    console.log(`Invalid Availability: ${invalidAvailability.length}`, invalidAvailability);
    console.log(`Missing Image Files: ${missingImages.length}`, missingImages);

  } catch (err) {
    console.error('Audit script error:', err);
  }
}

audit();
