import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  ApprovalStatus,
  ChecklistItemStatus,
  MembershipRole,
  ReleaseStatus,
} from 'generated/prisma/enums';

import type { ReleasesPolicy } from '@modules/releases/releases.policy';
import type { ReleasesRepository } from '@modules/releases/releases.repository';
import { ReleasesService } from '@modules/releases/releases.service';

type ReleasesRepositoryMock = {
  findReleaseMembership: jest.Mock;
  findReleaseRequestReviewContext: jest.Mock;
  findReleaseReviewDecisionContext: jest.Mock;
  findActiveEnvironment: jest.Mock;
  requestReview: jest.Mock;
  approveRelease: jest.Mock;
  rejectRelease: jest.Mock;
  reopenRelease: jest.Mock;
};

type ReleasesPolicyMock = {
  assertCanRequestReview: jest.Mock;
  assertCanDecideRelease: jest.Mock;
};

const userId = 'user-id';
const creatorUserId = 'creator-user-id';
const releaseId = 'release-id';

const membership = {
  id: 'membership-id',
  role: MembershipRole.OWNER,
};

type ApprovalFixture = {
  reviewerUserId: string;
  status: ApprovalStatus;
};

type ReleaseContextFixture = {
  id: string;
  status: ReleaseStatus;
  createdByUserId: string;
  projectId: string;
  environmentId: string;
  approvals: ApprovalFixture[];
};

type ReviewDecisionContextFixture = {
  projectId: string;
  environmentId: string;
  status: ReleaseStatus;
  approvals: Array<{ id: string; status: ApprovalStatus }>;
  checkListItems: Array<{ status: ChecklistItemStatus }>;
};

const pendingApproval: ApprovalFixture = {
  reviewerUserId: userId,
  status: ApprovalStatus.PENDING,
};

const releaseContext: ReleaseContextFixture = {
  id: releaseId,
  status: ReleaseStatus.DRAFT,
  createdByUserId: creatorUserId,
  projectId: 'project-id',
  environmentId: 'environment-id',
  approvals: [pendingApproval],
};

const updatedRelease = {
  id: releaseId,
  version: '1.0.0',
  name: 'Release 1.0.0',
  status: ReleaseStatus.IN_REVIEW,
  projectId: 'project-id',
  environmentId: 'environment-id',
  updatedAt: new Date('2026-07-19T10:00:00.000Z'),
};

const reviewDecisionContext: ReviewDecisionContextFixture = {
  projectId: 'project-id',
  environmentId: 'environment-id',
  status: ReleaseStatus.IN_REVIEW,
  approvals: [
    {
      id: 'approval-id',
      status: ApprovalStatus.APPROVED,
    },
  ],
  checkListItems: [{ status: ChecklistItemStatus.DONE }],
};

const approvedRelease = {
  ...updatedRelease,
  status: ReleaseStatus.APPROVED,
  updatedAt: new Date('2026-07-20T10:00:00.000Z'),
};

const rejectedRelease = {
  ...updatedRelease,
  status: ReleaseStatus.REJECTED,
  updatedAt: new Date('2026-07-21T10:00:00.000Z'),
};

const reopenedRelease = {
  ...updatedRelease,
  status: ReleaseStatus.DRAFT,
  updatedAt: new Date('2026-07-22T10:00:00.000Z'),
};

const activeEnvironment = {
  id: 'environment-id',
  projectId: 'project-id',
  isActive: true,
  deletedAt: null,
};

const requestReviewParams = { releaseId, userId };
const approveReleaseParams = { releaseId, userId };
const rejectReleaseParams = { releaseId, userId };
const reopenReleaseParams = { releaseId, userId };

const createReleaseContext = (
  overrides: Partial<typeof releaseContext> = {},
) => ({
  ...releaseContext,
  ...overrides,
});

