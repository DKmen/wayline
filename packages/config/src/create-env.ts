import type { z } from 'zod';

/**
 * Parses process.env against a Zod schema and fails fast with every missing/invalid
 * key listed together, instead of the app crashing later on a single undefined var.
 */
export function createEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}
