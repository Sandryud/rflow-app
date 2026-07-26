import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { RequestWithUserType } from '@common/types/request.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { AuditService } from './audit.service';
import { GetAuditEventsQueryDto } from './dto/get-audit-events-query.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('/releases/:releaseId/audit-events')
  async getReleaseAuditEvents(
    @Req() req: RequestWithUserType,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
    @Query() query: GetAuditEventsQueryDto,
  ) {
    return this.service.getReleaseAuditEvents({
      userId: req.user.userId,
      releaseId,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
