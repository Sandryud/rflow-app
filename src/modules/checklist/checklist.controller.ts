import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RequestWithUserType } from '@common/types/request.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { ChecklistItemService } from './checklist.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemStatusDto } from './dto/update-checklist-item-status.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ChecklistController {
  constructor(private readonly service: ChecklistItemService) {}

  @Get('/releases/:releaseId/checklist-items')
  async getChecklistItems(
    @Req() req: RequestWithUserType,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
  ) {
    return this.service.getChecklistItems({
      userId: req.user.userId,
      releaseId,
    });
  }

  @Post('/releases/:releaseId/checklist-items')
  async createChecklistItem(
    @Req() req: RequestWithUserType,
    @Body() dto: CreateChecklistItemDto,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
  ) {
    return this.service.createChecklistItem({
      dto,
      userId: req.user.userId,
      releaseId,
    });
  }

  @Patch('/checklist-items/:checklistItemId/status')
  async updateChecklistStatus(
    @Req() req: RequestWithUserType,
    @Body() dto: UpdateChecklistItemStatusDto,
    @Param('checklistItemId', ParseUUIDPipe) checklistItemId: string,
  ) {
    return this.service.updateChecklistStatus({
      userId: req.user.userId,
      checklistItemId,
      dto,
    });
  }
}
