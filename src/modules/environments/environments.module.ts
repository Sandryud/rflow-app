import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';

@Module({
  imports: [PrismaModule],
  providers: [EnvironmentsService],
  controllers: [EnvironmentsController],
})
export class EnvironmentsModule {}
