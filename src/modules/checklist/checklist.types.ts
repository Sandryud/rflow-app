import type { Prisma } from 'generated/prisma/client';

import type {
  checklistCreateSelect,
  checklistGetItemsSelect,
  checklistUpdateStatusItemsSelect,
} from './checklist.select';
import type { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import type { UpdateChecklistItemStatusDto } from './dto/update-checklist-item-status.dto';

export type CreateChecklistResponse = Prisma.ChecklistItemGetPayload<{
  select: typeof checklistCreateSelect;
}>;

export type GetChecklistResponse = Prisma.ChecklistItemGetPayload<{
  select: typeof checklistGetItemsSelect;
}>;

export type UpdateChecklistStatusResponse = Prisma.ChecklistItemGetPayload<{
  select: typeof checklistUpdateStatusItemsSelect;
}>;

export type ChecklistUserParams = {
  userId: string;
};

export type ChecklistReleaseParams = ChecklistUserParams & {
  releaseId: string;
};

export type ChecklistParams = ChecklistUserParams & {
  checklistItemId: string;
};

export type CreateChecklistParams = ChecklistReleaseParams & {
  dto: CreateChecklistItemDto;
};

export type UpdateChecklistStatusParams = ChecklistParams & {
  dto: UpdateChecklistItemStatusDto;
};

export type GetChecklistItems = GetChecklistResponse[];
