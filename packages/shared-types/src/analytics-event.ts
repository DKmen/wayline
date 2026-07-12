import { z } from 'zod';

/** Matches broken_step_reports.reason (docs/04-data-model.md §3) — kept in sync, one source of truth. */
export const brokenStepReportReasonSchema = z.enum([
  'target_missing',
  'wrong_target',
  'page_changed',
  'other',
]);
export type BrokenStepReportReason = z.infer<typeof brokenStepReportReasonSchema>;

const envelope = {
  flowVersionId: z.string().uuid(),
  mode: z.enum(['video', 'walkthrough']),
  occurredAt: z.string().datetime(),
};

const sessionStartEvent = z
  .object({
    ...envelope,
    type: z.literal('session_start'),
    viewport: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }).strict(),
    extensionVersion: z.string().optional(),
  })
  .strict();

const videoPlayEvent = z
  .object({
    ...envelope,
    type: z.literal('video_play'),
    positionMs: z.number().int().nonnegative(),
  })
  .strict();

const videoSeekEvent = z
  .object({
    ...envelope,
    type: z.literal('video_seek'),
    positionMs: z.number().int().nonnegative(),
  })
  .strict();

// completion (>=90% watched) is a server/client-derived rule, not a payload field — see docs/10 §2.
const videoCompleteEvent = z
  .object({
    ...envelope,
    type: z.literal('video_complete'),
    positionMs: z.number().int().nonnegative(),
  })
  .strict();

const stepViewedEvent = z
  .object({
    ...envelope,
    type: z.literal('step_viewed'),
    stepOrder: z.number().int().nonnegative(),
  })
  .strict();

const stepCompletedEvent = z
  .object({
    ...envelope,
    type: z.literal('step_completed'),
    stepOrder: z.number().int().nonnegative(),
    resolveConfidence: z.number().min(0).max(1),
    msOnStep: z.number().int().nonnegative(),
  })
  .strict();

const stepSkippedEvent = z
  .object({
    ...envelope,
    type: z.literal('step_skipped'),
    stepOrder: z.number().int().nonnegative(),
    priorPauseReason: z.string().optional(),
  })
  .strict();

const stepRetriedEvent = z
  .object({
    ...envelope,
    type: z.literal('step_retried'),
    stepOrder: z.number().int().nonnegative(),
    priorPauseReason: z.string().optional(),
  })
  .strict();

// url is the recorded step URL only — never the viewer's current unexpected URL (no leakage).
const pausedTargetMissingEvent = z
  .object({
    ...envelope,
    type: z.literal('paused_target_missing'),
    stepOrder: z.number().int().nonnegative(),
    url: z.string().url(),
  })
  .strict();

const reportOpenedEvent = z
  .object({
    ...envelope,
    type: z.literal('report_opened'),
    reason: brokenStepReportReasonSchema,
    comment: z.string().optional(),
  })
  .strict();

const sessionEndEvent = z
  .object({
    ...envelope,
    type: z.literal('session_end'),
    completed: z.boolean(),
    lastStepOrder: z.number().int().nonnegative().optional(),
  })
  .strict();

/**
 * The full client-emittable analytics event taxonomy (docs/10-analytics-spec.md §2).
 * user_id/workspace_id are deliberately absent — the server stamps identity from the
 * session; client-supplied identity in a batched event is always ignored.
 */
export const analyticsEventSchema = z.discriminatedUnion('type', [
  sessionStartEvent,
  videoPlayEvent,
  videoSeekEvent,
  videoCompleteEvent,
  stepViewedEvent,
  stepCompletedEvent,
  stepSkippedEvent,
  stepRetriedEvent,
  pausedTargetMissingEvent,
  reportOpenedEvent,
  sessionEndEvent,
]);
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
