import { z } from 'zod';
import { targetDescriptorSchema } from './target-descriptor';

export const stepActionSchema = z.enum([
  'click',
  'input',
  'select',
  'submit',
  'navigate',
  'manual',
]);
export type StepAction = z.infer<typeof stepActionSchema>;

// 'warning' is deliberately excluded — a step with an unresolved redaction warning
// never reaches the server; publish is blocked client- and server-side before that.
export const redactionStatusSchema = z.enum(['clear', 'resolved']);
export type RedactionStatus = z.infer<typeof redactionStatusSchema>;

const targetBoundsSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })
  .strict();
export type TargetBounds = z.infer<typeof targetBoundsSchema>;

/** Canonical wire shape for one published flow step (docs/04-data-model.md §3). */
export const stepSchema = z
  .object({
    id: z.string().uuid(),
    flowVersionId: z.string().uuid(),
    order: z.number().int().nonnegative(),
    instruction: z.string().min(1),
    action: stepActionSchema,
    url: z.string().url(),
    pageTitle: z.string(),
    viewportW: z.number().int().positive(),
    viewportH: z.number().int().positive(),
    screenshotAssetId: z.string().uuid(),
    targetBounds: targetBoundsSchema,
    targetDescriptor: targetDescriptorSchema,
    redactionStatus: redactionStatusSchema,
  })
  .strict();
export type Step = z.infer<typeof stepSchema>;
