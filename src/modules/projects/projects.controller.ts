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
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('/organizations/:organizationId/projects')
  async getProjects(
    @Req() req: RequestWithUserType,
    @Param('organizationId') organizationId: string,
  ) {
    return this.projectsService.getProjects({
      userId: req.user.userId,
      organizationId,
    });
  }

  @Post('/organizations/:organizationId/projects')
  async createProject(
    @Body() dto: CreateProjectDto,
    @Param('organizationId') organizationId: string,
    @Req() req: RequestWithUserType,
  ) {
    return this.projectsService.createProject({
      userId: req.user.userId,
      dto,
      organizationId,
    });
  }
}
