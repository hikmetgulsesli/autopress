import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Password policy constants
export const PASSWORD_POLICY = {
  MIN_LENGTH: 12,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
} as const;

// Password validation regex
// Requires: min 12 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

// Helper to transform empty strings to undefined
const emptyStringToUndefined = (val: unknown) =>
  val === '' ? undefined : val;

// Environment variable schema
const envSchema = z.object({
  // JWT Secrets - must be at least 32 characters for security
  JWT_SECRET: z.string()
    .min(1, 'JWT_SECRET is required')
    .min(32, 'JWT_SECRET must be at least 32 characters long for security'),
  
  JWT_REFRESH_SECRET: z.string()
    .min(1, 'JWT_REFRESH_SECRET is required'),
  
  // Database
  DATABASE_URL: z.string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string (must start with postgresql:// or postgres://)'
    ),
  
  // CORS Origin - defaults to localhost if not set
  CORS_ORIGIN: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).default('http://localhost:3519')
  ),
  
  // Optional: Server Port - defaults to 4519
  PORT: z.preprocess(
    emptyStringToUndefined,
    z.string().default('4519')
  ).transform((val) => parseInt(val, 10))
   .pipe(z.number().min(1).max(65535)),
  
  // Optional: OpenAI API Key
  OPENAI_API_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string()
      .optional()
      .refine(
        (key) => !key || key.startsWith('sk-'),
        'OPENAI_API_KEY must start with "sk-" if provided'
      )
  ),
  
  // Optional: Unsplash Access Key
  UNSPLASH_ACCESS_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().optional()
  ),
});

// Validate and parse environment variables
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });
    
    console.error('\n❌ Environment Variable Validation Failed:\n');
    console.error(errors.join('\n'));
    console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
    console.error('See .env.example for reference.\n');
    
    process.exit(1);
  }
  
  return result.data;
}

// Export validated config
export const config = validateEnv();

// Type export for TypeScript
export type Config = typeof config;
