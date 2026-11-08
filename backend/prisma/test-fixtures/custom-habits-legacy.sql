-- LOCAL DISPOSABLE DATABASE ONLY. Never execute this fixture in production.
INSERT INTO "users" ("id","personaId","habits","gold","totalExp","updatedAt") VALUES ('compat-user','compat-persona',ARRAY['독서'],77,100,CURRENT_TIMESTAMP);
INSERT INTO "habit_categories" ("id","name") VALUES ('compat-reading','독서'),('compat-old','과거 운동');
INSERT INTO "daily_quests" ("id","userId","categoryId","questDateKst","difficulty","title","description","status","expReward","goldReward","slotNo","updatedAt") VALUES
('compat-quest','compat-user','compat-reading','2026-10-31','easy','이전 독서','보존','completed',100,50,0,CURRENT_TIMESTAMP),
('compat-past','compat-user','compat-old','2026-10-31','easy','과거 운동','보존','completed',100,50,1,CURRENT_TIMESTAMP);
INSERT INTO "quest_completion_logs" ("id","userId","questId","expReward","goldReward","rankingPointAwarded") VALUES ('compat-log','compat-user','compat-quest',100,50,10);
INSERT INTO "inventory" ("id","userId","itemType","quantity","updatedAt") VALUES ('compat-inventory','compat-user','protection_ticket',2,CURRENT_TIMESTAMP);
