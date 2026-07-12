import { describe, expect, it } from 'vitest';
import { ENTITLEMENTS, entitlementSetSchema, getEntitlement } from './index';

describe('ENTITLEMENTS constant', () => {
  it('matches the versioned free/pro/team table from docs/04-data-model.md §5', () => {
    expect(ENTITLEMENTS.free.maxPublishedFlows).toBe(3);
    expect(ENTITLEMENTS.pro.maxPublishedFlows).toBe(Number.POSITIVE_INFINITY);
    expect(ENTITLEMENTS.team.maxPublishedFlows).toBe(Number.POSITIVE_INFINITY);
    expect(ENTITLEMENTS.free.maxCreators).toBe(1);
    expect(ENTITLEMENTS.pro.maxCreators).toBe(3);
    expect(ENTITLEMENTS.team.maxCreators).toBe('seats');
    expect(ENTITLEMENTS.free.analyticsLevel).toBe('basic');
    expect(ENTITLEMENTS.pro.analyticsLevel).toBe('steps');
    expect(ENTITLEMENTS.team.analyticsLevel).toBe('compliance');
    expect(ENTITLEMENTS.free.customBranding).toBe(false);
    expect(ENTITLEMENTS.pro.customBranding).toBe(true);
  });

  it('conforms to entitlementSetSchema for every plan', () => {
    for (const plan of ['free', 'pro', 'team'] as const) {
      expect(() => entitlementSetSchema.parse(ENTITLEMENTS[plan])).not.toThrow();
    }
  });

  it('rejects an entitlement set missing a required key', () => {
    const { customBranding: _customBranding, ...incomplete } = ENTITLEMENTS.pro;
    expect(() => entitlementSetSchema.parse(incomplete)).toThrowError();
  });
});

describe('getEntitlement', () => {
  it('reads a limit for a known plan and key', () => {
    expect(getEntitlement('free', 'maxPublishedFlows')).toBe(3);
    expect(getEntitlement('team', 'renderPriority')).toBe('high');
  });

  it('throws for a plan outside the free/pro/team set instead of returning undefined', () => {
    // Simulates untrusted input reaching this helper without having gone through planSchema first.
    expect(() => getEntitlement('enterprise' as never, 'maxPublishedFlows')).toThrowError();
  });
});
