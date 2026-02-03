-- CreateTable
CREATE TABLE "b_persona_template" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "emoji" VARCHAR(10) NOT NULL,
    "tagline" VARCHAR(500) NOT NULL,
    "soul_markdown" TEXT NOT NULL,
    "soul_preview" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "b_persona_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "b_persona_template_is_system_idx" ON "b_persona_template"("is_system");

-- CreateIndex
CREATE INDEX "b_persona_template_created_by_id_idx" ON "b_persona_template"("created_by_id");

-- CreateIndex
CREATE INDEX "b_persona_template_is_deleted_idx" ON "b_persona_template"("is_deleted");

-- CreateIndex
CREATE INDEX "b_persona_template_created_at_idx" ON "b_persona_template"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "b_persona_template" ADD CONSTRAINT "b_persona_template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "u_user_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
