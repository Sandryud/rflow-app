import type { Prisma } from 'generated/prisma/client';

export const userSelect = {
  email: true,
  id: true,
  name: true,
} satisfies Prisma.UserSelect;
