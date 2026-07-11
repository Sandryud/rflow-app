import type { Prisma } from 'generated/prisma/client';

export const projectSelect = {
  id: true,
  name: true,
  description: true,
  organizationId: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;
