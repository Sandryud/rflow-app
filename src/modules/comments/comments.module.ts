import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { CommentsController } from './comments.controller';
import { CommentsPolicy } from './comments.policy';
import { CommentsRepository } from './comments.repository';
import { CommentsService } from './comments.service';

@Module({
  imports: [PrismaModule],
  providers: [CommentsRepository, CommentsPolicy, CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
