-- DropIndex
DROP INDEX "b_bot_hostname_key";

-- DropIndex
DROP INDEX "b_bot_proxy_token_hash_key";

-- CreateIndex: Partial unique index for hostname (only active bots)
-- This allows soft-deleted bots to have the same hostname as new bots
CREATE UNIQUE INDEX "b_bot_hostname_active_unique" ON "b_bot" ("hostname") WHERE "is_deleted" = false;

-- CreateIndex: Partial unique index for proxy_token_hash (only active bots)
CREATE UNIQUE INDEX "b_bot_proxy_token_hash_active_unique" ON "b_bot" ("proxy_token_hash") WHERE "is_deleted" = false AND "proxy_token_hash" IS NOT NULL;
