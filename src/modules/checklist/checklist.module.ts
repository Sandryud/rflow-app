import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { ChecklistController } from './checklist.controller';
import { ChecklistPolicy } from './checklist.policy';
import { ChecklistRepository } from './checklist.repository';
import { ChecklistItemService } from './checklist.service';

@Module({
  imports: [PrismaModule],
  providers: [ChecklistItemService, ChecklistRepository, ChecklistPolicy],
  controllers: [ChecklistController],
})
export class ChecklistModule {}
