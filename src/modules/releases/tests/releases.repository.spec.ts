import { ApprovalStatus, ReleaseStatus } from 'generated/prisma/enums';

import type { PrismaService } from '@database/prisma.service';
import type { AuditRepository } from '@modules/audit/audit.repository';
import { ReleasesRepository } from '@modules/releases/releases.repository';
import { updateReleaseSelect } from '@modules/releases/releases.select';

type TransactionMock = {
  release: { update: jest.Mock };
  approval: { updateMany: jest.Mock };
  checklistItem: { updateMany: jest.Mock };
  comment: { updateMany: jest.Mock };
  releaseTask: { updateMany: jest.Mock };
};

type PrismaServiceMock = {
  $transaction: jest.Mock;
};

type AuditRepositoryMock = {
  createAuditEvent: jest.Mock;
};

type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>;

const releaseId = 'release-id';
const actorUserId = 'actor-user-id';
const organizationId = 'organization-id';
const projectId = 'project-id';

const requestReviewAuditEvent = {
  organizationId,
  projectId,
  releaseId,
  actorUserId,
  action: 'release.review_requested',
  entityType: 'release',
  entityId: releaseId,
  metadata: {
    fromStatus: ReleaseStatus.DRAFT,
    toStatus: ReleaseStatus.IN_REVIEW,
  },
};

const requestReviewParams = {
  releaseId,
  auditEvent: requestReviewAuditEvent,
};

const reopenAuditEvent = {
  organizationId,
  projectId,
  releaseId,
  actorUserId,
  action: 'release.reopened',
  entityType: 'release',
  entityId: releaseId,
  metadata: {
    fromStatus: ReleaseStatus.REJECTED,
    toStatus: ReleaseStatus.DRAFT,
    approvalsReset: true,
  },
};

const reopenParams = {
  releaseId,
  auditEvent: reopenAuditEvent,
};

const reviewedRelease = {
  id: releaseId,
  version: '1.0.0',
  name: 'Release 1.0.0',
  status: ReleaseStatus.IN_REVIEW,
  projectId,
  environmentId: 'environment-id',
  updatedAt: new Date('2026-07-26T10:00:00.000Z'),
};

const approvedRelease = {
  ...reviewedRelease,
  status: ReleaseStatus.APPROVED,
};

const rejectedRelease = {
  ...reviewedRelease,
  status: ReleaseStatus.REJECTED,
};

const reopenedRelease = {
  id: releaseId,
  version: '1.0.0',
  name: 'Release 1.0.0',
  status: ReleaseStatus.DRAFT,
  projectId: 'project-id',
  environmentId: 'environment-id',
  updatedAt: new Date('2026-07-22T10:00:00.000Z'),
};

const releasedRelease = {
  ...reviewedRelease,
  status: ReleaseStatus.RELEASED,
};

const approveAuditEvent = {
  ...requestReviewAuditEvent,
  action: 'release.approved',
  metadata: {
    fromStatus: ReleaseStatus.IN_REVIEW,
    toStatus: ReleaseStatus.APPROVED,
  },
};

const rejectAuditEvent = {
  ...requestReviewAuditEvent,
  action: 'release.rejected',
  metadata: {
    fromStatus: ReleaseStatus.IN_REVIEW,
    toStatus: ReleaseStatus.REJECTED,
  },
};

const releaseAuditEvent = {
  ...requestReviewAuditEvent,
  action: 'release.released',
  metadata: {
    fromStatus: ReleaseStatus.APPROVED,
    toStatus: ReleaseStatus.RELEASED,
  },
};

const approveParams = { releaseId, auditEvent: approveAuditEvent };
const rejectParams = { releaseId, auditEvent: rejectAuditEvent };
const releaseParams = { releaseId, auditEvent: releaseAuditEvent };

const createTransactionMock = (): TransactionMock => ({
  release: { update: jest.fn() },
  approval: { updateMany: jest.fn() },
  checklistItem: { updateMany: jest.fn() },
  comment: { updateMany: jest.fn() },
  releaseTask: { updateMany: jest.fn() },
});

