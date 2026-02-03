-- AlterTable
ALTER TABLE "b_persona_template" ADD COLUMN     "avatar_file_id" UUID,
ALTER COLUMN "emoji" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "b_persona_template_avatar_file_id_idx" ON "b_persona_template"("avatar_file_id");

-- AddForeignKey
ALTER TABLE "b_persona_template" ADD CONSTRAINT "b_persona_template_avatar_file_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "f_file_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
