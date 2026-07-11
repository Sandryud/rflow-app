import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { environmentSelect } from './environments.select';

@Injectable()
export class EnvironmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProjectForUser(userId: string, projectId: string) {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        organization: {
          deletedAt: null,
          memberships: {
            some: { userId },
          },
        },
      },
    });
  }

  findProjectMembership(userId: string, projectId: string) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          deletedAt: null,
          projects: { some: { id: projectId, deletedAt: null } },
        },
      },
      select: {
        role: true,
        id: true,
      },
    });
  }

  findProjectEnvironments(projectId: string) {
    return this.prisma.environment.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: environmentSelect,
    });
  }

  createEnvironment(data: Prisma.EnvironmentUncheckedCreateInput) {
    return this.prisma.environment.create({
      data,
      select: environmentSelect,
    });
  }
}
