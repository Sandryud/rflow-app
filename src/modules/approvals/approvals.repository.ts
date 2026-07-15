import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { createApprovalSelect, findApprovalsSelect } from './approvals.select';

@Injectable()
export class ApprovalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRelease(releaseId: string) {
    return this.prisma.release.findFirst({
      where: {
        id: releaseId,
        deletedAt: null,
        project: {
          deletedAt: null,
          organization: { deletedAt: null },
        },
      },
      select: {
        id: true,
        status: true,
        createdByUserId: true,
      },
    });
  }

  async findReleaseMembership(userId: string, releaseId: string) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          projects: {
            some: {
              releases: {
                some: {
                  id: releaseId,
                  deletedAt: null,
                },
              },
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

  async findOtherReviewer(releaseId: string, excludedUserId: string) {
    return this.prisma.approval.findFirst({
      where: { releaseId, reviewerUserId: { not: excludedUserId } },
      select: { id: true },
    });
  }

  async createApproval(data: Prisma.ApprovalCreateInput) {
    return this.prisma.approval.create({ data, select: createApprovalSelect });
  }

  async findApprovals(releaseId: string) {
    return this.prisma.approval.findMany({
      where: {
        releaseId,
        release: {
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      select: findApprovalsSelect,
      orderBy: { createdAt: 'asc' },
    });
  }
}
