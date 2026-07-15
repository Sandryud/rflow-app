import { Injectable } from '@nestjs/common';
import { ApprovalStatus, Prisma, ReleaseStatus } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import {
  createApprovalSelect,
  findApprovalsSelect,
  updateApprovalsSelect,
} from './approvals.select';

type UpdateApprovalParams = {
  data: Prisma.ApprovalUpdateInput;
  approvalId: string;
  userId: string;
  currentStatus: ApprovalStatus;
};

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

  async findApprovalById(approvalId: string) {
    return this.prisma.approval.findFirst({
      where: {
        id: approvalId,
        release: {
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      select: {
        id: true,
        releaseId: true,
        reviewerUserId: true,
        status: true,
        release: { select: { status: true } },
      },
    });
  }

  async updateApprovalStatus({
    approvalId,
    userId,
    currentStatus,
    data,
  }: UpdateApprovalParams) {
    return this.prisma.approval.update({
      where: {
        id: approvalId,
        reviewerUserId: userId,
        status: currentStatus,
        release: {
          status: { in: [ReleaseStatus.IN_REVIEW] },
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      data,
      select: updateApprovalsSelect,
    });
  }
}
