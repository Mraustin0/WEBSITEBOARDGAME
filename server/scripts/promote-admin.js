import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { User } from '../src/models/user.model.js';

const email = process.argv[2];
if (!email) {
  console.error('usage: npm run promote -- <email>');
  process.exit(1);
}

await connectDb(env.MONGODB_URI);
const user = await User.findOneAndUpdate(
  { email: email.toLowerCase() },
  { role: 'admin' },
  { new: true },
);
if (!user) {
  logger.error({ email }, 'user not found');
  await disconnectDb();
  process.exit(2);
}
logger.info({ email: user.email }, 'promoted to admin');
await disconnectDb();
