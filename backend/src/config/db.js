import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  // Make sure unique / partial indexes (the duplicate-registration guard) exist.
  await mongoose.connection.syncIndexes();
}

export const disconnectDb = () => mongoose.disconnect();
