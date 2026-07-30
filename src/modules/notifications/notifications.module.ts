import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { NotificationsRepository } from './notifications.repository';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsRepository],
})
export class NotificationsModule {}
