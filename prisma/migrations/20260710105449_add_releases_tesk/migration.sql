-- CreateTable
CREATE TABLE "ReleaseTask" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "description" VARCHAR(400),
    "url" VARCHAR(400),
    "type" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseTask_releaseId_key_key" ON "ReleaseTask"("releaseId", "key");

-- AddForeignKey
ALTER TABLE "ReleaseTask" ADD CONSTRAINT "ReleaseTask_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
