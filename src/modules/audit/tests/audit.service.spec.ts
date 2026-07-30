import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

import { decodeCursor, encodeCursor } from '@common/pagination/cursor';
import type { AuditRepository } from '@modules/audit/audit.repository';
import { AuditService } from '@modules/audit/audit.service';
import type { AuditEventResponse } from '@modules/audit/audit.types';

type AuditRepositoryMock = {
  findReleaseMembership: jest.Mock;
  findReleaseEventsPage: jest.Mock;
};

const userId = 'user-id';
const releaseId = 'release-id';

const membership = {
  id: 'membership-id',
  role: MembershipRole.VIEWER,
};

const getEventsParams = {
  userId,
  releaseId,
  limit: 2,
};

const baseAuditEvent: AuditEventResponse = {
  id: 'event-a',
  organizationId: 'organization-id',
  projectId: 'project-id',
  releaseId,
  action: 'release.review_requested',
  entityType: 'release',
  entityId: releaseId,
  metadata: {
    fromStatus: 'DRAFT',
    toStatus: 'IN_REVIEW',
  },
  createdAt: new Date('2026-07-26T10:00:00.000Z'),
  actor: {
    id: userId,
    name: 'Audit Actor',
    email: 'actor@example.com',
  },
};

const createAuditEvent = (
  overrides: Partial<AuditEventResponse> = {},
): AuditEventResponse => ({
  ...baseAuditEvent,
  ...overrides,
});

const eventA = createAuditEvent();
const eventB = createAuditEvent({
  id: 'event-b',
  createdAt: new Date('2026-07-26T10:01:00.000Z'),
});
const eventC = createAuditEvent({
  id: 'event-c',
  createdAt: new Date('2026-07-26T10:02:00.000Z'),
});

const createAuditRepositoryMock = (): AuditRepositoryMock => ({
  findReleaseMembership: jest.fn(),
  findReleaseEventsPage: jest.fn(),
});

const createService = () => {
  const repository = createAuditRepositoryMock();
  const service = new AuditService(repository as unknown as AuditRepository);

  return { repository, service };
};

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReleaseAuditEvents', () => {
    it('returns not found when the user is not an organization member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(
        service.getReleaseAuditEvents(getEventsParams),
      ).rejects.toThrow(NotFoundException);
      expect(repository.findReleaseEventsPage).not.toHaveBeenCalled();
    });

    it('returns bad request when the cursor is invalid', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);

      await expect(
        service.getReleaseAuditEvents({
          ...getEventsParams,
          cursor: 'invalid-cursor',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.findReleaseEventsPage).not.toHaveBeenCalled();
    });

    it('returns an empty page when audit events do not exist', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([]);

      const result = await service.getReleaseAuditEvents(getEventsParams);

      expect(result).toEqual({ items: [], nextCursor: null });
    });

    it('returns all events without a next cursor on the last page', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([eventA]);

      const result = await service.getReleaseAuditEvents(getEventsParams);

      expect(result).toEqual({ items: [eventA], nextCursor: null });
    });

    it('returns no next cursor when the number of events equals the limit', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([eventA, eventB]);

      const result = await service.getReleaseAuditEvents(getEventsParams);

      expect(result.nextCursor).toBeNull();
    });

    it('excludes the lookahead event from the current page', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([
        eventA,
        eventB,
        eventC,
      ]);

      const result = await service.getReleaseAuditEvents(getEventsParams);

      expect(result.items).toEqual([eventA, eventB]);
    });

    it('creates the next cursor from the last returned event', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([
        eventA,
        eventB,
        eventC,
      ]);

      const result = await service.getReleaseAuditEvents(getEventsParams);

      expect(decodeCursor(result.nextCursor ?? '')).toEqual({
        id: eventB.id,
        createdAt: eventB.createdAt,
      });
    });

    it('loads the first page without a cursor', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([]);

      await service.getReleaseAuditEvents(getEventsParams);

      expect(repository.findReleaseEventsPage).toHaveBeenCalledWith(
        releaseId,
        getEventsParams.limit,
        undefined,
      );
    });

    it('loads the next page using the decoded cursor', async () => {
      const { repository, service } = createService();
      const cursorData = {
        id: eventA.id,
        createdAt: eventA.createdAt,
      };
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([]);

      await service.getReleaseAuditEvents({
        ...getEventsParams,
        cursor: encodeCursor(cursorData),
      });

      expect(repository.findReleaseEventsPage).toHaveBeenCalledWith(
        releaseId,
        getEventsParams.limit,
        cursorData,
      );
    });

    it('allows a viewer to read release audit events', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockResolvedValue([eventA]);

      const result = await service.getReleaseAuditEvents(getEventsParams);

      expect(result).toEqual({ items: [eventA], nextCursor: null });
    });

    it('propagates an unknown repository error', async () => {
      const { repository, service } = createService();
      const error = new Error('Database unavailable');
      repository.findReleaseMembership.mockResolvedValue(membership);
      repository.findReleaseEventsPage.mockRejectedValue(error);

      await expect(service.getReleaseAuditEvents(getEventsParams)).rejects.toBe(
        error,
      );
    });

    it('returns not found before validating the cursor for a non-member', async () => {
      const { repository, service } = createService();
      repository.findReleaseMembership.mockResolvedValue(null);

      await expect(
        service.getReleaseAuditEvents({
          ...getEventsParams,
          cursor: 'invalid-cursor',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
