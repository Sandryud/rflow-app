import type { Prisma } from 'generated/prisma/client';

export const createApprovalSelect = {
  id: true,
  releaseId: true,
  reviewerUserId: true,
  status: true,
  createdAt: true,
} satisfies Prisma.ApprovalSelect;

export const findApprovalsSelect = {
  id: true,
  releaseId: true,
  reviewerUserId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  decidedAt: true,
  comment: true,
} satisfies Prisma.ApprovalSelect;

export const updateApprovalsSelect = {
  id: true,
  releaseId: true,
  reviewerUserId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  decidedAt: true,
  comment: true,
} satisfies Prisma.ApprovalSelect;
