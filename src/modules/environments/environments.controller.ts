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

@Controller()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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
