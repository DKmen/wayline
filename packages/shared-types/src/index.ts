export { targetBboxSchema, targetDescriptorSchema } from './target-descriptor';
export type { TargetBbox, TargetDescriptor } from './target-descriptor';

export { redactionStatusSchema, stepActionSchema, stepSchema } from './step';
export type { RedactionStatus, Step, StepAction, TargetBounds } from './step';

export { roleSchema } from './role';
export type { Role } from './role';

export { planSchema } from './plan';
export type { Plan } from './plan';

export { ENTITLEMENTS, entitlementSetSchema, getEntitlement } from './entitlements';
export type { EntitlementKey, EntitlementSet } from './entitlements';

export { analyticsEventSchema, brokenStepReportReasonSchema } from './analytics-event';
export type { AnalyticsEvent, BrokenStepReportReason } from './analytics-event';
