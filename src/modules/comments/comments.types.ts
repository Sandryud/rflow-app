import type { Prisma } from 'generated/prisma/client';

import type { commentSelect } from './comments.select';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

export type CommentResponse = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;

export type GetCommentsResponse = CommentResponse[];

export type CommentUserParams = {
  userId: string;
};

export type CommentReleaseParams = CommentUserParams & {
  releaseId: string;
};

export type CommentParams = CommentUserParams & {
  commentId: string;
};

export type CreateCommentParams = CommentReleaseParams & {
  dto: CreateCommentDto;
};

export type GetCommentsParams = CommentReleaseParams;

export type UpdateCommentParams = CommentParams & {
  dto: UpdateCommentDto;
};

export type DeleteCommentParams = CommentParams;
