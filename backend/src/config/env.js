import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT ?? 5000),
  mongoUri:
    process.env.NODE_ENV === 'test'
      ? (process.env.MONGO_URI_TEST ?? 'mongodb://127.0.0.1:27017/workshops_test')
      : (process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/workshops'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
});
