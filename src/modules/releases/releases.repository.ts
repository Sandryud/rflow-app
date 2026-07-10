import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { releaseSelect, releaseTaskSelect } from './releases.select';

@Injectable()
export class ReleasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProjectMembership(userId: string, projectId: string) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          projects: { some: { id: projectId, deletedAt: null } },
          deletedAt: null,
        },
      },
      select: {
        role: true,
        id: true,
      },
    });
  }

  findReleaseMembership(userId: string, releaseId: string) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          projects: {
            some: {
              releases: { some: { id: releaseId, deletedAt: null } },
              deletedAt: null,
            },
          },
          deletedAt: null,
        },
      },
      select: {
        role: true,
        id: true,
      },
    });
  }

  findActiveEnvironment(projectId: string, environmentId: string) {
    return this.prisma.environment.findFirst({
      where: {
        projectId,
        id: environmentId,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  createRelease(data: Prisma.ReleaseUncheckedCreateInput) {
    return this.prisma.release.create({
      data,
      select: releaseSelect,
    });
  }

  findReleaseById(releaseId: string) {
    return this.prisma.release.findFirst({
      where: { id: releaseId, deletedAt: null },
      select: releaseSelect,
    });
  }

  findReleaseStatusById(releaseId: string) {
    return this.prisma.release.findFirst({
      where: {
        id: releaseId,
        deletedAt: null,
        project: { deletedAt: null, organization: { deletedAt: null } },
      },
      select: { id: true, status: true },
    });
  }

  findProjectReleases(projectId: string) {
    return this.prisma.release.findMany({
      where: { project: { id: projectId, deletedAt: null }, deletedAt: null },
      select: releaseSelect,
    });
  }

  createReleaseTask(data: Prisma.ReleaseTaskUncheckedCreateInput) {
    return this.prisma.releaseTask.create({
      data,
      select: releaseTaskSelect,
    });
  }

  findReleaseTasks(releaseId: string) {
    return this.prisma.releaseTask.findMany({
      where: { releaseId },
      select: releaseTaskSelect,
    });
  }
}
