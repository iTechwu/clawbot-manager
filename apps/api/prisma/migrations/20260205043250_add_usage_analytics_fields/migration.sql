-- CreateEnum
CREATE TYPE "health_status" AS ENUM ('HEALTHY', 'UNHEALTHY', 'UNKNOWN');

-- AlterTable
ALTER TABLE "b_bot" ADD COLUMN     "health_status" "health_status" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "last_health_check" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "b_usage_log" ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "endpoint" VARCHAR(255),
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "model" VARCHAR(100);

-- CreateIndex
CREATE INDEX "b_bot_health_status_idx" ON "b_bot"("health_status");

-- CreateIndex
CREATE INDEX "b_usage_log_bot_id_created_at_idx" ON "b_usage_log"("bot_id", "created_at");

-- CreateIndex
CREATE INDEX "b_usage_log_bot_id_vendor_created_at_idx" ON "b_usage_log"("bot_id", "vendor", "created_at");

-- CreateIndex
CREATE INDEX "b_usage_log_model_idx" ON "b_usage_log"("model");
