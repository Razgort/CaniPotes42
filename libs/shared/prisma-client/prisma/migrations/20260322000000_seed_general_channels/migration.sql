-- Seed a "General" ChatChannel for every existing Club that doesn't already have one
INSERT INTO "ChatChannel" ("id", "clubId", "name", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  c."id",
  'General',
  NOW(),
  NOW()
FROM "Club" c
WHERE NOT EXISTS (
  SELECT 1 FROM "ChatChannel" ch
  WHERE ch."clubId" = c."id" AND ch."name" = 'General'
);
