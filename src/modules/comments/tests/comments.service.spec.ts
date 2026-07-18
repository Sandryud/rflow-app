import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { MembershipRole, ReleaseStatus } from 'generated/prisma/enums';

import type { CommentsPolicy } from '@modules/comments/comments.policy';
import type { CommentsRepository } from '@modules/comments/comments.repository';
import { CommentsService } from '@modules/comments/comments.service';

type CommentsRepositoryMock = {
  findReleaseMembership: jest.Mock;
  findRelease: jest.Mock;
  createComment: jest.Mock;
  findComments: jest.Mock;
  findCommentById: jest.Mock;
  updateComment: jest.Mock;
  softDeleteComment: jest.Mock;
};

type CommentsPolicyMock = {
  canModerateComment: jest.Mock;
};

const userId = 'user-id';
const anotherUserId = 'another-user-id';
const releaseId = 'release-id';
const commentId = 'comment-id';

const membership = {
  id: 'membership-id',
  role: MembershipRole.DEVELOPER,
};

const activeRelease = {
  id: releaseId,
  status: ReleaseStatus.DRAFT,
};

const releasedRelease = {
  id: releaseId,
  status: ReleaseStatus.RELEASED,
};

const comment = {
  id: commentId,
  releaseId,
  authorUserId: userId,
  release: { status: ReleaseStatus.DRAFT },
};

const commentResponse = {
  id: commentId,
  releaseId,
  authorUserId: userId,
  message: 'Comment message',
  createdAt: new Date('2026-07-18T10:00:00.000Z'),
  updatedAt: new Date('2026-07-18T10:00:00.000Z'),
  author: {
    id: userId,
    name: 'Jane Doe',
    email: 'jane@example.com',
  },
};

const updatedCommentResponse = {
  ...commentResponse,
  message: 'Updated message',
  updatedAt: new Date('2026-07-18T11:00:00.000Z'),
};

const createCommentsRepositoryMock = (): CommentsRepositoryMock => ({
  findReleaseMembership: jest.fn(),
  findRelease: jest.fn(),
  createComment: jest.fn(),
  findComments: jest.fn(),
  findCommentById: jest.fn(),
  updateComment: jest.fn(),
  softDeleteComment: jest.fn(),
});

const createCommentsPolicyMock = (): CommentsPolicyMock => ({
  canModerateComment: jest.fn(),
});

const createService = () => {
  const repository = createCommentsRepositoryMock();
  const policy = createCommentsPolicyMock();
  const service = new CommentsService(
    repository as unknown as CommentsRepository,
    policy as unknown as CommentsPolicy,
  );

  return { policy, repository, service };
};

const createParams = {
  userId,
  releaseId,
  dto: { message: 'Comment message' },
};

const getParams = { userId, releaseId };

const updateParams = {
  userId,
  commentId,
  dto: { message: 'Updated message' },
};

const deleteParams = { userId, commentId };

const createP2025Error = () =>
  new Prisma.PrismaClientKnownRequestError('Conditional mutation failed', {
    code: 'P2025',
    clientVersion: 'test',
  });

