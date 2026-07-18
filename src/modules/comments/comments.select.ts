import type { Prisma } from 'generated/prisma/client';

export const commentSelect = {
  id: true,
  releaseId: true,
  authorUserId: true,
  message: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.CommentSelect;
