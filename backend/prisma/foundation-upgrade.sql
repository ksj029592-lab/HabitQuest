ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "habits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "preferredDifficulty" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS "equippedTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "equippedBorder" TEXT,
  ADD COLUMN IF NOT EXISTS "equippedDecoration" TEXT,
  ADD COLUMN IF NOT EXISTS "specialAvatarId" TEXT,
  ADD COLUMN IF NOT EXISTS "avatarIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "itemId" TEXT NOT NULL DEFAULT 'default';
UPDATE "inventory" SET "itemId" = 'legacy_' || "id" WHERE "itemType" = 'cosmetic' AND "itemId" = 'default';
DROP INDEX IF EXISTS "inventory_userId_itemType_rarity_key";
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_userId_itemType_itemId_key" ON "inventory"("userId", "itemType", "itemId");
ALTER TABLE "shop_purchase_logs" ADD COLUMN IF NOT EXISTS "itemId" TEXT;
CREATE TABLE IF NOT EXISTS "level_reward_claims" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "level" INTEGER NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "level_reward_claims_userId_level_key" ON "level_reward_claims"("userId", "level");