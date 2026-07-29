import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ReleaseStatus } from 'generated/prisma/enums';

import { PrismaModule } from '@database/prisma.module';
import { PrismaService } from '@database/prisma.service';
import { AuditRepository } from '@modules/audit/audit.repository';
import { ReleasesPolicy } from '@modules/releases/releases.policy';
import { ReleasesRepository } from '@modules/releases/releases.repository';
import { ReleasesService } from '@modules/releases/releases.service';
import { createRequestReviewFixture } from './support/release-request-review.factory';

const missingActorUserId = '00000000-0000-4000-8000-000000000000';

const createReleaseTestingModule = (): Promise<TestingModule> =>
  Test.createTestingModule({
    imports: [PrismaModule],
    providers: [
      AuditRepository,
      ReleasesPolicy,
      ReleasesRepository,
      ReleasesService,
    ],
  }).compile();

describe('Release request review transaction integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let releasesRepository: ReleasesRepository;
  let releasesService: ReleasesService;

  beforeAll(async () => {
    moduleRef = await createReleaseTestingModule();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    releasesRepository = moduleRef.get(ReleasesRepository);
    releasesService = moduleRef.get(ReleasesService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('commits the release transition and its audit event', async () => {
    const fixture = await createRequestReviewFixture(prisma);
    const initialRelease = await prisma.release.findUniqueOrThrow({
      where: { id: fixture.release.id },
      select: { status: true },
    });
    const initialAuditCount = await prisma.auditEvent.count({
      where: { releaseId: fixture.release.id },
    });

    expect({
      releaseStatus: initialRelease.status,
      auditCount: initialAuditCount,
    }).toEqual({
      releaseStatus: ReleaseStatus.DRAFT,
      auditCount: 0,
    });

    const result = await releasesService.requestReview({
      userId: fixture.actor.id,
      releaseId: fixture.release.id,
    });

    const storedRelease = await prisma.release.findUniqueOrThrow({
      where: { id: fixture.release.id },
      select: { status: true },
    });
    const auditEvents = await prisma.auditEvent.findMany({
      where: { releaseId: fixture.release.id },
      select: {
        action: true,
        actorUserId: true,
        organizationId: true,
        projectId: true,
        releaseId: true,
        entityType: true,
        entityId: true,
        metadata: true,
      },
    });

    expect({
      responseStatus: result.status,
      storedStatus: storedRelease.status,
      auditEvents,
    }).toEqual({
      responseStatus: ReleaseStatus.IN_REVIEW,
      storedStatus: ReleaseStatus.IN_REVIEW,
      auditEvents: [
        {
          action: 'release.review_requested',
          actorUserId: fixture.actor.id,
          organizationId: fixture.organization.id,
          projectId: fixture.project.id,
          releaseId: fixture.release.id,
          entityType: 'release',
          entityId: fixture.release.id,
          metadata: {
            fromStatus: ReleaseStatus.DRAFT,
            toStatus: ReleaseStatus.IN_REVIEW,
          },
        },
      ],
    });
  });

  it('rolls back the release transition when audit creation fails', async () => {
    const fixture = await createRequestReviewFixture(prisma);
    const initialRelease = await prisma.release.findUniqueOrThrow({
      where: { id: fixture.release.id },
      select: { status: true },
    });
    const initialAuditCount = await prisma.auditEvent.count({
      where: { releaseId: fixture.release.id },
    });

    expect({
      releaseStatus: initialRelease.status,
      auditCount: initialAuditCount,
    }).toEqual({
      releaseStatus: ReleaseStatus.DRAFT,
      auditCount: 0,
    });

    await expect(
      releasesRepository.requestReview({
        releaseId: fixture.release.id,
        auditEvent: {
          action: 'release.review_requested',
          actorUserId: missingActorUserId,
          entityId: fixture.release.id,
          entityType: 'release',
          metadata: {
            fromStatus: ReleaseStatus.DRAFT,
            toStatus: ReleaseStatus.IN_REVIEW,
          },
          organizationId: fixture.organization.id,
          projectId: fixture.project.id,
          releaseId: fixture.release.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });

    const storedRelease = await prisma.release.findUniqueOrThrow({
      where: { id: fixture.release.id },
      select: { status: true },
    });
    const storedAuditCount = await prisma.auditEvent.count({
      where: { releaseId: fixture.release.id },
    });

    expect({
      releaseStatus: storedRelease.status,
      auditCount: storedAuditCount,
    }).toEqual({
      releaseStatus: ReleaseStatus.DRAFT,
      auditCount: 0,
    });
  });
});
