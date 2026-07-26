import type { Prisma } from 'generated/prisma/client';

export const auditEventSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  releaseId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AuditEventSelect;