const createReviewDecisionContext = (
  overrides: Partial<ReviewDecisionContextFixture> = {},
): ReviewDecisionContextFixture => ({
  ...reviewDecisionContext,
  ...overrides,
});

const createReleasesRepositoryMock = (): ReleasesRepositoryMock => ({
  findReleaseMembership: jest.fn(),
  findReleaseRequestReviewContext: jest.fn(),
  findReleaseReviewDecisionContext: jest.fn(),
  findActiveEnvironment: jest.fn(),
  requestReview: jest.fn(),
  approveRelease: jest.fn(),
  rejectRelease: jest.fn(),
  reopenRelease: jest.fn(),
});

const createReleasesPolicyMock = (): ReleasesPolicyMock => ({
  assertCanRequestReview: jest.fn(),
  assertCanDecideRelease: jest.fn(),
});

const createService = () => {
  const repository = createReleasesRepositoryMock();
  const policy = createReleasesPolicyMock();
  const service = new ReleasesService(
    repository as unknown as ReleasesRepository,
    policy as unknown as ReleasesPolicy,
  );

  return { policy, repository, service };
};

const arrangeReadyRelease = (
  repository: ReleasesRepositoryMock,
  context = releaseContext,
) => {
  repository.findReleaseMembership.mockResolvedValue(membership);
  repository.findReleaseRequestReviewContext.mockResolvedValue(context);
  repository.requestReview.mockResolvedValue(updatedRelease);
};

const arrangeApprovableRelease = (
  repository: ReleasesRepositoryMock,
  context = reviewDecisionContext,
) => {
  repository.findReleaseMembership.mockResolvedValue(membership);
  repository.findReleaseReviewDecisionContext.mockResolvedValue(context);
  repository.approveRelease.mockResolvedValue(approvedRelease);
};

const arrangeRejectableRelease = (
  repository: ReleasesRepositoryMock,
  context = createReviewDecisionContext({
    approvals: [
      {
        id: 'approval-id',
        status: ApprovalStatus.REJECTED,
      },
    ],
  }),
) => {
  repository.findReleaseMembership.mockResolvedValue(membership);
  repository.findReleaseReviewDecisionContext.mockResolvedValue(context);
  repository.rejectRelease.mockResolvedValue(rejectedRelease);
};

const arrangeReopenableRelease = (repository: ReleasesRepositoryMock) => {
  repository.findReleaseMembership.mockResolvedValue(membership);
  repository.findReleaseReviewDecisionContext.mockResolvedValue(
    createReviewDecisionContext({ status: ReleaseStatus.REJECTED }),
  );
  repository.findActiveEnvironment.mockResolvedValue(activeEnvironment);
  repository.reopenRelease.mockResolvedValue(reopenedRelease);
};

const createP2025Error = () =>
  new Prisma.PrismaClientKnownRequestError('Conditional update failed', {
    code: 'P2025',
    clientVersion: 'test',
  });

