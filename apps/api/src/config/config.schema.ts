import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  WORKOS_API_KEY: z.string().min(1),
  WORKOS_CLIENT_ID: z.string().min(1),
  WORKOS_REDIRECT_URI: z.string().url(),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_KMS_KEY_ARN: z.string().min(1),
  AWS_ENDPOINT_URL: z.string().url().optional(),

  SECRETS_MANAGER_ENDPOINT: z.string().url().optional(),

  API_URL: z.string().url().default('http://localhost:8080'),

  COOKIE_SECRET: z.string().min(32),

  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
