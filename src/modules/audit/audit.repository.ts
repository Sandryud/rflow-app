import { Injectable } from '@nestjs/common';
import type { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { auditEventSelect } from './audit.select';
import type { AuditCursorData, CreateAuditEventData } from './audit.types';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  findReleaseEventsPage(
    releaseId: string,
    limit: number,
    cursor?: AuditCursorData,
  ) {
    return this.prisma.auditEvent.findMany({
      where: {
        releaseId,
        release: {
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
        ...(cursor && {
          OR: [
            {
              createdAt: {
                gt: cursor.createdAt,
              },
            },
            {
              createdAt: cursor.createdAt,
              id: {
                gt: cursor.id,
              },
            },
          ],
        }),
      },
      take: limit + 1,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: auditEventSelect,
    });
  }

  findReleaseMembership(userId: string, releaseId: string) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          deletedAt: null,
          projects: {
            some: {
              deletedAt: null,
              releases: { some: { id: releaseId, deletedAt: null } },
            },
          },
        },
      },
      select: {
        id: true,
        role: true,
      },
    });
  }

  createAuditEvent(
    transactionClient: Prisma.TransactionClient,
    eventData: CreateAuditEventData,
  ) {
    return transactionClient.auditEvent.create({ data: eventData });
  }
}
