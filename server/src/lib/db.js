import mongoose from 'mongoose';
import { logger } from './logger.js';

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err) => logger.error({ err }, 'mongo error'));
  mongoose.connection.on('disconnected', () => logger.warn('mongo disconnected'));
  await mongoose.connect(uri);
  logger.info('mongo connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
