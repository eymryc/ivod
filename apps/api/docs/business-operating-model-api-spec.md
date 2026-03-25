# iVOD Business Operating Model - API Spec

This document defines the API and data model additions required to support:
- Editorial programming
- Rights and territorial windows
- Revenue sharing and payouts
- Marketing campaigns and attribution
- Field partnerships

It is designed for NestJS + Prisma in this repository.

## 1) New Domain Modules

Add these modules under `apps/api/src/modules`:

1. `editorial`
2. `rights`
3. `revenue-sharing`
4. `payouts`
5. `campaigns`
6. `partnerships`

Each module should include controller, service, DTOs, and Swagger docs.

---

## 2) Prisma Models (new)

Add the following models to `apps/api/prisma/schema.prisma`.

### 2.1 Editorial Programming

```prisma
model EditorialCollection {
  id          String   @id @default(cuid())
  code        String   @unique
  title       String
  description String?
  type        String   // PLAYLIST | CYCLE | EVENT | HOMEPAGE_RAIL
  startsAt    DateTime?
  endsAt      DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items EditorialCollectionItem[]

  @@map("editorial_collections")
}

model EditorialCollectionItem {
  collectionId String
  contentId    String
  position     Int      @default(0)
  startsAt     DateTime?
  endsAt       DateTime?
  createdAt    DateTime @default(now())

  collection EditorialCollection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  content    Content             @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@id([collectionId, contentId])
  @@index([collectionId, position])
  @@map("editorial_collection_items")
}
```

### 2.2 Rights & Distribution Windows

```prisma
model RightsContract {
  id                    String   @id @default(cuid())
  holderType            String   // CREATOR | PRODUCER | DISTRIBUTOR | AGGREGATOR
  holderId              String   // application-level reference
  contractRef           String?  @unique
  signedAt              DateTime?
  startsAt              DateTime
  endsAt                DateTime?
  isExclusive           Boolean  @default(false)
  notes                 String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  contentRights ContentRight[]

  @@map("rights_contracts")
}

model ContentRight {
  id               String   @id @default(cuid())
  contentId        String
  contractId       String
  monetizationType String   // SVOD | TVOD | AVOD
  territoryCode    String   // CI | UEMOA | AFRICA | WORLD | DIASPORA
  startsAt         DateTime
  endsAt           DateTime?
  status           String   // ACTIVE | EXPIRED | SUSPENDED
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  content  Content        @relation(fields: [contentId], references: [id], onDelete: Cascade)
  contract RightsContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@index([contentId, territoryCode, monetizationType, status])
  @@map("content_rights")
}
```

### 2.3 Revenue Sharing

```prisma
model RevenueRule {
  id                 String   @id @default(cuid())
  code               String   @unique
  name               String
  appliesToType      String   // PLATFORM_DEFAULT | CONTRACT | CONTENT
  appliesToId        String?
  creatorSharePct    Float
  platformSharePct   Float
  partnerSharePct    Float    @default(0)
  isActive           Boolean  @default(true)
  effectiveFrom      DateTime
  effectiveTo        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  statements RevenueStatement[]

  @@map("revenue_rules")
}

model RevenueStatement {
  id                    String   @id @default(cuid())
  periodStart           DateTime
  periodEnd             DateTime
  beneficiaryType       String   // CREATOR | PRODUCER | DISTRIBUTOR | PARTNER
  beneficiaryId         String
  contentId             String?
  ruleId                String
  grossAmount           Int
  feesAmount            Int      @default(0)
  taxesAmount           Int      @default(0)
  netDistributable      Int
  beneficiaryAmount     Int
  platformAmount        Int
  partnerAmount         Int      @default(0)
  currency              String   @default("XOF")
  status                String   // DRAFT | LOCKED | PAID
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  content Content?     @relation(fields: [contentId], references: [id], onDelete: SetNull)
  rule    RevenueRule  @relation(fields: [ruleId], references: [id], onDelete: Restrict)
  payout  Payout?

  @@index([beneficiaryType, beneficiaryId, periodStart, periodEnd])
  @@map("revenue_statements")
}
```

### 2.4 Payouts

```prisma
model Payout {
  id                String   @id @default(cuid())
  statementId       String   @unique
  method            String   // MOBILE_MONEY | BANK_TRANSFER
  provider          String?  // ORANGE_MONEY | MTN_MOMO | WAVE | BANK
  accountRef        String
  amount            Int
  currency          String   @default("XOF")
  status            String   // PENDING | PROCESSING | PAID | FAILED
  externalRef       String?
  paidAt            DateTime?
  failureReason     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  statement RevenueStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
  @@map("payouts")
}
```

### 2.5 Campaigns & Attribution

