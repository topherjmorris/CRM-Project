import { cleanupExpiredInvites } from "./cleanup-expired-invites";

// Every background job is registered here so /api/inngest serves it.
export const functions = [cleanupExpiredInvites];
