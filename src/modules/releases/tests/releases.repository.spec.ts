import { ApprovalStatus, ReleaseStatus } from 'generated/prisma/enums';

import type { PrismaService } from '@database/prisma.service';
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

type TransactionCallback = (transaction: TransactionMock) => Promise<unknown>;

const releaseId = 'release-id';

const reopenedRelease = {
  id: releaseId,
  version: '1.0.0',
  name: 'Release 1.0.0',
  status: ReleaseStatus.DRAFT,
  projectId: 'project-id',
  environmentId: 'environment-id',
  updatedAt: new Date('2026-07-22T10:00:00.000Z'),
};

const createTransactionMock = (): TransactionMock => ({
  release: { update: jest.fn() },
  approval: { updateMany: jest.fn() },
  checklistItem: { updateMany: jest.fn() },
  comment: { updateMany: jest.fn() },
  releaseTask: { updateMany: jest.fn() },
});

const createRepository = () => {
  const transaction = createTransactionMock();
  const prisma: PrismaServiceMock = {
    $transaction: jest.fn((callback: TransactionCallback) =>
      callback(transaction),
    ),
  };
  const repository = new ReleasesRepository(prisma as unknown as PrismaService);

  return { prisma, repository, transaction };
};

const arrangeSuccessfulReopen = (transaction: TransactionMock) => {
  transaction.release.update.mockResolvedValue(reopenedRelease);
  transaction.approval.updateMany.mockResolvedValue({ count: 2 });
};

describe('ReleasesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reopenRelease', () => {
    it('returns the reopened release from the transaction', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      const result = await repository.reopenRelease(releaseId);

      expect(result).toEqual(reopenedRelease);
    });

    it('executes the reopen operation inside a transaction', async () => {
      const { prisma, repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(releaseId);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('conditionally transitions the release from REJECTED to DRAFT', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(releaseId);

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

      await repository.reopenRelease(releaseId);

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

      await repository.reopenRelease(releaseId);

      expect(
        transaction.release.update.mock.invocationCallOrder[0],
      ).toBeLessThan(
        transaction.approval.updateMany.mock.invocationCallOrder[0],
      );
    });

    it('does not reset approvals when the release transition fails', async () => {
      const { repository, transaction } = createRepository();
      transaction.release.update.mockRejectedValue(
        new Error('Release update failed'),
      );

      await expect(repository.reopenRelease(releaseId)).rejects.toThrow(
        'Release update failed',
      );
      expect(transaction.approval.updateMany).not.toHaveBeenCalled();
    });

    it('propagates an approval reset failure from the transaction', async () => {
      const { repository, transaction } = createRepository();
      transaction.release.update.mockResolvedValue(reopenedRelease);
      transaction.approval.updateMany.mockRejectedValue(
        new Error('Approval reset failed'),
      );

      await expect(repository.reopenRelease(releaseId)).rejects.toThrow(
        'Approval reset failed',
      );
    });

    it('does not mutate checklist items, comments, or release tasks', async () => {
      const { repository, transaction } = createRepository();
      arrangeSuccessfulReopen(transaction);

      await repository.reopenRelease(releaseId);

      expect([
        transaction.checklistItem.updateMany.mock.calls.length,
        transaction.comment.updateMany.mock.calls.length,
        transaction.releaseTask.updateMany.mock.calls.length,
      ]).toEqual([0, 0, 0]);
    });
  });
});
