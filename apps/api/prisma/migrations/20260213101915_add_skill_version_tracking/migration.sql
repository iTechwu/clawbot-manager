-- AlterTable
ALTER TABLE "b_bot_skill" ADD COLUMN     "installed_version" VARCHAR(20);

-- AlterTable
ALTER TABLE "b_skill" ADD COLUMN     "latest_version" VARCHAR(20);

-- Backfill: set installedVersion = skill.version for existing installations
UPDATE "b_bot_skill" bs
SET "installed_version" = s."version"
FROM "b_skill" s
WHERE bs."skill_id" = s."id";
