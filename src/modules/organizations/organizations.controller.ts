import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { RequestWithUserType } from '@common/types/request.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('/organizations')
  async getOrganizations(@Req() req: RequestWithUserType) {
    return this.organizationsService.getOrganizations(req.user.userId);
  }

  @Post('/organizations')
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @Req() req: RequestWithUserType,
  ) {
    const userId = req.user.userId;
    return this.organizationsService.createOrganization({
      dto,
      userId,
    });
  }
}
