// Registry of all background jobs. A job isn't served by /api/inngest until it's listed here.

import { cleanupExpiredInvites } from "./cleanup-expired-invites";

// Every background job is registered here so /api/inngest serves it.
export const functions = [cleanupExpiredInvites];
