-- Un seul rôle par utilisateur : conserver une ligne par userId (la plus récente).

DELETE FROM "user_roles" a
WHERE a.ctid NOT IN (
  SELECT DISTINCT ON ("userId") ctid
  FROM "user_roles"
  ORDER BY "userId", "createdAt" DESC
);

ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_pkey";

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId");
