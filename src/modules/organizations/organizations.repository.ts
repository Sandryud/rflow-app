import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { organizationWithRoleSelect } from './organizations.select';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createOrganization(data: Prisma.OrganizationCreateInput, userId: string) {
    return this.prisma.organization.create({
      data,
      select: organizationWithRoleSelect(userId),
    });
  }

  findUserOrganizations(userId: string) {
    return this.prisma.organization.findMany({
      where: { deletedAt: null, memberships: { some: { userId } } },
      select: organizationWithRoleSelect(userId),
    });
  }
}
