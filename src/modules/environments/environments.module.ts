import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsPolicy } from './environments.policy';
import { EnvironmentsRepository } from './environments.repository';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [PrismaModule],
  providers: [EnvironmentsService, EnvironmentsRepository, EnvironmentsPolicy],
  controllers: [EnvironmentsController],
})
export class EnvironmentsModule {}
