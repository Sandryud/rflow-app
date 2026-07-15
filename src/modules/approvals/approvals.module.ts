import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsPolicy } from './approvals.policy';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsPolicy, ApprovalsRepository],
})
export class ApprovalsModule {}
