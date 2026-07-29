-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "fileableType" TEXT NOT NULL,
    "fileableId" INTEGER NOT NULL,
    "associationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_fileableType_fileableId_idx" ON "File"("fileableType", "fileableId");
