ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminderTime" TEXT NOT NULL DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS "reminderLastDateKst" TEXT;
CREATE TABLE IF NOT EXISTS "day_reward_claims" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "days" INTEGER NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "day_reward_claims_userId_days_key" ON "day_reward_claims"("userId", "days");