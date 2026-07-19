import type { Prisma } from 'generated/prisma/client';

export const releaseSelect = {
  id: true,
  name: true,
  description: true,
  version: true,
  status: true,
  projectId: true,
  environmentId: true,
  createdByUserId: true,
  plannedReleaseAt: true,
  createdAt: true,
} satisfies Prisma.ReleaseSelect;

export const releaseTaskSelect = {
  id: true,
  releaseId: true,
  key: true,
  name: true,
  description: true,
  url: true,
  type: true,
  createdAt: true,
} satisfies Prisma.ReleaseTaskSelect;

export const updateReleaseSelect = {
  id: true,
  version: true,
  name: true,
  status: true,
  projectId: true,
  environmentId: true,
  updatedAt: true,
} satisfies Prisma.ReleaseSelect;