const createRepository = () => {
  const transaction = createTransactionMock();
  const auditRepository: AuditRepositoryMock = {
    createAuditEvent: jest.fn(),
  };
  const prisma: PrismaServiceMock = {
    $transaction: jest.fn((callback: TransactionCallback) =>
      callback(transaction),
    ),
  };
  const repository = new ReleasesRepository(
    prisma as unknown as PrismaService,
    auditRepository as unknown as AuditRepository,
  );

  return { auditRepository, prisma, repository, transaction };
};

const arrangeSuccessfulReopen = (transaction: TransactionMock) => {
  transaction.release.update.mockResolvedValue(reopenedRelease);
  transaction.approval.updateMany.mockResolvedValue({ count: 2 });
};

const arrangeSuccessfulRequestReview = (
  transaction: TransactionMock,
  auditRepository: AuditRepositoryMock,
) => {
  transaction.release.update.mockResolvedValue(reviewedRelease);
  auditRepository.createAuditEvent.mockResolvedValue({
    id: 'audit-event-id',
  });
};

const auditedTransitionCases = [
  {
    name: 'approve',
    response: approvedRelease,
    auditEvent: approveAuditEvent,
    execute: (repository: ReleasesRepository) =>
      repository.approveRelease(approveParams),
  },
  {
    name: 'reject',
    response: rejectedRelease,
    auditEvent: rejectAuditEvent,
    execute: (repository: ReleasesRepository) =>
      repository.rejectRelease(rejectParams),
  },
  {
    name: 'reopen',
    response: reopenedRelease,
    auditEvent: reopenAuditEvent,
    execute: (repository: ReleasesRepository) =>
      repository.reopenRelease(reopenParams),
  },
  {
    name: 'release',
    response: releasedRelease,
    auditEvent: releaseAuditEvent,
    execute: (repository: ReleasesRepository) =>
      repository.requestRelease(releaseParams),
  },
];

