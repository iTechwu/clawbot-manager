/*
  Warnings:

  - A unique constraint covering the columns `[proxy_token_hash]` on the table `b_bot` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "b_bot" ADD COLUMN     "proxy_token_hash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "b_bot_proxy_token_hash_key" ON "b_bot"("proxy_token_hash");
