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
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { EnvironmentsService } from './environments.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get('/projects/:projectId/environments')
  async getEnvironments(
    @Req() req: RequestWithUserType,
    @Param('projectId') projectId: string,
  ) {
    return this.environmentsService.getEnvironments({
      userId: req.user.userId,
      projectId,
    });
  }

  @Post('/projects/:projectId/environments')
  async createEnvironment(
    @Req() req: RequestWithUserType,
    @Param('projectId') projectId: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.environmentsService.createEnvironment({
      userId: req.user.userId,
      projectId,
      dto,
    });
  }
}
