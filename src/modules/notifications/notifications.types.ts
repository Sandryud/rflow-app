import type { Prisma } from 'generated/prisma/client';

import type { notificationSelect } from './notifications.select';

export type NotificationResponse = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export type GetNotificationsParams = {
  userId: string;
  limit: number;
  cursor?: string;
  unreadOnly: boolean;
};

export type GetNotificationsResponse = {
  items: NotificationResponse[];
  nextCursor: string | null;
  unreadCount: number;
};

export type CreateNotificationData = Pick<
  Prisma.NotificationUncheckedCreateInput,
  | 'recipientUserId'
  | 'organizationId'
  | 'projectId'
  | 'releaseId'
  | 'type'
  | 'title'
  | 'message'
  | 'metadata'
>;
