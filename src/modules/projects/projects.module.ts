import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { ProjectsController } from './projects.controller';
import { ProjectsPolicy } from './projects.policy';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, ProjectsPolicy],
})
export class ProjectsModule {}
