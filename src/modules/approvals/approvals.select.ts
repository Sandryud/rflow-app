import type { Prisma } from 'generated/prisma/client';

export const createApprovalSelect = {
  id: true,
  releaseId: true,
  reviewerUserId: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ApprovalSelect;
