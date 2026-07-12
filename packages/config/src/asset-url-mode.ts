import { z } from 'zod';

/** How an app delivers private asset URLs (docs/08-local-dev.md §4) — direct presigned MinIO URLs locally, CloudFront when deployed. */
export const assetUrlModeSchema = z.enum(['presign', 'cloudfront']);
export type AssetUrlMode = z.infer<typeof assetUrlModeSchema>;
