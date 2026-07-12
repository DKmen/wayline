import { describe, expect, it } from 'vitest';
import { analyticsEventSchema } from './index';

const base = {
  flowVersionId: '4b6f3a7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  mode: 'walkthrough' as const,
  occurredAt: '2026-07-11T12:00:00.000Z',
};

const validEventsByType: Record<string, Record<string, unknown>> = {
  session_start: { ...base, type: 'session_start', viewport: { w: 1440, h: 900 } },
  video_play: { ...base, type: 'video_play', positionMs: 1200 },
  video_seek: { ...base, type: 'video_seek', positionMs: 4500 },
  video_complete: { ...base, type: 'video_complete', positionMs: 60000 },
  step_viewed: { ...base, type: 'step_viewed', stepOrder: 2 },
  step_completed: {
    ...base,
    type: 'step_completed',
    stepOrder: 2,
    resolveConfidence: 0.92,
    msOnStep: 3400,
  },
  step_skipped: { ...base, type: 'step_skipped', stepOrder: 3 },
  step_retried: { ...base, type: 'step_retried', stepOrder: 3, priorPauseReason: 'target_missing' },
  paused_target_missing: {
    ...base,
    type: 'paused_target_missing',
    stepOrder: 4,
    url: 'https://app.crm.example/contacts',
  },
  report_opened: {
    ...base,
    type: 'report_opened',
    reason: 'target_missing',
    comment: 'button moved',
  },
  session_end: { ...base, type: 'session_end', completed: true, lastStepOrder: 5 },
};

describe('analyticsEventSchema', () => {
  it.each(Object.entries(validEventsByType))('parses a valid %s event', (_type, payload) => {
    expect(analyticsEventSchema.parse(payload)).toEqual(payload);
  });

  it('rejects an event type outside the documented taxonomy', () => {
    expect(() => analyticsEventSchema.parse({ ...base, type: 'video_pause' })).toThrowError();
  });

  it('rejects a mode outside video/walkthrough', () => {
    expect(() =>
      analyticsEventSchema.parse({ ...base, type: 'step_viewed', stepOrder: 1, mode: 'desktop' }),
    ).toThrowError();
  });

  it('rejects an event carrying an unrecognized field, e.g. a leaked typed input value', () => {
    expect(() =>
      analyticsEventSchema.parse({
        ...base,
        type: 'step_viewed',
        stepOrder: 1,
        value: 'user@example.com',
      }),
    ).toThrowError();
  });
});
