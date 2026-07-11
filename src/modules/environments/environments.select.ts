import type { Prisma } from 'generated/prisma/client';

export const environmentSelect = {
  id: true,
  name: true,
  projectId: true,
  description: true,
  createdAt: true,
  isActive: true,
  isDefault: true,
} satisfies Prisma.EnvironmentSelect;
