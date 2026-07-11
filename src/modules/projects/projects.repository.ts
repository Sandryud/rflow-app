import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { projectSelect } from './projects.select';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrganizationWithProjects(userId: string, organizationId: string) {
    return this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
        memberships: { some: { userId } },
      },
      select: {
        projects: {
          where: {
            deletedAt: null,
          },
          select: projectSelect,
        },
      },
    });
  }

  findOrganizationMembership(userId: string, organizationId: string) {
    return this.prisma.membership.findFirst({
      where: { userId, organizationId, organization: { deletedAt: null } },
      select: { role: true, id: true },
    });
  }

  createProject(data: Prisma.ProjectUncheckedCreateInput) {
    return this.prisma.project.create({
      data,
      select: projectSelect,
    });
  }
}
