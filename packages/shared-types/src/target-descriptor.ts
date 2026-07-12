import { z } from 'zod';

/** Recorded viewport-relative box used only as a validation signal at replay, never as the primary match. */
export const targetBboxSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    vw: z.number().positive(),
    vh: z.number().positive(),
  })
  .strict();
export type TargetBbox = z.infer<typeof targetBboxSchema>;

/**
 * Multi-selector bundle scored at replay time to resolve a live walkthrough
 * target (docs/06-extension-spec.md §4) — only bbox is required, everything
 * else is an optional matching signal contributing to the confidence score.
 */
export const targetDescriptorSchema = z
  .object({
    testId: z.string().optional(),
    domId: z.string().optional(),
    role: z.object({ role: z.string(), name: z.string() }).strict().optional(),
    label: z.string().optional(),
    text: z.object({ content: z.string(), tag: z.string() }).strict().optional(),
    css: z.string().optional(),
    pierce: z.string().optional(),
    nth: z.number().int().nonnegative().optional(),
    bbox: targetBboxSchema,
  })
  .strict();
export type TargetDescriptor = z.infer<typeof targetDescriptorSchema>;
