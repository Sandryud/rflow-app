import { Injectable } from '@nestjs/common';
import {
  ChecklistItemStatus,
  Prisma,
  ReleaseStatus,
} from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import {
  checklistCreateSelect,
  checklistGetItemsSelect,
  checklistUpdateStatusItemsSelect,
} from './checklist.select';

@Injectable()
export class ChecklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createChecklistItem(data: Prisma.ChecklistItemCreateInput) {
    return this.prisma.checklistItem.create({
      data,
      select: checklistCreateSelect,
    });
  }

  async findRelease(releaseId: string) {
    return this.prisma.release.findFirst({
      where: {
        id: releaseId,
        deletedAt: null,
        project: { deletedAt: null, organization: { deletedAt: null } },
      },
      select: { status: true, id: true },
    });
  }

  async findChecklistItemsByRelease(releaseId: string) {
    return this.prisma.checklistItem.findMany({
      where: { releaseId },
      select: checklistGetItemsSelect,
    });
  }

  async findChecklistById(checklistItemId: string) {
    return this.prisma.checklistItem.findFirst({
      where: {
        id: checklistItemId,
        release: {
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      select: {
        id: true,
        status: true,
        assignedToUserId: true,
        releaseId: true,
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

  async updateChecklistStatus(
    checklistItemId: string,
    currentStatus: ChecklistItemStatus,
    data: Prisma.ChecklistItemUpdateInput,
  ) {
    const item = await this.prisma.checklistItem.update({
      where: {
        id: checklistItemId,
        status: currentStatus,
        release: {
          status: { in: [ReleaseStatus.DRAFT, ReleaseStatus.IN_REVIEW] },
          deletedAt: null,
          project: {
            deletedAt: null,
            organization: { deletedAt: null },
          },
        },
      },
      data,
      select: checklistUpdateStatusItemsSelect,
    });

    return item;
  }
}
