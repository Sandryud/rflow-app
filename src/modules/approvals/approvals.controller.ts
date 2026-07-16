import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { RequestWithUserType } from '@common/types/request.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { RejectApprovalDto } from './dto/reject-approval.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('/releases/:releaseId/approvals')
  createApproval(
    @Req() req: RequestWithUserType,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
    @Body() dto: CreateApprovalDto,
  ) {
    return this.approvalsService.createApproval({
      userId: req.user.userId,
      releaseId,
      dto,
    });
  }

  @Get('/releases/:releaseId/approvals')
  getApprovals(
    @Req() req: RequestWithUserType,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
  ) {
    return this.approvalsService.getApprovals({
      userId: req.user.userId,
      releaseId,
    });
  }

  @Patch('/approvals/:approvalId/approve')
  approveApproval(
    @Req() req: RequestWithUserType,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
  ) {
    return this.approvalsService.approveApproval({
      userId: req.user.userId,
      approvalId,
    });
  }

  @Patch('/approvals/:approvalId/reject')
  rejectApproval(
    @Req() req: RequestWithUserType,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body() dto: RejectApprovalDto,
  ) {
    return this.approvalsService.rejectApproval({
      userId: req.user.userId,
      approvalId,
      dto,
    });
  }

  @Patch('/approvals/:approvalId/revoke')
  revokeApproval(
    @Req() req: RequestWithUserType,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
  ) {
    return this.approvalsService.revokeApproval({
      userId: req.user.userId,
      approvalId,
    });
  }

  @Delete('/approvals/:approvalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteApproval(
    @Req() req: RequestWithUserType,
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
  ) {
    return this.approvalsService.deleteApproval({
      userId: req.user.userId,
      approvalId,
    });
  }
}