describe('CommentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createComment', () => {
    it('returns the created comment for an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(activeRelease);
      repository.createComment.mockResolvedValue(commentResponse);

      const result = await service.createComment(createParams);

      expect(result).toEqual(commentResponse);
    });

    it('creates the comment with the current user as author', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(releasedRelease);
      repository.createComment.mockResolvedValue(commentResponse);

      await service.createComment(createParams);

      expect(repository.createComment).toHaveBeenCalledWith({
        message: createParams.dto.message,
        author: { connect: { id: userId } },
        release: { connect: { id: releaseId } },
      });
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.createComment(createParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.createComment).not.toHaveBeenCalled();
    });

    it('returns not found when the release is unavailable', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(null);

      await expect(service.createComment(createParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.createComment).not.toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('returns comments for an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(activeRelease);
      repository.findComments.mockResolvedValue([commentResponse]);

      const result = await service.getComments(getParams);

      expect(result).toEqual([commentResponse]);
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.getComments(getParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findComments).not.toHaveBeenCalled();
    });

    it('returns not found when the release is unavailable', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(null);

      await expect(service.getComments(getParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findComments).not.toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    it('returns the updated comment when the current user is the author', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.updateComment.mockResolvedValue(updatedCommentResponse);

      const result = await service.updateComment(updateParams);

      expect(result).toEqual(updatedCommentResponse);
    });

    it('updates the comment with the current user and DTO message', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.updateComment.mockResolvedValue(updatedCommentResponse);

      await service.updateComment(updateParams);

      expect(repository.updateComment).toHaveBeenCalledWith(
        commentId,
        userId,
        updateParams.dto.message,
      );
    });

    it('returns not found when the comment is unavailable', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(null);

      await expect(service.updateComment(updateParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.updateComment).not.toHaveBeenCalled();
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.updateComment(updateParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.updateComment).not.toHaveBeenCalled();
    });

    it('forbids a manager from updating another user comment', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue({
        ...comment,
        authorUserId: anotherUserId,
      });
      repository.findReleaseMembership.mockResolvedValue({
        ...membership,
        role: MembershipRole.MANAGER,
      });

      await expect(service.updateComment(updateParams)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.updateComment).not.toHaveBeenCalled();
    });

    it('returns conflict when the release status is RELEASED', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue({
        ...comment,
        release: { status: ReleaseStatus.RELEASED },
      });
      repository.findReleaseMembership.mockResolvedValue(membership);

      await expect(service.updateComment(updateParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.updateComment).not.toHaveBeenCalled();
    });

    it('maps a concurrent Prisma update failure to ConflictException', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.updateComment.mockRejectedValue(createP2025Error());

      await expect(service.updateComment(updateParams)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteComment', () => {
    it('soft deletes the comment with an ownership filter when the user is the author', async () => {
      const { policy, repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(activeRelease);
      policy.canModerateComment.mockReturnValue(false);

      await service.deleteComment(deleteParams);

      expect(repository.softDeleteComment).toHaveBeenCalledWith({
        authorUserId: userId,
        commentId,
      });
    });

    it.each([MembershipRole.OWNER, MembershipRole.MANAGER])(
      'allows a %s to soft delete another user comment',
      async (role) => {
        const { policy, repository, service } = createService();
        repository.findCommentById.mockResolvedValue({
          ...comment,
          authorUserId: anotherUserId,
        });
        repository.findReleaseMembership.mockResolvedValue({
          ...membership,
          role,
        });
        repository.findRelease.mockResolvedValue(activeRelease);
        policy.canModerateComment.mockReturnValue(true);

        await service.deleteComment(deleteParams);

        expect(repository.softDeleteComment).toHaveBeenCalledWith({
          authorUserId: undefined,
          commentId,
        });
      },
    );

    it.each([
      MembershipRole.DEVELOPER,
      MembershipRole.QA,
      MembershipRole.VIEWER,
    ])('forbids a %s from deleting another user comment', async (role) => {
      const { policy, repository, service } = createService();
      repository.findCommentById.mockResolvedValue({
        ...comment,
        authorUserId: anotherUserId,
      });
      repository.findReleaseMembership.mockResolvedValue({
        ...membership,
        role,
      });
      repository.findRelease.mockResolvedValue(activeRelease);
      policy.canModerateComment.mockReturnValue(false);

      await expect(service.deleteComment(deleteParams)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not soft delete another user comment without moderator permission', async () => {
      const { policy, repository, service } = createService();
      repository.findCommentById.mockResolvedValue({
        ...comment,
        authorUserId: anotherUserId,
      });
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(activeRelease);
      policy.canModerateComment.mockReturnValue(false);

      await service.deleteComment(deleteParams).catch(() => undefined);

      expect(repository.softDeleteComment).not.toHaveBeenCalled();
    });

    it('returns not found when the comment is unavailable', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(null);

      await expect(service.deleteComment(deleteParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDeleteComment).not.toHaveBeenCalled();
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.deleteComment(deleteParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDeleteComment).not.toHaveBeenCalled();
    });

    it('returns not found when the release is unavailable', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(null);

      await expect(service.deleteComment(deleteParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDeleteComment).not.toHaveBeenCalled();
    });

    it('returns conflict when the release status is RELEASED', async () => {
      const { repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(releasedRelease);

      await expect(service.deleteComment(deleteParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.softDeleteComment).not.toHaveBeenCalled();
    });

    it('maps a concurrent Prisma soft delete failure to ConflictException', async () => {
      const { policy, repository, service } = createService();
      repository.findCommentById.mockResolvedValue(comment);
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findRelease.mockResolvedValue(activeRelease);
      policy.canModerateComment.mockReturnValue(false);
      repository.softDeleteComment.mockRejectedValue(createP2025Error());

      await expect(service.deleteComment(deleteParams)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
