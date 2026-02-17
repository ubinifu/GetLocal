import dotenv from 'dotenv';
import path from 'path';

// ---------------------------------------------------------------------------
// Load .env file
// ---------------------------------------------------------------------------
// Resolve relative to the backend root (two levels up from src/config/).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read an environment variable and return its value.
 * When `required` is true and the value is missing, an error is thrown
 * in production; in non-production environments a warning is logged and
 * the supplied `defaultValue` (or empty string) is returned instead.
 */
function getEnv(
  name: string,
  defaultValue?: string,
  required = false,
): string {
  const value = process.env[name] ?? defaultValue;

  if ((value === undefined || value === '') && required) {
    const message = `[Config] Missing required environment variable: ${name}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
    console.warn(`${message} (using default or empty value)`);
    return defaultValue ?? '';
  }

  return value ?? '';
}

function getEnvAsInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `[Config] Environment variable ${name} must be a valid integer. Received: "${raw}"`,
    );
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Configuration object
// ---------------------------------------------------------------------------

export interface AppConfig {
  /** Server port */
  port: number;
  /** Current runtime environment */
  nodeEnv: string;
  /** Whether the app is running in production */
  isProduction: boolean;
  /** Whether the app is running in development */
  isDevelopment: boolean;
  /** Whether the app is running in test */
  isTest: boolean;

  /** PostgreSQL connection string */
  databaseUrl: string;
  /** Redis connection string */
  redisUrl: string;

  /** Secret used to sign access JWTs */
  jwtSecret: string;
  /** Secret used to sign refresh JWTs */
  jwtRefreshSecret: string;
  /** Access token lifetime (e.g. "15m", "1h") */
  jwtExpiry: string;
  /** Refresh token lifetime (e.g. "7d", "30d") */
  jwtRefreshExpiry: string;

  /** Stripe secret API key */
  stripeSecretKey: string;
  /** Stripe webhook signing secret */
  stripeWebhookSecret: string;

  /** Allowed CORS origin(s) */
  corsOrigin: string;
  /** bcrypt hashing rounds */
  bcryptRounds: number;
}

const nodeEnv = getEnv('NODE_ENV', 'development');

const config: AppConfig = {
  // Server
  port: getEnvAsInt('PORT', 3000),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  // Database
  databaseUrl: getEnv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/getlocal_dev',
    true,
  ),
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379', true),

  // JWT
  jwtSecret: getEnv('JWT_SECRET', 'dev-jwt-secret-change-me', true),
  jwtRefreshSecret: getEnv(
    'JWT_REFRESH_SECRET',
    'dev-jwt-refresh-secret-change-me',
    true,
  ),
  jwtExpiry: getEnv('JWT_EXPIRY', '15m'),
  jwtRefreshExpiry: getEnv('JWT_REFRESH_EXPIRY', '7d'),

  // Stripe
  stripeSecretKey: getEnv('STRIPE_SECRET_KEY', '', true),
  stripeWebhookSecret: getEnv('STRIPE_WEBHOOK_SECRET', '', true),

  // CORS
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // Security
  bcryptRounds: getEnvAsInt('BCRYPT_ROUNDS', 12),
};

// ---------------------------------------------------------------------------
// Production-only validation
// ---------------------------------------------------------------------------
// Ensure that critical secrets are explicitly set when running in production.
// Falling back to weak defaults in prod is a security risk.

if (config.isProduction) {
  const requiredInProd: Array<{ key: keyof AppConfig; envName: string }> = [
    { key: 'databaseUrl', envName: 'DATABASE_URL' },
    { key: 'redisUrl', envName: 'REDIS_URL' },
    { key: 'jwtSecret', envName: 'JWT_SECRET' },
    { key: 'jwtRefreshSecret', envName: 'JWT_REFRESH_SECRET' },
    { key: 'stripeSecretKey', envName: 'STRIPE_SECRET_KEY' },
    { key: 'stripeWebhookSecret', envName: 'STRIPE_WEBHOOK_SECRET' },
  ];

  const missing = requiredInProd.filter((v) => {
    const value = config[v.key];
    return (
      value === '' ||
      value === undefined ||
      (typeof value === 'string' && value.startsWith('dev-'))
    );
  });

  if (missing.length > 0) {
    const names = missing.map((m) => m.envName).join(', ');
    throw new Error(
      `[Config] The following required environment variables are missing or ` +
        `set to insecure defaults in production: ${names}`,
    );
  }
}

export { config };
export default config;
