-- CreateTable
CREATE TABLE "google_drive_connections" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scopes" TEXT[],
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_drive_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_drive_folders" (
    "id" TEXT NOT NULL,
    "driveConnectionId" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentFolderId" TEXT,
    "folderType" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_drive_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_drive_files" (
    "id" TEXT NOT NULL,
    "driveConnectionId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "localFolderId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "webViewLink" TEXT,
    "webContentLink" TEXT,
    "thumbnailLink" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatestVersion" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "google_drive_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_drive_sync_logs" (
    "id" TEXT NOT NULL,
    "driveConnectionId" TEXT,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "filesProcessed" INTEGER NOT NULL DEFAULT 0,
    "filesFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_drive_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "google_drive_connections_isActive_idx" ON "google_drive_connections"("isActive");

-- CreateIndex
CREATE INDEX "google_drive_connections_expiresAt_idx" ON "google_drive_connections"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "google_drive_folders_driveFolderId_key" ON "google_drive_folders"("driveFolderId");

-- CreateIndex
CREATE INDEX "google_drive_folders_driveConnectionId_idx" ON "google_drive_folders"("driveConnectionId");

-- CreateIndex
CREATE INDEX "google_drive_folders_driveFolderId_idx" ON "google_drive_folders"("driveFolderId");

-- CreateIndex
CREATE INDEX "google_drive_folders_folderType_idx" ON "google_drive_folders"("folderType");

-- CreateIndex
CREATE UNIQUE INDEX "google_drive_files_driveFileId_key" ON "google_drive_files"("driveFileId");

-- CreateIndex
CREATE INDEX "google_drive_files_driveConnectionId_idx" ON "google_drive_files"("driveConnectionId");

-- CreateIndex
CREATE INDEX "google_drive_files_driveFileId_idx" ON "google_drive_files"("driveFileId");

-- CreateIndex
CREATE INDEX "google_drive_files_entityType_entityId_idx" ON "google_drive_files"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "google_drive_files_uploadedBy_idx" ON "google_drive_files"("uploadedBy");

-- CreateIndex
CREATE INDEX "google_drive_files_deletedAt_idx" ON "google_drive_files"("deletedAt");

-- CreateIndex
CREATE INDEX "google_drive_sync_logs_driveConnectionId_idx" ON "google_drive_sync_logs"("driveConnectionId");

-- CreateIndex
CREATE INDEX "google_drive_sync_logs_status_idx" ON "google_drive_sync_logs"("status");

-- CreateIndex
CREATE INDEX "google_drive_sync_logs_startedAt_idx" ON "google_drive_sync_logs"("startedAt");

-- AddForeignKey
ALTER TABLE "google_drive_folders" ADD CONSTRAINT "google_drive_folders_driveConnectionId_fkey" FOREIGN KEY ("driveConnectionId") REFERENCES "google_drive_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_drive_files" ADD CONSTRAINT "google_drive_files_driveConnectionId_fkey" FOREIGN KEY ("driveConnectionId") REFERENCES "google_drive_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_drive_files" ADD CONSTRAINT "google_drive_files_localFolderId_fkey" FOREIGN KEY ("localFolderId") REFERENCES "google_drive_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_drive_sync_logs" ADD CONSTRAINT "google_drive_sync_logs_driveConnectionId_fkey" FOREIGN KEY ("driveConnectionId") REFERENCES "google_drive_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
