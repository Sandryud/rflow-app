import type { Prisma } from 'generated/prisma/client';

import type { auditEventSelect } from './audit.select';

export type AuditEventResponse = Prisma.AuditEventGetPayload<{
  select: typeof auditEventSelect;
}>;

export type GetReleaseAuditEventsParams = {
  limit: number;
  userId: string;
  releaseId: string;
  cursor?: string;
};

export type GetReleaseAuditEventsResponse = {
  items: AuditEventResponse[];
  nextCursor: string | null;
};

export type AuditCursorData = {
  id: string;
  createdAt: Date;
};