describe('ReleasesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestReview', () => {
    it('returns the release transitioned from DRAFT to IN_REVIEW', async () => {
      const { repository, service } = createService();
      arrangeReadyRelease(repository);

      const result = await service.requestReview(requestReviewParams);

      expect(result).toEqual(updatedRelease);
    });

    it('requests the status transition for the selected release', async () => {
      const { repository, service } = createService();
      arrangeReadyRelease(repository);

      await service.requestReview(requestReviewParams);

      expect(repository.requestReview).toHaveBeenCalledWith(releaseId);
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.requestReview).not.toHaveBeenCalled();
    });

    it.each([
      MembershipRole.DEVELOPER,
      MembershipRole.QA,
      MembershipRole.VIEWER,
    ])('forbids a %s from requesting release review', async (role) => {
      const { policy, repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue({
        ...membership,
        role,
      });
      policy.assertCanRequestReview.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.requestReview).not.toHaveBeenCalled();
    });

    it('returns not found when the release context is unavailable', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseRequestReviewContext.mockResolvedValue(null);

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.requestReview).not.toHaveBeenCalled();
    });

    it('returns conflict when the release is not in DRAFT status', async () => {
      const { repository, service } = createService();
      arrangeReadyRelease(
        repository,
        createReleaseContext({ status: ReleaseStatus.IN_REVIEW }),
      );

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.requestReview).not.toHaveBeenCalled();
    });

    it('returns conflict when the release has no approvals', async () => {
      const { repository, service } = createService();
      arrangeReadyRelease(repository, createReleaseContext({ approvals: [] }));

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.requestReview).not.toHaveBeenCalled();
    });

    it('returns conflict when the release creator is the only reviewer', async () => {
      const { repository, service } = createService();
      arrangeReadyRelease(
        repository,
        createReleaseContext({
          approvals: [
            {
              reviewerUserId: creatorUserId,
              status: ApprovalStatus.PENDING,
            },
          ],
        }),
      );

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.requestReview).not.toHaveBeenCalled();
    });

    it.each([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED])(
      'returns conflict when an approval is %s',
      async (status) => {
        const { repository, service } = createService();
        arrangeReadyRelease(
          repository,
          createReleaseContext({
            approvals: [{ ...pendingApproval, status }],
          }),
        );

        await expect(
          service.requestReview(requestReviewParams),
        ).rejects.toThrow(ConflictException);
        expect(repository.requestReview).not.toHaveBeenCalled();
      },
    );

    it('maps a concurrent Prisma update failure to ConflictException', async () => {
      const { repository, service } = createService();
      arrangeReadyRelease(repository);
      repository.requestReview.mockRejectedValue(createP2025Error());

      await expect(service.requestReview(requestReviewParams)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows an unexpected repository error', async () => {
      const { repository, service } = createService();
      const error = new Error('Database unavailable');
      arrangeReadyRelease(repository);
      repository.requestReview.mockRejectedValue(error);

      await expect(service.requestReview(requestReviewParams)).rejects.toBe(
        error,
      );
    });
  });

  describe('requestApprove', () => {
    it('returns the release transitioned from IN_REVIEW to APPROVED', async () => {
      const { repository, service } = createService();
      arrangeApprovableRelease(repository);

      const result = await service.requestApprove(approveReleaseParams);

      expect(result).toEqual(approvedRelease);
    });

    it('approves the selected release', async () => {
      const { repository, service } = createService();
      arrangeApprovableRelease(repository);

      await service.requestApprove(approveReleaseParams);

      expect(repository.approveRelease).toHaveBeenCalledWith(releaseId);
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(
        service.requestApprove(approveReleaseParams),
      ).rejects.toThrow(NotFoundException);
      expect(repository.approveRelease).not.toHaveBeenCalled();
    });

    it.each([
      MembershipRole.DEVELOPER,
      MembershipRole.QA,
      MembershipRole.VIEWER,
    ])('forbids a %s from approving a release', async (role) => {
      const { policy, repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue({
        ...membership,
        role,
      });
      policy.assertCanDecideRelease.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(
        service.requestApprove(approveReleaseParams),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.approveRelease).not.toHaveBeenCalled();
    });

    it('returns not found when the release context is unavailable', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseReviewDecisionContext.mockResolvedValue(null);

      await expect(
        service.requestApprove(approveReleaseParams),
      ).rejects.toThrow(NotFoundException);
      expect(repository.approveRelease).not.toHaveBeenCalled();
    });

    it('returns conflict when the release is not in IN_REVIEW status', async () => {
      const { repository, service } = createService();
      arrangeApprovableRelease(
        repository,
        createReviewDecisionContext({ status: ReleaseStatus.DRAFT }),
      );

      await expect(
        service.requestApprove(approveReleaseParams),
      ).rejects.toThrow(ConflictException);
      expect(repository.approveRelease).not.toHaveBeenCalled();
    });

    it.each([ChecklistItemStatus.TODO, ChecklistItemStatus.BLOCKED])(
      'returns conflict when a required checklist item is %s',
      async (status) => {
        const { repository, service } = createService();
        arrangeApprovableRelease(
          repository,
          createReviewDecisionContext({ checkListItems: [{ status }] }),
        );

        await expect(
          service.requestApprove(approveReleaseParams),
        ).rejects.toThrow(ConflictException);
        expect(repository.approveRelease).not.toHaveBeenCalled();
      },
    );

    it.each([ApprovalStatus.PENDING, ApprovalStatus.REJECTED])(
      'returns conflict when an approval is %s',
      async (status) => {
        const { repository, service } = createService();
        arrangeApprovableRelease(
          repository,
          createReviewDecisionContext({
            approvals: [{ id: 'approval-id', status }],
          }),
        );

        await expect(
          service.requestApprove(approveReleaseParams),
        ).rejects.toThrow(ConflictException);
        expect(repository.approveRelease).not.toHaveBeenCalled();
      },
    );

    it('returns conflict when the release has no approved decisions', async () => {
      const { repository, service } = createService();
      arrangeApprovableRelease(
        repository,
        createReviewDecisionContext({ approvals: [] }),
      );

      await expect(
        service.requestApprove(approveReleaseParams),
      ).rejects.toThrow(ConflictException);
      expect(repository.approveRelease).not.toHaveBeenCalled();
    });

    it('maps a concurrent Prisma update failure to ConflictException', async () => {
      const { repository, service } = createService();
      arrangeApprovableRelease(repository);
      repository.approveRelease.mockRejectedValue(createP2025Error());

      await expect(
        service.requestApprove(approveReleaseParams),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows an unexpected repository error', async () => {
      const { repository, service } = createService();
      const error = new Error('Database unavailable');
      arrangeApprovableRelease(repository);
      repository.approveRelease.mockRejectedValue(error);

      await expect(service.requestApprove(approveReleaseParams)).rejects.toBe(
        error,
      );
    });
  });

  describe('requestReject', () => {
    it('returns the release transitioned from IN_REVIEW to REJECTED', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(repository);

      const result = await service.requestReject(rejectReleaseParams);

      expect(result).toEqual(rejectedRelease);
    });

    it('rejects the selected release', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(repository);

      await service.requestReject(rejectReleaseParams);

      expect(repository.rejectRelease).toHaveBeenCalledWith(releaseId);
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.requestReject(rejectReleaseParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.rejectRelease).not.toHaveBeenCalled();
    });

    it.each([
      MembershipRole.DEVELOPER,
      MembershipRole.QA,
      MembershipRole.VIEWER,
    ])('forbids a %s from rejecting a release', async (role) => {
      const { policy, repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue({
        ...membership,
        role,
      });
      policy.assertCanDecideRelease.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(service.requestReject(rejectReleaseParams)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.rejectRelease).not.toHaveBeenCalled();
    });

    it('returns not found when the release context is unavailable', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseReviewDecisionContext.mockResolvedValue(null);

      await expect(service.requestReject(rejectReleaseParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.rejectRelease).not.toHaveBeenCalled();
    });

    it('returns conflict when the release is not in IN_REVIEW status', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(
        repository,
        createReviewDecisionContext({
          status: ReleaseStatus.DRAFT,
          approvals: [{ id: 'approval-id', status: ApprovalStatus.REJECTED }],
        }),
      );

      await expect(service.requestReject(rejectReleaseParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.rejectRelease).not.toHaveBeenCalled();
    });

    it('returns conflict when the release has no rejected approval', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(
        repository,
        createReviewDecisionContext({
          approvals: [{ id: 'approval-id', status: ApprovalStatus.APPROVED }],
        }),
      );

      await expect(service.requestReject(rejectReleaseParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.rejectRelease).not.toHaveBeenCalled();
    });

    it('allows pending approvals when a rejected approval exists', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(
        repository,
        createReviewDecisionContext({
          approvals: [
            { id: 'rejected-id', status: ApprovalStatus.REJECTED },
            { id: 'pending-id', status: ApprovalStatus.PENDING },
          ],
        }),
      );

      const result = await service.requestReject(rejectReleaseParams);

      expect(result).toEqual(rejectedRelease);
    });

    it('does not require completed checklist items to reject a release', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(
        repository,
        createReviewDecisionContext({
          approvals: [{ id: 'approval-id', status: ApprovalStatus.REJECTED }],
          checkListItems: [{ status: ChecklistItemStatus.BLOCKED }],
        }),
      );

      const result = await service.requestReject(rejectReleaseParams);

      expect(result).toEqual(rejectedRelease);
    });

    it('maps a concurrent Prisma update failure to ConflictException', async () => {
      const { repository, service } = createService();
      arrangeRejectableRelease(repository);
      repository.rejectRelease.mockRejectedValue(createP2025Error());

      await expect(service.requestReject(rejectReleaseParams)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows an unexpected repository error', async () => {
      const { repository, service } = createService();
      const error = new Error('Database unavailable');
      arrangeRejectableRelease(repository);
      repository.rejectRelease.mockRejectedValue(error);

      await expect(service.requestReject(rejectReleaseParams)).rejects.toBe(
        error,
      );
    });
  });

  describe('requestReopen', () => {
    it('returns the release transitioned from REJECTED to DRAFT', async () => {
      const { repository, service } = createService();
      arrangeReopenableRelease(repository);

      const result = await service.requestReopen(reopenReleaseParams);

      expect(result).toEqual(reopenedRelease);
    });

    it('reopens the selected release', async () => {
      const { repository, service } = createService();
      arrangeReopenableRelease(repository);

      await service.requestReopen(reopenReleaseParams);

      expect(repository.reopenRelease).toHaveBeenCalledWith(releaseId);
    });

    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.reopenRelease).not.toHaveBeenCalled();
    });

    it.each([
      MembershipRole.DEVELOPER,
      MembershipRole.QA,
      MembershipRole.VIEWER,
    ])('forbids a %s from reopening a release', async (role) => {
      const { policy, repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue({
        ...membership,
        role,
      });
      policy.assertCanDecideRelease.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.reopenRelease).not.toHaveBeenCalled();
    });

    it('returns not found when the release context is unavailable', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseReviewDecisionContext.mockResolvedValue(null);

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.reopenRelease).not.toHaveBeenCalled();
    });

    it('returns conflict when the release is not REJECTED', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseReviewDecisionContext.mockResolvedValue(
        createReviewDecisionContext({ status: ReleaseStatus.IN_REVIEW }),
      );

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.reopenRelease).not.toHaveBeenCalled();
    });

    it('returns not found when the environment is unavailable', async () => {
      const { repository, service } = createService();
      arrangeReopenableRelease(repository);
      repository.findActiveEnvironment.mockResolvedValue(null);

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.reopenRelease).not.toHaveBeenCalled();
    });

    it('checks the release environment in its project', async () => {
      const { repository, service } = createService();
      arrangeReopenableRelease(repository);

      await service.requestReopen(reopenReleaseParams);

      expect(repository.findActiveEnvironment).toHaveBeenCalledWith(
        'project-id',
        'environment-id',
      );
    });

    it('maps a concurrent Prisma update failure to ConflictException', async () => {
      const { repository, service } = createService();
      arrangeReopenableRelease(repository);
      repository.reopenRelease.mockRejectedValue(createP2025Error());

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows an unexpected repository error', async () => {
      const { repository, service } = createService();
      const error = new Error('Database unavailable');
      arrangeReopenableRelease(repository);
      repository.reopenRelease.mockRejectedValue(error);

      await expect(service.requestReopen(reopenReleaseParams)).rejects.toBe(
        error,
      );
    });
  });
});
