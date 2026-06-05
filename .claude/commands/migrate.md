# Workflow migration Prisma (iVOD — API dockerisée)

> L'API tourne dans Docker. `npx prisma migrate dev` en local NE FONCTIONNE PAS.
> Suivre ce workflow précis à chaque modification de `prisma/schema.prisma`.

## Étapes

**1. Identifier les changements** dans `apps/api/prisma/schema.prisma`

**2. Créer le répertoire de migration**
```bash
mkdir -p apps/api/prisma/migrations/$(date +%Y%m%d%H%M%S)_<nom_descriptif>/
```

**3. Écrire le SQL** dans `migration.sql` (utiliser `IF NOT EXISTS`, `DROP NOT NULL` explicite, etc.)

Exemples courants :
```sql
-- Ajouter une colonne nullable
ALTER TABLE "nom_table" ADD COLUMN IF NOT EXISTS "nom_colonne" TEXT;

-- Ajouter une colonne NOT NULL avec défaut
ALTER TABLE "nom_table" ADD COLUMN IF NOT EXISTS "nom_colonne" TEXT NOT NULL DEFAULT 'valeur';

-- Rendre optionnel
ALTER TABLE "nom_table" ALTER COLUMN "nom_colonne" DROP NOT NULL;

-- Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_table_col" ON "table"("col");
```

**4. Appliquer la migration**
```bash
psql postgresql://ivod:password@localhost:5432/ivod \
  -f apps/api/prisma/migrations/YYYYMMDDHHMMSS_nom/migration.sql
```

**5. Enregistrer dans Prisma**
```bash
psql postgresql://ivod:password@localhost:5432/ivod -c \
  "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) \
   VALUES (gen_random_uuid()::text, 'manual', NOW(), 'YYYYMMDDHHMMSS_nom', 1) \
   ON CONFLICT DO NOTHING;"
```

**6. Régénérer le client Prisma**
```bash
docker exec ivod-api-dev npx prisma generate
```

**7. Redémarrer l'API**
```bash
docker restart ivod-api-dev
```

**8. Vérifier**
```bash
docker logs --tail=20 ivod-api-dev
```

## Règles
- Ne JAMAIS migrer automatiquement sans demande explicite de l'utilisateur
- Toujours tester le SQL avec un `BEGIN; ... ROLLBACK;` mentalement avant d'appliquer
- Préférer `ADD COLUMN IF NOT EXISTS` pour les migrations sûres
- Les colonnes `NOT NULL` sans défaut nécessitent un backfill avant ajout de la contrainte
