import type { Prisma } from 'generated/prisma/client';

export const notificationSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  releaseId: true,
  type: true,
  title: true,
  message: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;
