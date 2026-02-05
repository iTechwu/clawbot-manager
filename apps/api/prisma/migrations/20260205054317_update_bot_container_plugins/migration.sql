-- CreateEnum
CREATE TYPE "plugin_category" AS ENUM ('BROWSER', 'FILESYSTEM', 'DATABASE', 'API', 'COMMUNICATION', 'DEVELOPMENT', 'CUSTOM');

-- CreateTable
CREATE TABLE "b_plugin" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "version" VARCHAR(20) NOT NULL,
    "author" VARCHAR(100),
    "category" "plugin_category" NOT NULL,
    "config_schema" JSONB,
    "default_config" JSONB,
    "mcp_config" JSONB,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "download_url" VARCHAR(500),
    "icon_emoji" VARCHAR(10),
    "icon_url" VARCHAR(500),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b_bot_plugin" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bot_id" UUID NOT NULL,
    "plugin_id" UUID NOT NULL,
    "config" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "b_bot_plugin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "b_plugin_slug_key" ON "b_plugin"("slug");

-- CreateIndex
CREATE INDEX "b_plugin_category_idx" ON "b_plugin"("category");

-- CreateIndex
CREATE INDEX "b_plugin_is_official_idx" ON "b_plugin"("is_official");

-- CreateIndex
CREATE INDEX "b_plugin_is_enabled_idx" ON "b_plugin"("is_enabled");

-- CreateIndex
CREATE INDEX "b_plugin_is_deleted_idx" ON "b_plugin"("is_deleted");

-- CreateIndex
CREATE INDEX "b_bot_plugin_bot_id_idx" ON "b_bot_plugin"("bot_id");

-- CreateIndex
CREATE INDEX "b_bot_plugin_plugin_id_idx" ON "b_bot_plugin"("plugin_id");

-- CreateIndex
CREATE INDEX "b_bot_plugin_is_enabled_idx" ON "b_bot_plugin"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "b_bot_plugin_bot_id_plugin_id_key" ON "b_bot_plugin"("bot_id", "plugin_id");

-- AddForeignKey
ALTER TABLE "b_bot_plugin" ADD CONSTRAINT "b_bot_plugin_bot_id_fkey" FOREIGN KEY ("bot_id") REFERENCES "b_bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_bot_plugin" ADD CONSTRAINT "b_bot_plugin_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "b_plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