```prisma
model Campaign {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  channel     String   // TIKTOK | INSTAGRAM | YOUTUBE | RADIO | TV | OFFLINE
  startsAt    DateTime
  endsAt      DateTime?
  budget      Int?
  currency    String   @default("XOF")
  objective   String?  // ACQUISITION | RETENTION | AWARENESS
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  touches CampaignTouch[]

  @@map("campaigns")
}

model CampaignTouch {
  id           String   @id @default(cuid())
  campaignId   String
  userId       String?
  contentId    String?
  source       String?
  medium       String?
  utmCampaign  String?
  utmContent   String?
  eventType    String   // IMPRESSION | CLICK | VIEW | SIGNUP | SUBSCRIBE
  occurredAt   DateTime @default(now())

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  user     User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  content  Content? @relation(fields: [contentId], references: [id], onDelete: SetNull)

  @@index([campaignId, occurredAt])
  @@map("campaign_touches")
}
```

### 2.6 Partnerships

```prisma
model Partner {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  type        String   // SCHOOL | FESTIVAL | TELECOM | MEDIA | CINECLUB | NGO
  contactName String?
  contactEmail String?
  contactPhone String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  agreements PartnerAgreement[]

  @@map("partners")
}

model PartnerAgreement {
  id             String   @id @default(cuid())
  partnerId      String
  title          String
  startsAt       DateTime
  endsAt         DateTime?
  revenueSharePct Float   @default(0)
  terms          String?
  status         String   // ACTIVE | EXPIRED | TERMINATED
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  partner Partner @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  @@index([partnerId, status])
  @@map("partner_agreements")
}
```

---

## 3) API Endpoints (NestJS)

All write routes should be `ADMIN` protected, except creator self-service where stated.

### 3.1 Editorial
- `GET /editorial/collections`
- `GET /editorial/collections/:id`
- `POST /editorial/collections`
- `PATCH /editorial/collections/:id`
- `DELETE /editorial/collections/:id`
- `POST /editorial/collections/:id/items`
- `PATCH /editorial/collections/:id/items/reorder`
- `DELETE /editorial/collections/:id/items/:contentId`

### 3.2 Rights
- `GET /rights/contracts`
- `GET /rights/contracts/:id`
- `POST /rights/contracts`
- `PATCH /rights/contracts/:id`
- `DELETE /rights/contracts/:id`
- `GET /rights/content/:contentId`
- `POST /rights/content/:contentId`
- `PATCH /rights/content/:contentId/:rightId`
- `DELETE /rights/content/:contentId/:rightId`

### 3.3 Revenue Sharing
- `GET /revenue/rules`
- `POST /revenue/rules`
- `PATCH /revenue/rules/:id`
- `DELETE /revenue/rules/:id`
- `POST /revenue/statements/generate`
- `GET /revenue/statements`
- `GET /revenue/statements/:id`
- `POST /revenue/statements/:id/lock`

Creator view:
- `GET /revenue/me/statements`
- `GET /revenue/me/statements/:id`

### 3.4 Payouts
- `GET /payouts`
- `GET /payouts/:id`
- `POST /payouts` (from locked statement)
- `POST /payouts/:id/process`
- `POST /payouts/:id/mark-paid`
- `POST /payouts/:id/mark-failed`

Creator view:
- `GET /payouts/me`

### 3.5 Campaigns
- `GET /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns`
- `PATCH /campaigns/:id`
- `DELETE /campaigns/:id`
- `POST /campaigns/:id/touches`
- `GET /campaigns/:id/analytics`

### 3.6 Partnerships
- `GET /partners`
- `GET /partners/:id`
- `POST /partners`
- `PATCH /partners/:id`
- `DELETE /partners/:id`
- `GET /partners/:id/agreements`
- `POST /partners/:id/agreements`
- `PATCH /partners/:id/agreements/:agreementId`

---

## 4) Revenue Calculation Contract

For each statement row:

1. `grossAmount = attributable revenue`
2. `netDistributable = grossAmount - feesAmount - taxesAmount`
3. `beneficiaryAmount = round(netDistributable * beneficiary share)`
4. `platformAmount = round(netDistributable * platform share)`
5. `partnerAmount = round(netDistributable * partner share)`

Constraint:
- `beneficiaryShare + platformShare + partnerShare = 100%`

---

## 5) Swagger Requirements

For each new route:
- `@ApiTags(...)`
- `@ApiOperation(...)`
- `@ApiBody(...)` for write endpoints
- `@ApiParam(...)` and `@ApiQuery(...)` where needed
- `@ApiSuccessResponse(...)` with real examples
- `@ApiErrorResponse(...)` for 400/401/403/404/409

Envelope format must stay consistent:
- `{ success, data, error, meta }`

---

## 6) Implementation Order

Recommended phases:

1. Phase A - Rights + Revenue Rules
2. Phase B - Statements + Payouts
3. Phase C - Editorial collections
4. Phase D - Campaigns + attribution
5. Phase E - Partnerships

Each phase:
- Prisma migration
- Seed default refs/data
- NestJS module
- Swagger docs
- Basic admin table in web app

---

## 7) Minimal Defaults for iVOD

Seed defaults:
- Revenue rule `DEFAULT_60_40`:
  - creator 60%
  - platform 40%
  - partner 0%
- Basic territories: `CI`, `AFRICA`, `WORLD`
- Monetization types: `SVOD`, `TVOD`, `AVOD`

