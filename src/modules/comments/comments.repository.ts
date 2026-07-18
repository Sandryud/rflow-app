import { Injectable } from '@nestjs/common';
import { type Prisma, ReleaseStatus } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { commentSelect } from './comments.select';

type SoftDeleteComment = {
  commentId: string;
  authorUserId?: string;
};

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findReleaseMembership(userId: string, releaseId: string) {
    return this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          deletedAt: null,
          projects: {
            some: {
              deletedAt: null,
              releases: { some: { id: releaseId, deletedAt: null } },
            },
          },
        },
      },
      select: { id: true, role: true },
    });
  }

  async findRelease(releaseId: string) {
    return this.prisma.release.findFirst({
      where: {
        id: releaseId,
        deletedAt: null,
        project: { deletedAt: null, organization: { deletedAt: null } },
      },
      select: { id: true, status: true },
    });
  }

  async createComment(data: Prisma.CommentCreateInput) {
    return this.prisma.comment.create({ data, select: commentSelect });
  }

  async findComments(releaseId: string) {
    return this.prisma.comment.findMany({
      where: {
        releaseId,
        deletedAt: null,
        release: {
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    });
  }

  async findCommentById(commentId: string) {
    return this.prisma.comment.findFirst({
      where: {
        id: commentId,
        deletedAt: null,
        release: {
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      select: {
        id: true,
        releaseId: true,
        authorUserId: true,
        release: {
          select: { status: true },
        },
      },
    });
  }

  async updateComment(commentId: string, userId: string, message: string) {
    return this.prisma.comment.update({
      where: {
        id: commentId,
        authorUserId: userId,
        deletedAt: null,
        release: {
          status: { not: ReleaseStatus.RELEASED },
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      select: commentSelect,
      data: { message },
    });
  }

  async softDeleteComment({ authorUserId, commentId }: SoftDeleteComment) {
    return this.prisma.comment.update({
      where: {
        id: commentId,
        authorUserId,
        deletedAt: null,
        release: {
          status: { not: ReleaseStatus.RELEASED },
          deletedAt: null,
          project: { deletedAt: null, organization: { deletedAt: null } },
        },
      },
      select: commentSelect,
      data: { deletedAt: new Date() },
    });
  }
}
