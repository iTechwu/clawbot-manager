-- CreateEnum
CREATE TYPE "operate_type" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'START', 'STOP', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "operate_target" AS ENUM ('BOT', 'PROVIDER_KEY', 'USER', 'PERSONA_TEMPLATE', 'SYSTEM');

-- AlterTable
ALTER TABLE "b_bot" ADD COLUMN     "avatar_file_id" UUID,
ADD COLUMN     "emoji" VARCHAR(10);

-- CreateTable
CREATE TABLE "operate_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "operate_type" "operate_type" NOT NULL,
    "target" "operate_target" NOT NULL,
    "target_id" UUID,
    "target_name" VARCHAR(255),
    "detail" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operate_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operate_log_user_id_idx" ON "operate_log"("user_id");

-- CreateIndex
CREATE INDEX "operate_log_operate_type_idx" ON "operate_log"("operate_type");

-- CreateIndex
CREATE INDEX "operate_log_target_idx" ON "operate_log"("target");

-- CreateIndex
CREATE INDEX "operate_log_target_id_idx" ON "operate_log"("target_id");

-- CreateIndex
CREATE INDEX "operate_log_created_at_idx" ON "operate_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "b_bot_avatar_file_id_idx" ON "b_bot"("avatar_file_id");

-- AddForeignKey
ALTER TABLE "b_bot" ADD CONSTRAINT "b_bot_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "f_file_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operate_log" ADD CONSTRAINT "operate_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "u_user_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
