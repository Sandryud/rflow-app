import {
  ApprovalStatus,
  MembershipRole,
  ReleaseStatus,
} from 'generated/prisma/enums';

import type { PrismaService } from '@database/prisma.service';

export const createRequestReviewFixture = async (prisma: PrismaService) => {
  const actor = await prisma.user.create({
    data: {
      email: 'release-owner@test.local',
      name: 'Release Owner',
      passwordHash: 'integration-test-password-hash',
    },
  });
  const reviewer = await prisma.user.create({
    data: {
      email: 'release-reviewer@test.local',
      name: 'Release Reviewer',
      passwordHash: 'integration-test-password-hash',
    },
  });
  const organization = await prisma.organization.create({
    data: {
      name: 'Request Review Organization',
    },
  });

  await prisma.membership.createMany({
    data: [
      {
        userId: actor.id,
        organizationId: organization.id,
        role: MembershipRole.OWNER,
      },
      {
        userId: reviewer.id,
        organizationId: organization.id,
        role: MembershipRole.QA,
      },
    ],
  });

  const project = await prisma.project.create({
    data: {
      name: 'Request Review Project',
      organizationId: organization.id,
    },
  });
  const environment = await prisma.environment.create({
    data: {
      name: 'Request Review Environment',
      projectId: project.id,
      isActive: true,
    },
  });
  const release = await prisma.release.create({
    data: {
      version: '1.0.0-integration',
      name: 'Request Review Release',
      status: ReleaseStatus.DRAFT,
      createdByUserId: actor.id,
      projectId: project.id,
      environmentId: environment.id,
    },
  });
  const approval = await prisma.approval.create({
    data: {
      releaseId: release.id,
      reviewerUserId: reviewer.id,
      status: ApprovalStatus.PENDING,
    },
  });

  return {
    actor,
    approval,
    environment,
    organization,
    project,
    release,
    reviewer,
  };
};
