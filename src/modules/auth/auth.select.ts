import type { Prisma } from 'generated/prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;
