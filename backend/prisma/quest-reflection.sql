ALTER TABLE "daily_quests"
  ADD COLUMN IF NOT EXISTS "verificationQuestion" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationAnswer" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationFeedback" TEXT;