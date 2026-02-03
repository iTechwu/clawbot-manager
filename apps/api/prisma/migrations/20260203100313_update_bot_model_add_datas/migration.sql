-- AlterTable
ALTER TABLE "b_bot" ADD COLUMN     "persona_template_id" UUID,
ADD COLUMN     "soul_markdown" TEXT;

-- CreateIndex
CREATE INDEX "b_bot_persona_template_id_idx" ON "b_bot"("persona_template_id");

-- AddForeignKey
ALTER TABLE "b_bot" ADD CONSTRAINT "b_bot_persona_template_id_fkey" FOREIGN KEY ("persona_template_id") REFERENCES "b_persona_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
