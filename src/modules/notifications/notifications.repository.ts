import { Injectable } from '@nestjs/common';

import type { CursorParams } from '@common/pagination/cursor';
import { PrismaService } from '@database/prisma.service';
import { notificationSelect } from './notifications.select';

type NotificationByRecipientParams = {
  recipientUserId: string;
  limit: number;
  unreadOnly: boolean;
  cursor?: CursorParams;
};

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByRecipient({
    recipientUserId,
    limit,
    cursor,
    unreadOnly,
  }: NotificationByRecipientParams) {
    return this.prisma.notification.findMany({
      where: {
        recipientUserId,
        ...(unreadOnly && {
          readAt: null,
        }),
        ...(cursor && {
          OR: [
            {
              createdAt: {
                lt: cursor.createdAt,
              },
            },
            {
              createdAt: cursor.createdAt,
              id: {
                lt: cursor.id,
              },
            },
          ],
        }),
      },
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: notificationSelect,
    });
  }

  countUnreadNotifications(recipientUserId: string) {
    return this.prisma.notification.count({
      where: { recipientUserId, readAt: null },
    });
  }
}
