import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ErrorMessage } from '@common/constants/error-message';
import { decodeAuditCursor, encodeAuditCursor } from './audit.cursor';
import { AuditRepository } from './audit.repository';
import type {
  AuditCursorData,
  GetReleaseAuditEventsParams,
  GetReleaseAuditEventsResponse,
} from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}
  async getReleaseAuditEvents({
    releaseId,
    userId,
    cursor,
    limit,
  }: GetReleaseAuditEventsParams): Promise<GetReleaseAuditEventsResponse> {
    const member = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!member) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    let decodedCursor: AuditCursorData | undefined;

    if (cursor !== undefined) {
      const decoded = decodeAuditCursor(cursor);

      if (decoded === null) {
        throw new BadRequestException('Invalid audit events cursor');
      }

      decodedCursor = decoded;
    }

    const events = await this.repository.findReleaseEventsPage(
      releaseId,
      limit,
      decodedCursor,
    );

    const hasNextPage = events.length > limit;

    const items = hasNextPage ? events.slice(0, limit) : events;

    const lastItem = items.at(-1);

    const nextCursor =
      hasNextPage && lastItem ? encodeAuditCursor(lastItem) : null;

    return { items, nextCursor };
  }
}