describe('ReleasesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestReview', () => {
    it('returns the reviewed release from the transaction', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      arrangeSuccessfulRequestReview(transaction, auditRepository);

      const result = await repository.requestReview(requestReviewParams);

      expect(result).toEqual(reviewedRelease);
    });

    it('executes the review transition inside a transaction', async () => {
      const { auditRepository, prisma, repository, transaction } =
        createRepository();
      arrangeSuccessfulRequestReview(transaction, auditRepository);

      await repository.requestReview(requestReviewParams);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('conditionally transitions the release from DRAFT to IN_REVIEW', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      arrangeSuccessfulRequestReview(transaction, auditRepository);

      await repository.requestReview(requestReviewParams);

      expect(transaction.release.update).toHaveBeenCalledWith({
        where: {
          id: releaseId,
          deletedAt: null,
          status: ReleaseStatus.DRAFT,
          project: {
            deletedAt: null,
            organization: { deletedAt: null },
          },
        },
        data: { status: ReleaseStatus.IN_REVIEW },
        select: updateReleaseSelect,
      });
    });

    it('creates the review requested event with the transaction client', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      arrangeSuccessfulRequestReview(transaction, auditRepository);

      await repository.requestReview(requestReviewParams);

      expect(auditRepository.createAuditEvent).toHaveBeenCalledWith(
        transaction,
        requestReviewAuditEvent,
      );
    });

    it('creates the audit event after the release transition succeeds', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      arrangeSuccessfulRequestReview(transaction, auditRepository);

      await repository.requestReview(requestReviewParams);

      expect(
        transaction.release.update.mock.invocationCallOrder[0],
      ).toBeLessThan(
        auditRepository.createAuditEvent.mock.invocationCallOrder[0],
      );
    });

    it('does not create an audit event when the release transition fails', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      const error = new Error('Release transition failed');
      transaction.release.update.mockRejectedValue(error);

      await expect(repository.requestReview(requestReviewParams)).rejects.toBe(
        error,
      );
      expect(auditRepository.createAuditEvent).not.toHaveBeenCalled();
    });

    it('propagates an audit event creation failure', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      const error = new Error('Audit event creation failed');
      transaction.release.update.mockResolvedValue(reviewedRelease);
      auditRepository.createAuditEvent.mockRejectedValue(error);

      await expect(repository.requestReview(requestReviewParams)).rejects.toBe(
        error,
      );
    });
  });

  describe('audited lifecycle transitions', () => {
    it.each(auditedTransitionCases)(
      '$name creates exactly one audit event with the transaction client',
      async ({ auditEvent, execute, response }) => {
        const { auditRepository, repository, transaction } = createRepository();
        transaction.release.update.mockResolvedValue(response);

        await execute(repository);

        expect(auditRepository.createAuditEvent.mock.calls).toEqual([
          [transaction, auditEvent],
        ]);
      },
    );

    it.each(auditedTransitionCases)(
      '$name does not create an audit event when the transition fails',
      async ({ execute }) => {
        const { auditRepository, repository, transaction } = createRepository();
        const error = new Error('Release transition failed');
        transaction.release.update.mockRejectedValue(error);

        await expect(execute(repository)).rejects.toBe(error);
        expect(auditRepository.createAuditEvent).not.toHaveBeenCalled();
      },
    );

    it.each(auditedTransitionCases)(
      '$name propagates an audit event creation failure',
      async ({ execute, response }) => {
        const { auditRepository, repository, transaction } = createRepository();
        const error = new Error('Audit event creation failed');
        transaction.release.update.mockResolvedValue(response);
        auditRepository.createAuditEvent.mockRejectedValue(error);

        await expect(execute(repository)).rejects.toBe(error);
      },
    );
  });

  describe('reopenRelease', () => {
    it('returns the reopened release from the transaction', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      const result = await repository.reopenRelease(reopenParams);

      expect(result).toEqual(reopenedRelease);
    });

    it('executes the reopen operation inside a transaction', async () => {
      const { prisma, repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(reopenParams);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('conditionally transitions the release from REJECTED to DRAFT', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(reopenParams);

      expect(transaction.release.update).toHaveBeenCalledWith({
        where: {
          id: releaseId,
          deletedAt: null,
          status: ReleaseStatus.REJECTED,
          environment: {
            deletedAt: null,
            isActive: true,
            project: {
              releases: {
                some: { id: releaseId },
              },
            },
          },
          project: {
            deletedAt: null,
            organization: { deletedAt: null },
          },
        },
        data: { status: ReleaseStatus.DRAFT },
        select: updateReleaseSelect,
      });
    });

    it('resets every approval decision for the release', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(reopenParams);

      expect(transaction.approval.updateMany).toHaveBeenCalledWith({
        where: { releaseId },
        data: {
          status: ApprovalStatus.PENDING,
          decidedAt: null,
          comment: null,
        },
      });
    });

    it('resets approvals after the release transition succeeds', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(reopenParams);

      expect(
        transaction.release.update.mock.invocationCallOrder[0],
      ).toBeLessThan(
        transaction.approval.updateMany.mock.invocationCallOrder[0],
      );
    });

    it('creates the audit event after approval decisions are reset', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(reopenParams);

      expect(
        transaction.approval.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(
        auditRepository.createAuditEvent.mock.invocationCallOrder[0],
      );
    });

    it('does not reset approvals when the release transition fails', async () => {
      const { repository, transaction } = createRepository();
      transaction.release.update.mockRejectedValue(
        new Error('Release update failed'),
      );

      await expect(repository.reopenRelease(reopenParams)).rejects.toThrow(
        'Release update failed',
      );
      expect(transaction.approval.updateMany).not.toHaveBeenCalled();
    });

    it('propagates an approval reset failure from the transaction', async () => {
      const { auditRepository, repository, transaction } = createRepository();
      transaction.release.update.mockResolvedValue(reopenedRelease);
      transaction.approval.updateMany.mockRejectedValue(
        new Error('Approval reset failed'),
      );

      await expect(repository.reopenRelease(reopenParams)).rejects.toThrow(
        'Approval reset failed',
      );
      expect(auditRepository.createAuditEvent).not.toHaveBeenCalled();
    });

    it('does not mutate checklist items, comments, or release tasks', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(reopenParams);

      expect([
        transaction.checklistItem.updateMany.mock.calls.length,
        transaction.comment.updateMany.mock.calls.length,
        transaction.releaseTask.updateMany.mock.calls.length,
      ]).toEqual([0, 0, 0]);
    });
  });
});
