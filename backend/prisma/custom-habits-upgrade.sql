-- Additive upgrade. Run only against an isolated test DB until separately approved.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
CREATE TABLE IF NOT EXISTS "user_habits" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "legacyName" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "note" TEXT NOT NULL DEFAULT '',
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "scheduleHistory" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_habits_userId_legacyName_key" ON "user_habits"("userId", "legacyName");
CREATE INDEX IF NOT EXISTS "user_habits_userId_archived_idx" ON "user_habits"("userId", "archived");
ALTER TABLE "daily_quests" ADD COLUMN IF NOT EXISTS "habitId" TEXT REFERENCES "user_habits"("id") ON DELETE SET NULL;
ALTER TABLE "daily_quests" ADD COLUMN IF NOT EXISTS "habitSnapshot" JSONB;
CREATE INDEX IF NOT EXISTS "daily_quests_habitId_questDateKst_idx" ON "daily_quests"("habitId", "questDateKst");

WITH names AS (
  SELECT u."id" AS "userId", unnest(CASE WHEN cardinality(u."habits") > 0 THEN u."habits"
    ELSE ARRAY['운동과 건강','독서와 학습','집중력과 생산성'] END) AS name, false AS archived FROM "users" u
    WHERE NOT EXISTS (SELECT 1 FROM "user_habits" h WHERE h."userId" = u."id")
  UNION ALL
  SELECT q."userId", c."name", true FROM "daily_quests" q JOIN "habit_categories" c ON c."id" = q."categoryId"
    WHERE NOT EXISTS (SELECT 1 FROM "user_habits" h WHERE h."userId" = q."userId")
), grouped AS (
  SELECT "userId", name, bool_and(archived) AS archived FROM names WHERE length(trim(name)) > 0 GROUP BY "userId", name
)
INSERT INTO "user_habits" ("id","userId","legacyName","name","archived","scheduleHistory","createdAt","updatedAt")
SELECT 'legacy_' || md5(g."userId" || ':' || g.name), g."userId", g.name, g.name, g.archived,
  jsonb_build_array(jsonb_build_object('from', LEAST(to_char(u."createdAt" + INTERVAL '9 hours','YYYY-MM-DD'),
    (SELECT min(q."questDateKst") FROM "daily_quests" q WHERE q."userId" = g."userId")),
    'mode','daily','active',true,'weekdays','[]'::jsonb,'weeklyTarget',7)), u."createdAt", CURRENT_TIMESTAMP
FROM grouped g JOIN "users" u ON u."id" = g."userId"
ON CONFLICT ("userId","legacyName") DO NOTHING;

UPDATE "daily_quests" q SET "habitId" = h."id", "habitSnapshot" = jsonb_build_object('name', c."name", 'legacy', true)
FROM "habit_categories" c, "user_habits" h
WHERE q."habitId" IS NULL AND c."id" = q."categoryId" AND h."userId" = q."userId" AND h."legacyName" = c."name";
COMMIT;
