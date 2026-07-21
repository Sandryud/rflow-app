import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RequestWithUserType } from '@common/types/request.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { CreateReleaseDto, CreateReleaseTaskDto } from './dto/releases.dto';
import { ReleasesService } from './releases.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get('/releases/:releaseId')
  async getRelease(
    @Req() req: RequestWithUserType,
    @Param('releaseId') releaseId: string,
  ) {
    return this.releasesService.getRelease({
      userId: req.user.userId,
      releaseId,
    });
  }

  @Get('/projects/:projectId/releases')
  async getProjectReleases(
    @Req() req: RequestWithUserType,
    @Param('projectId') projectId: string,
  ) {
    return this.releasesService.getProjectReleases({
      userId: req.user.userId,
      projectId,
    });
  }

  @Post('/projects/:projectId/releases')
  async createProjectRelease(
    @Req() req: RequestWithUserType,
    @Body() dto: CreateReleaseDto,
    @Param('projectId') projectId: string,
  ) {
    return this.releasesService.createRelease({
      dto,
      userId: req.user.userId,
      projectId,
    });
  }

  @Post('/releases/:releaseId/release-tasks')
  async createReleaseTask(
    @Param('releaseId') releaseId: string,
    @Body() dto: CreateReleaseTaskDto,
    @Req() req: RequestWithUserType,
  ) {
    return this.releasesService.createReleaseTask({
      dto,
      releaseId,
      userId: req.user.userId,
    });
  }

  @Get('/releases/:releaseId/release-tasks')
  async getReleaseTasks(
    @Param('releaseId') releaseId: string,
    @Req() req: RequestWithUserType,
  ) {
    return this.releasesService.getReleaseTasks({
      releaseId,
      userId: req.user.userId,
    });
  }

  @Post('/releases/:releaseId/request-review')
  async requestReview(
    @Param('releaseId') releaseId: string,
    @Req() req: RequestWithUserType,
  ) {
    return this.releasesService.requestReview({
      releaseId,
      userId: req.user.userId,
    });
  }

  @Post('/releases/:releaseId/approve')
  async requestApprove(
    @Param('releaseId') releaseId: string,
    @Req() req: RequestWithUserType,
  ) {
    return this.releasesService.requestApprove({
      releaseId,
      userId: req.user.userId,
    });
  }

  // @Post('/releases/:releaseId/reject')
  // async requestReject(
  //   @Param('releaseId') releaseId: string,
  //   @Req() req: RequestWithUserType,
  // ) {
  //   return this.releasesService.requestReject({
  //     releaseId,
  //     userId: req.user.userId,
  //   });
  // }
}
