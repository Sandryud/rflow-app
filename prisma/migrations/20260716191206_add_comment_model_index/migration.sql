-- CreateIndex
CREATE INDEX "Comment_releaseId_deletedAt_createdAt_idx" ON "Comment"("releaseId", "deletedAt", "createdAt");
