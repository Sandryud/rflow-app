import type { Prisma } from 'generated/prisma/client';

export const organizationWithRoleSelect = (
  userId: string,
): Prisma.OrganizationSelect => ({
  id: true,
  name: true,
  description: true,
  createdAt: true,
  memberships: { where: { userId }, select: { role: true } },
});
