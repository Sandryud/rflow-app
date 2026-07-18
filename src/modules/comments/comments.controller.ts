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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get('/releases/:releaseId/comments')
  async getComments(
    @Req() req: RequestWithUserType,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
  ) {
    return this.service.getComments({ userId: req.user.userId, releaseId });
  }

  @Post('/releases/:releaseId/comments')
  async createComment(
    @Body() dto: CreateCommentDto,
    @Req() req: RequestWithUserType,
    @Param('releaseId', ParseUUIDPipe) releaseId: string,
  ) {
    return this.service.createComment({
      dto,
      releaseId,
      userId: req.user.userId,
    });
  }

  @Patch('/comments/:commentId')
  async updateComment(
    @Req() req: RequestWithUserType,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.service.updateComment({
      commentId,
      dto,
      userId: req.user.userId,
    });
  }

  @Delete('/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Req() req: RequestWithUserType,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.service.deleteComment({ commentId, userId: req.user.userId });
  }
}
