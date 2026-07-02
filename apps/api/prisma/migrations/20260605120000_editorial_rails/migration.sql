-- Rails catalogue éditoriaux (source DB + collections manuelles)

CREATE TABLE "editorial_rails" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "surfaces" TEXT[] NOT NULL,
    "type" TEXT NOT NULL,
    "personalizedKind" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "hideIfEmpty" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "titleMode" TEXT,
    "link" TEXT,
    "queryJson" JSONB,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorial_rails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "editorial_rails_code_key" ON "editorial_rails"("code");
CREATE INDEX "editorial_rails_isActive_position_idx" ON "editorial_rails"("isActive", "position");

CREATE TABLE "editorial_rail_items" (
    "id" TEXT NOT NULL,
    "railId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_rail_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "editorial_rail_items_railId_contentId_key" ON "editorial_rail_items"("railId", "contentId");
CREATE INDEX "editorial_rail_items_railId_position_idx" ON "editorial_rail_items"("railId", "position");

ALTER TABLE "editorial_rail_items" ADD CONSTRAINT "editorial_rail_items_railId_fkey" FOREIGN KEY ("railId") REFERENCES "editorial_rails"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "editorial_rail_items" ADD CONSTRAINT "editorial_rail_items_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
