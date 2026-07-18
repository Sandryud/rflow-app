import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ReleaseStatus } from 'generated/prisma/enums';

import { ErrorMessage } from '@common/constants/error-message';
import { CommentsPolicy } from './comments.policy';
import { CommentsRepository } from './comments.repository';
import type {
  CommentResponse,
  CreateCommentParams,
  DeleteCommentParams,
  GetCommentsParams,
  GetCommentsResponse,
  UpdateCommentParams,
} from './comments.types';

@Injectable()
export class CommentsService {
  constructor(
    private readonly repository: CommentsRepository,
    private readonly policy: CommentsPolicy,
  ) {}

  async createComment({
    userId,
    dto,
    releaseId,
  }: CreateCommentParams): Promise<CommentResponse> {
    const member = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!member) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const release = await this.repository.findRelease(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    const comment = await this.repository.createComment({
      message: dto.message,
      author: { connect: { id: userId } },
      release: { connect: { id: releaseId } },
    });

    return comment;
  }

  async getComments({
    userId,
    releaseId,
  }: GetCommentsParams): Promise<GetCommentsResponse> {
    const member = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!member) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const release = await this.repository.findRelease(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    const comments = await this.repository.findComments(releaseId);

    return comments;
  }

  async updateComment({
    userId,
    commentId,
    dto,
  }: UpdateCommentParams): Promise<CommentResponse> {
    const comment = await this.repository.findCommentById(commentId);

    if (!comment) {
      throw new NotFoundException('The comment is not defined');
    }

    const member = await this.repository.findReleaseMembership(
      userId,
      comment.releaseId,
    );

    if (!member) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    if (userId !== comment.authorUserId) {
      throw new ForbiddenException('You are not an author this comment');
    }

    if (comment.release.status === ReleaseStatus.RELEASED) {
      throw new ConflictException(
        'Comment cannot be updated when the release status is RELEASED',
      );
    }

    try {
      const updatedComment = await this.repository.updateComment(
        commentId,
        userId,
        dto.message,
      );

      return updatedComment;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Comment can no longer be updated');
      }

      throw error;
    }
  }

  async deleteComment({
    commentId,
    userId,
  }: DeleteCommentParams): Promise<void> {
    const comment = await this.repository.findCommentById(commentId);

    if (!comment) {
      throw new NotFoundException('The comment is not defined');
    }

    const member = await this.repository.findReleaseMembership(
      userId,
      comment.releaseId,
    );

    if (!member) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const release = await this.repository.findRelease(comment.releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (release.status === ReleaseStatus.RELEASED) {
      throw new ConflictException(
        'Comment cannot be deleted when the release status is RELEASED',
      );
    }

    const isAuthor = comment.authorUserId === userId;
    const canModerate = this.policy.canModerateComment(member.role);

    if (!isAuthor && !canModerate) {
      throw new ForbiddenException('You are cannot delete this comment');
    }

    try {
      await this.repository.softDeleteComment({
        authorUserId: isAuthor ? userId : undefined,
        commentId,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Comment can no longer be deleted');
      }

      throw error;
    }
  }
}
