import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { MenuItemModel } from '../models/MenuItem';
import { AdminModel } from '../models/Admin';
import { menuData } from './menuData';

/**
 * Seeds menu items and the admin user.
 *   npm run seed            -> inserts menu only if collection is empty
 *   npm run seed -- --reset -> wipes and re-inserts menu items
 */
async function seed() {
  const reset = process.argv.includes('--reset');
  await connectDB();

  if (reset) await MenuItemModel.deleteMany({});
  const count = await MenuItemModel.countDocuments();
  if (count === 0) {
    await MenuItemModel.insertMany(menuData);
    console.log(`Inserted ${menuData.length} menu items`);
  } else {
    console.log(`Menu already has ${count} items, skipping (use --reset to replace)`);
  }

  await MenuItemModel.syncIndexes();

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await AdminModel.updateOne(
    { email: env.adminEmail.toLowerCase() },
    { $set: { passwordHash } },
    { upsert: true },
  );
  console.log(`Admin ready: ${env.adminEmail}`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
