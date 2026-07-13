import type { Prisma } from 'generated/prisma/client';

export const checklistCreateSelect = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  createdByUserId: true,
  releaseId: true,
  description: true,
  comment: true,
  isRequired: true,
  assignedToUserId: true,
} satisfies Prisma.ChecklistItemSelect;

export const checklistGetItemsSelect = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  createdByUserId: true,
  releaseId: true,
  description: true,
  comment: true,
  isRequired: true,
  assignedToUserId: true,
  completedByUserId: true,
  completedAt: true,
} satisfies Prisma.ChecklistItemSelect;

export const checklistUpdateStatusItemsSelect = {
  id: true,
  status: true,
  comment: true,
  completedByUserId: true,
  completedAt: true,
} satisfies Prisma.ChecklistItemSelect;
