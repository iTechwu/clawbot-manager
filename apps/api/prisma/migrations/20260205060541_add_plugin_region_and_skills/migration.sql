-- AlterTable
ALTER TABLE "b_plugin" ADD COLUMN     "region" VARCHAR(20) NOT NULL DEFAULT 'global';

-- CreateTable
CREATE TABLE "b_skill" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "skill_type" VARCHAR(20) NOT NULL DEFAULT 'tool',
    "definition" JSONB NOT NULL,
    "examples" JSONB,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_bot_skill" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "config" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "b_bot_skill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "b_skill_skill_type_idx" ON "b_skill"("skill_type");

-- CreateIndex
CREATE INDEX "b_skill_is_system_idx" ON "b_skill"("is_system");

-- CreateIndex
CREATE INDEX "b_skill_is_enabled_idx" ON "b_skill"("is_enabled");

-- CreateIndex
CREATE INDEX "b_skill_created_by_id_idx" ON "b_skill"("created_by_id");

-- CreateIndex
CREATE INDEX "b_skill_is_deleted_idx" ON "b_skill"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "b_skill_slug_created_by_id_key" ON "b_skill"("slug", "created_by_id");

-- CreateIndex
CREATE INDEX "b_bot_skill_bot_id_idx" ON "b_bot_skill"("bot_id");

-- CreateIndex
CREATE INDEX "b_bot_skill_skill_id_idx" ON "b_bot_skill"("skill_id");

-- CreateIndex
CREATE INDEX "b_bot_skill_is_enabled_idx" ON "b_bot_skill"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "b_bot_skill_bot_id_skill_id_key" ON "b_bot_skill"("bot_id", "skill_id");

-- CreateIndex
CREATE INDEX "b_plugin_region_idx" ON "b_plugin"("region");

-- AddForeignKey
ALTER TABLE "b_bot_skill" ADD CONSTRAINT "b_bot_skill_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "b_bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_bot_skill" ADD CONSTRAINT "b_bot_skill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "b_skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
