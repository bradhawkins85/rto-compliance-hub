-- CreateTable: webhook_submissions
CREATE TABLE "webhook_submissions" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "form_type" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "processing_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on source + submission_id for duplicate detection
CREATE UNIQUE INDEX "webhook_submissions_source_submission_id_key" ON "webhook_submissions"("source", "submission_id");

-- CreateIndex: Index on form_id for filtering
CREATE INDEX "webhook_submissions_form_id_idx" ON "webhook_submissions"("form_id");

-- CreateIndex: Index on status for filtering
CREATE INDEX "webhook_submissions_status_idx" ON "webhook_submissions"("status");

-- CreateIndex: Index on created_at for time-based queries
CREATE INDEX "webhook_submissions_created_at_idx" ON "webhook_submissions"("created_at");
