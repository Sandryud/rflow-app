import { Module } from '@nestjs/common';

import { PrismaModule } from '@database/prisma.module';
import { ReleasesController } from './releases.controller';
import { ReleasesPolicy } from './releases.policy';
import { ReleasesRepository } from './releases.repository';
import { ReleasesService } from './releases.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReleasesController],
  providers: [ReleasesService, ReleasesRepository, ReleasesPolicy],
})
export class ReleasesModule {}
