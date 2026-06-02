import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Utilitaires ──────────────────────────────────────────────────────────────

async function upsertMany<T extends { code: string; label: string }>(
  model: any,
  items: T[],
  extra?: (item: T) => Record<string, unknown>,
) {
  for (const item of items) {
    const { code, label, ...rest } = item;
    const data = { label, ...(extra ? extra(item) : rest) };
    await model.upsert({ where: { code }, update: data, create: { code, ...data } });
  }
}

// ─── 1. Langues ───────────────────────────────────────────────────────────────

async function seedLanguages() {
  const items = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'pt', label: 'Português' },
    { code: 'wo', label: 'Wolof' },
    { code: 'bm', label: 'Bambara / Dioula' },
    { code: 'ha', label: 'Hausa' },
    { code: 'yo', label: 'Yoruba' },
    { code: 'ig', label: 'Igbo' },
    { code: 'sw', label: 'Kiswahili' },
    { code: 'ln', label: 'Lingala' },
    { code: 'tw', label: 'Twi' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
  ];
  await upsertMany(prisma.refLanguage, items);
  console.log(`  ✓ languages: ${items.length}`);
}

// ─── 2. Pays ──────────────────────────────────────────────────────────────────

async function seedCountries() {
  const items: { code: string; label: string; region: string }[] = [
    // UEMOA
    { code: 'CI', label: "Côte d'Ivoire", region: 'WEST_AFRICA' },
    { code: 'SN', label: 'Sénégal', region: 'WEST_AFRICA' },
    { code: 'ML', label: 'Mali', region: 'WEST_AFRICA' },
    { code: 'BF', label: 'Burkina Faso', region: 'WEST_AFRICA' },
    { code: 'TG', label: 'Togo', region: 'WEST_AFRICA' },
    { code: 'BJ', label: 'Bénin', region: 'WEST_AFRICA' },
    { code: 'GN', label: 'Guinée', region: 'WEST_AFRICA' },
    { code: 'NE', label: 'Niger', region: 'WEST_AFRICA' },
    // Reste Afrique de l'Ouest
    { code: 'GH', label: 'Ghana', region: 'WEST_AFRICA' },
    { code: 'NG', label: 'Nigeria', region: 'WEST_AFRICA' },
    { code: 'LR', label: 'Liberia', region: 'WEST_AFRICA' },
    { code: 'SL', label: 'Sierra Leone', region: 'WEST_AFRICA' },
    { code: 'GM', label: 'Gambie', region: 'WEST_AFRICA' },
    { code: 'CV', label: 'Cap-Vert', region: 'WEST_AFRICA' },
    { code: 'MR', label: 'Mauritanie', region: 'WEST_AFRICA' },
    { code: 'GW', label: 'Guinée-Bissau', region: 'WEST_AFRICA' },
    // Afrique Centrale
    { code: 'CM', label: 'Cameroun', region: 'CENTRAL_AFRICA' },
    { code: 'CD', label: 'Congo RDC', region: 'CENTRAL_AFRICA' },
    { code: 'CG', label: 'Congo', region: 'CENTRAL_AFRICA' },
    { code: 'GA', label: 'Gabon', region: 'CENTRAL_AFRICA' },
    { code: 'CF', label: 'Centrafrique', region: 'CENTRAL_AFRICA' },
    { code: 'TD', label: 'Tchad', region: 'CENTRAL_AFRICA' },
    { code: 'GQ', label: 'Guinée équatoriale', region: 'CENTRAL_AFRICA' },
    // Afrique du Nord
    { code: 'MA', label: 'Maroc', region: 'NORTH_AFRICA' },
    { code: 'DZ', label: 'Algérie', region: 'NORTH_AFRICA' },
    { code: 'TN', label: 'Tunisie', region: 'NORTH_AFRICA' },
    { code: 'EG', label: 'Égypte', region: 'NORTH_AFRICA' },
    // Reste Afrique
    { code: 'ZA', label: 'Afrique du Sud', region: 'OTHER' },
    { code: 'KE', label: 'Kenya', region: 'OTHER' },
    { code: 'ET', label: 'Éthiopie', region: 'OTHER' },
    { code: 'TZ', label: 'Tanzanie', region: 'OTHER' },
    { code: 'MG', label: 'Madagascar', region: 'OTHER' },
    { code: 'AO', label: 'Angola', region: 'OTHER' },
    // Diaspora
    { code: 'FR', label: 'France', region: 'DIASPORA' },
    { code: 'BE', label: 'Belgique', region: 'DIASPORA' },
    { code: 'CH', label: 'Suisse', region: 'DIASPORA' },
    { code: 'DE', label: 'Allemagne', region: 'DIASPORA' },
    { code: 'IT', label: 'Italie', region: 'DIASPORA' },
    { code: 'ES', label: 'Espagne', region: 'DIASPORA' },
    { code: 'US', label: 'États-Unis', region: 'DIASPORA' },
    { code: 'CA', label: 'Canada', region: 'DIASPORA' },
    { code: 'GB', label: 'Royaume-Uni', region: 'DIASPORA' },
  ];

  for (const item of items) {
    await prisma.refCountry.upsert({
      where: { isoCode: item.code },
      update: { label: item.label, region: item.region },
      create: { isoCode: item.code, label: item.label, region: item.region },
    });
  }
  console.log(`  ✓ countries: ${items.length}`);
}

// ─── 3. Devises ───────────────────────────────────────────────────────────────

async function seedCurrencies() {
  const items = [
    { code: 'XOF', label: 'Franc CFA BCEAO', symbol: 'FCFA', decimals: 0 },
    { code: 'XAF', label: 'Franc CFA BEAC', symbol: 'FCFA', decimals: 0 },
    { code: 'USD', label: 'Dollar américain', symbol: '$', decimals: 2 },
    { code: 'EUR', label: 'Euro', symbol: '€', decimals: 2 },
    { code: 'GBP', label: 'Livre sterling', symbol: '£', decimals: 2 },
    { code: 'GHS', label: 'Cedi ghanéen', symbol: '₵', decimals: 2 },
    { code: 'NGN', label: 'Naira nigérian', symbol: '₦', decimals: 2 },
  ];
  for (const item of items) {
    await prisma.refCurrency.upsert({
      where: { code: item.code },
      update: { label: item.label, symbol: item.symbol, decimals: item.decimals },
      create: item,
    });
  }
  console.log(`  ✓ currencies: ${items.length}`);
}

// ─── 4. Genres ────────────────────────────────────────────────────────────────

async function seedGenres() {
  const items = [
    { code: 'ACTION', label: 'Action', slug: 'action' },
    { code: 'DRAME', label: 'Drame', slug: 'drame' },
    { code: 'COMEDIE', label: 'Comédie', slug: 'comedie' },
    { code: 'ROMANCE', label: 'Romance', slug: 'romance' },
    { code: 'THRILLER', label: 'Thriller', slug: 'thriller' },
    { code: 'HORREUR', label: 'Horreur', slug: 'horreur' },
    { code: 'SCIENCE_FICTION', label: 'Science-fiction', slug: 'science-fiction' },
    { code: 'DOCUMENTAIRE', label: 'Documentaire', slug: 'documentaire' },
    { code: 'ANIMATION', label: 'Animation', slug: 'animation' },
    { code: 'FAMILLE', label: 'Famille', slug: 'famille' },
    { code: 'HISTORIQUE', label: 'Historique', slug: 'historique' },
    { code: 'BIOGRAPHIE', label: 'Biographie', slug: 'biographie' },
    { code: 'POLICIER', label: 'Policier', slug: 'policier' },
    { code: 'FANTASTIQUE', label: 'Fantastique', slug: 'fantastique' },
    { code: 'SPORT', label: 'Sport', slug: 'sport' },
    { code: 'MUSIQUE', label: 'Musique', slug: 'musique' },
    { code: 'GUERRE', label: 'Guerre', slug: 'guerre' },
    { code: 'WESTERN', label: 'Western', slug: 'western' },
    { code: 'AVENTURE', label: 'Aventure', slug: 'aventure' },
  ];
  for (const item of items) {
    await prisma.refGenre.upsert({
      where: { code: item.code },
      update: { label: item.label, slug: item.slug },
      create: item,
    });
  }
  console.log(`  ✓ genres: ${items.length}`);
}

// ─── 5. Types de contenu ──────────────────────────────────────────────────────

async function seedContentTypes() {
  const items = [
    { code: 'FILM', label: 'Film', typeCode: 'FILM' },
    { code: 'SERIE', label: 'Série', typeCode: 'SERIE' },
    { code: 'WEB_SERIE', label: 'Série web', typeCode: 'WEB_SERIE' }
  ];
  for (const item of items) {
    await prisma.refContentType.upsert({
      where: { code: item.code },
      update: { label: item.label, typeCode: item.typeCode },
      create: item,
    });
  }
  console.log(`  ✓ content types: ${items.length}`);
}

// ─── 6. Statuts de contenu ────────────────────────────────────────────────────

async function seedContentStatuses() {
  const items = [
    { code: 'DRAFT', label: 'Brouillon' },
    { code: 'PENDING_REVIEW', label: 'En attente de validation' },
    { code: 'APPROVED', label: 'Approuvé' },
    { code: 'REJECTED', label: 'Rejeté' },
    { code: 'PUBLISHED', label: 'Publié' },
    { code: 'ARCHIVED', label: 'Archivé' },
  ];
  await upsertMany(prisma.refContentStatus, items);
  console.log(`  ✓ content statuses: ${items.length}`);
}

// ─── 7. Visibilités de contenu ────────────────────────────────────────────────

async function seedContentVisibilities() {
  const items = [
    { code: 'PUBLIC', label: 'Gratuit avec publicité' },
    { code: 'SUBSCRIBERS_ONLY', label: 'Inclus abonnement' },
    { code: 'PPV', label: 'Achat à l\'unité' },
    { code: 'PRIVATE', label: 'Privé' },
  ];
  await upsertMany(prisma.refContentVisibility, items);
  console.log(`  ✓ content visibilities: ${items.length}`);
}

// ─── 8. Classifications d'âge ─────────────────────────────────────────────────

async function seedMaturityRatings() {
  const items = [
    { code: 'ALL', label: 'Tous publics', order: 0 },
    { code: 'MINUS_12', label: '-12', order: 1 },
    { code: 'MINUS_16', label: '-16', order: 2 },
    { code: 'MINUS_18', label: '-18', order: 3 },
  ];
  for (const item of items) {
    await prisma.refMaturityRating.upsert({
      where: { code: item.code },
      update: { label: item.label, order: item.order },
      create: item,
    });
  }
  console.log(`  ✓ maturity ratings: ${items.length}`);
}

// ─── 9. Rôles utilisateur (référentiel) ───────────────────────────────────────

async function seedUserRoleRefs() {
  const items = [
    { code: 'VIEWER', label: 'Spectateur' },
    { code: 'CREATOR', label: 'Créateur' },
    { code: 'ADMIN', label: 'Administrateur' },
    { code: 'MODERATOR', label: 'Modérateur' },
    { code: 'FINANCE', label: 'Finance' },
    { code: 'DISTRIBUTOR', label: 'Distributeur' },
  ];
  await upsertMany(prisma.refUserRole, items);
  console.log(`  ✓ user role refs: ${items.length}`);
}

// ─── 10. Plans utilisateur ────────────────────────────────────────────────────

async function seedUserPlans() {
  const items = [
    {
      code: 'FREE',
      label: 'Gratuit',
      tagline: 'Avec publicité · découverte illimitée',
      priceFcfaMonthly: 0,
      billingDays: 365,
      maxScreens: 1,
      videoQuality: 'SD',
      hasAds: true,
      maxOfflineDownloads: 0,
      hasExclusiveAccess: false,
      showInStore: false,
      sortOrder: 0,
      isActive: true,
    },
    {
      code: 'PASS_24H',
      label: 'Pass 24h',
      tagline: 'Sans pub · accès complet 24 heures',
      priceFcfaMonthly: 150,
      billingDays: 1,
      maxScreens: 1,
      videoQuality: 'HD',
      hasAds: false,
      maxOfflineDownloads: 0,
      hasExclusiveAccess: false,
      showInStore: true,
      sortOrder: 10,
      isActive: true,
    },
    {
      code: 'PASS_WEEK',
      label: 'Pass semaine',
      tagline: 'Sans pub · 7 jours illimités',
      priceFcfaMonthly: 500,
      billingDays: 7,
      maxScreens: 2,
      videoQuality: 'HD',
      hasAds: false,
      maxOfflineDownloads: 1,
      hasExclusiveAccess: false,
      showInStore: true,
      sortOrder: 20,
      isActive: true,
    },
    {
      code: 'PREMIUM',
      label: 'Premium',
      tagline: 'Sans pub · meilleure qualité · 30 jours',
      priceFcfaMonthly: 1500,
      billingDays: 30,
      maxScreens: 3,
      videoQuality: 'FHD',
      hasAds: false,
      maxOfflineDownloads: 5,
      hasExclusiveAccess: true,
      showInStore: true,
      sortOrder: 30,
      isActive: true,
    },
    {
      code: 'BASIC',
      label: 'Basic (legacy)',
      tagline: null,
      priceFcfaMonthly: 1000,
      billingDays: 30,
      maxScreens: 2,
      videoQuality: 'HD',
      hasAds: false,
      maxOfflineDownloads: 2,
      hasExclusiveAccess: false,
      showInStore: false,
      sortOrder: 99,
      isActive: true,
    },
  ];
  for (const { code, label, ...rest } of items) {
    await prisma.refUserPlan.upsert({
      where: { code },
      update: { label, ...rest },
      create: { code, label, ...rest },
    });
  }
  console.log(`  ✓ user plans: ${items.length}`);
}

// ─── 11. Statuts d'abonnement ─────────────────────────────────────────────────

async function seedSubscriptionStatuses() {
  const items = [
    { code: 'ACTIVE', label: 'Actif' },
    { code: 'EXPIRED', label: 'Expiré' },
    { code: 'CANCELLED', label: 'Annulé' },
    { code: 'PAUSED', label: 'En pause' },
    { code: 'TRIAL', label: 'Essai gratuit' },
  ];
  await upsertMany(prisma.refSubscriptionStatus, items);
  console.log(`  ✓ subscription statuses: ${items.length}`);
}

// ─── 12. Fournisseurs de paiement ─────────────────────────────────────────────

async function seedPaymentProviders() {
  const items = [
    { code: 'PAYSTACK', label: 'Paystack (carte & Mobile Money)', isActive: true },
    { code: 'ORANGE_MONEY', label: 'Orange Money', isActive: false },
    { code: 'WAVE', label: 'Wave', isActive: false },
    { code: 'MTN_MONEY', label: 'MTN Mobile Money', isActive: false },
    { code: 'MOOV_MONEY', label: 'Moov Money', isActive: false },
    { code: 'STRIPE', label: 'Stripe (legacy)', isActive: false },
    { code: 'PAYPAL', label: 'PayPal', isActive: false },
    { code: 'FREE', label: 'Gratuit (aucun paiement)', isActive: true },
  ];
  for (const { code, label, isActive } of items) {
    await prisma.refPaymentProvider.upsert({
      where: { code },
      update: { label, isActive },
      create: { code, label, isActive },
    });
  }
  console.log(`  ✓ payment providers: ${items.length}`);
}

// ─── 13. Statuts de paiement ──────────────────────────────────────────────────

async function seedPaymentStatuses() {
  const items = [
    { code: 'PENDING', label: 'En attente' },
    { code: 'COMPLETED', label: 'Complété' },
    { code: 'FAILED', label: 'Échoué' },
    { code: 'REFUNDED', label: 'Remboursé' },
    { code: 'CANCELLED', label: 'Annulé' },
  ];
  await upsertMany(prisma.refPaymentStatus, items);
  console.log(`  ✓ payment statuses: ${items.length}`);
}

// ─── 14. Types de rightsholder ────────────────────────────────────────────────

async function seedRightsholderTypes() {
  const items = [
    { code: 'PRODUCER', label: 'Producteur' },
    { code: 'PRODUCTION_COMPANY', label: 'Société de production' },
    { code: 'DISTRIBUTOR', label: 'Distributeur' },
    { code: 'DIRECTOR', label: 'Réalisateur' },
    { code: 'CO_PRODUCER', label: 'Co-producteur' },
  ];
  await upsertMany(prisma.refRightsholderType, items);
  console.log(`  ✓ rightsholder types: ${items.length}`);
}

// ─── 15. Types de monétisation ────────────────────────────────────────────────

async function seedMonetizationTypes() {
  const items = [
    { code: 'SVOD', label: 'Abonnement (SVOD)' },
    { code: 'TVOD', label: 'Location / Achat (TVOD)' },
    { code: 'AVOD', label: 'Gratuit avec publicité (AVOD)' },
    { code: 'FREE', label: 'Gratuit sans publicité' },
  ];
  await upsertMany(prisma.refMonetizationType, items);
  console.log(`  ✓ monetization types: ${items.length}`);
}

// ─── 16. Codes territoriaux ───────────────────────────────────────────────────

async function seedTerritoryCodes() {
  const items = [
    { code: 'CI', label: "Côte d'Ivoire uniquement" },
    { code: 'SN', label: 'Sénégal uniquement' },
    { code: 'ML', label: 'Mali uniquement' },
    { code: 'BF', label: 'Burkina Faso uniquement' },
    { code: 'TG', label: 'Togo uniquement' },
    { code: 'BJ', label: 'Bénin uniquement' },
    { code: 'GN', label: 'Guinée uniquement' },
    { code: 'NE', label: 'Niger uniquement' },
    { code: 'CM', label: 'Cameroun uniquement' },
    { code: 'SN_ML', label: 'Sénégal + Mali' },
    { code: 'UEMOA', label: 'Zone UEMOA' },
    { code: 'CEDEAO', label: 'Zone CEDEAO' },
    { code: 'AFRICA', label: 'Afrique (tous pays)' },
    { code: 'DIASPORA', label: 'Diaspora africaine' },
    { code: 'WORLD', label: 'Monde entier' },
  ];
  await upsertMany(prisma.refTerritoryCode, items);
  console.log(`  ✓ territory codes: ${items.length}`);
}

// ─── 17. Rôles de l'équipe technique ──────────────────────────────────────────

async function seedCrewRoles() {
  const items = [
    { code: 'DIRECTOR', label: 'Réalisateur' },
    { code: 'SCREENWRITER', label: 'Scénariste' },
    { code: 'PRODUCER', label: 'Producteur' },
    { code: 'EDITOR', label: 'Monteur' },
    { code: 'COMPOSER', label: 'Compositeur' },
    { code: 'CINEMATOGRAPHER', label: 'Directeur de la photographie' },
    { code: 'COSTUME', label: 'Créateur de costumes' },
    { code: 'SOUND', label: 'Ingénieur du son' },
    { code: 'VISUAL_EFFECTS', label: 'Effets visuels' },
    { code: 'CASTING', label: 'Directeur de casting' },
    { code: 'SET_DESIGNER', label: 'Chef décorateur' },
    { code: 'MAKEUP', label: 'Maquilleur' },
  ];
  await upsertMany(prisma.refCrewRole, items);
  console.log(`  ✓ crew roles: ${items.length}`);
}

// ─── 18. Types de récompenses ─────────────────────────────────────────────────

async function seedAwardTypes() {
  const items = [
    { code: 'FESPACO', label: 'FESPACO — Festival panafricain du cinéma' },
    { code: 'CLAP_IVOIRE', label: 'Clap Ivoire' },
    { code: 'NOLLYWOOD_AWARD', label: 'Nollywood Movie Awards' },
    { code: 'AMAA', label: 'Africa Movie Academy Awards (AMAA)' },
    { code: 'PAN_AFRICAN', label: 'Prix panafricain' },
    { code: 'NATIONAL', label: 'Prix national' },
    { code: 'REGIONAL_FESTIVAL', label: 'Festival régional' },
    { code: 'TV_AWARD', label: 'Prix télévision' },
    { code: 'CRITICS', label: 'Prix de la critique' },
    { code: 'AUDIENCE', label: 'Prix du public' },
    { code: 'INDUSTRY', label: 'Prix professionnel / industrie' },
    { code: 'OSCARS', label: 'Academy Awards (Oscars)' },
    { code: 'CANNES', label: 'Festival de Cannes' },
    { code: 'CESAR', label: 'Cérémonie des César' },
    { code: 'BAFTA', label: 'BAFTA Awards' },
    { code: 'GOLDEN_GLOBE', label: 'Golden Globe Awards' },
    { code: 'SUNDANCE', label: 'Sundance Film Festival' },
    { code: 'VENICE', label: 'Mostra de Venise' },
    { code: 'BERLIN', label: 'Berlinale' },
    { code: 'OTHER', label: 'Autre distinction' },
  ];
  await upsertMany(prisma.refAwardType, items);
  console.log(`  ✓ types de distinction: ${items.length}`);
}

// ─── 19. RBAC — Rôles & Permissions ──────────────────────────────────────────

const PERMISSIONS: Record<string, string> = {
  // Utilisateurs
  'user.read': 'Voir les utilisateurs',
  'user.create': 'Créer un utilisateur',
  'user.update': 'Modifier un utilisateur',
  'user.delete': 'Supprimer un utilisateur',
  'user.manage': 'Gérer tous les utilisateurs',
  // Contenu
  'content.read': 'Voir les contenus',
  'content.create': 'Créer un contenu',
  'content.update': 'Modifier ses contenus',
  'content.delete': 'Supprimer ses contenus',
  'content.publish': 'Publier un contenu',
  'content.approve': 'Approuver un contenu',
  'content.reject': 'Rejeter un contenu',
  'content.manage': 'Gérer tous les contenus',
  // Épisodes
  'episode.create': 'Créer un épisode',
  'episode.update': 'Modifier un épisode',
  'episode.delete': 'Supprimer un épisode',
  // Modération
  'moderation.read': 'Voir la file de modération',
  'moderation.approve': 'Approuver via modération',
  'moderation.reject': 'Rejeter via modération',
  // Abonnements & paiements
  'subscription.read': 'Voir les abonnements',
  'subscription.create': 'Créer un abonnement',
  'subscription.manage': 'Gérer tous les abonnements',
  'payment.read': 'Voir les paiements',
  'payment.create': 'Effectuer un paiement',
  'payment.refund': 'Rembourser un paiement',
  'payment.manage': 'Gérer tous les paiements',
  // Droits & revenus
  'rightsholder.read': 'Voir les ayants droit',
  'rightsholder.create': 'Créer un ayant droit',
  'rightsholder.manage': 'Gérer tous les ayants droit',
  'rights.read': 'Voir les droits',
  'rights.create': 'Créer des droits',
  'rights.manage': 'Gérer tous les droits',
  'revenue.read': 'Voir les revenus',
  'revenue.manage': 'Gérer les revenus',
  // Analytics
  'analytics.read': 'Voir les statistiques',
  'analytics.manage': 'Gérer les analytics',
  // Marketing
  'banner.create': 'Créer une bannière',
  'banner.update': 'Modifier une bannière',
  'banner.delete': 'Supprimer une bannière',
  'campaign.manage': 'Gérer les campagnes',
  // Notifications
  'notification.send': 'Envoyer des notifications',
  // Administration
  'admin.access': 'Accéder au back-office',
  '*': 'Toutes les permissions (super admin)',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'admin.access',
    'user.read', 'user.create', 'user.update', 'user.delete', 'user.manage',
    'content.read', 'content.manage', 'content.approve', 'content.reject', 'content.publish',
    'moderation.read', 'moderation.approve', 'moderation.reject',
    'subscription.read', 'subscription.manage',
    'payment.read', 'payment.manage', 'payment.refund',
    'rightsholder.read', 'rightsholder.manage',
    'rights.read', 'rights.manage',
    'revenue.read', 'revenue.manage',
    'analytics.read', 'analytics.manage',
    'banner.create', 'banner.update', 'banner.delete',
    'campaign.manage',
    'notification.send',
  ],
  MODERATOR: [
    'admin.access',
    'content.read', 'content.approve', 'content.reject',
    'moderation.read', 'moderation.approve', 'moderation.reject',
    'analytics.read',
  ],
  CREATOR: [
    'content.read', 'content.create', 'content.update', 'content.delete',
    'episode.create', 'episode.update', 'episode.delete',
    'rightsholder.read',
    'rights.read',
    'revenue.read',
    'analytics.read',
    'subscription.read',
    'payment.read',
  ],
  FINANCE: [
    'admin.access',
    'payment.read', 'payment.manage', 'payment.refund',
    'subscription.read', 'subscription.manage',
    'revenue.read', 'revenue.manage',
    'analytics.read',
    'user.read',
  ],
  DISTRIBUTOR: [
    'content.read',
    'rightsholder.read', 'rightsholder.create',
    'rights.read', 'rights.create',
    'analytics.read',
  ],
  VIEWER: [
    'content.read',
    'subscription.create', 'subscription.read',
    'payment.create', 'payment.read',
  ],
};

async function seedRBAC() {
  // Permissions
  for (const [code, label] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: { label },
      create: { code, label },
    });
  }

  // Rôles + associations
  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: { label: roleCode },
      create: { code: roleCode, label: roleCode },
    });

    for (const permCode of permCodes) {
      const perm = await prisma.permission.findUnique({
        where: { code: permCode },
        select: { id: true },
      });
      if (!perm) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  const roleCount = Object.keys(ROLE_PERMISSIONS).length;
  const permCount = Object.keys(PERMISSIONS).length;
  console.log(`  ✓ RBAC: ${roleCount} rôles, ${permCount} permissions`);
}

// ─── 20. Règle de revenus par défaut ─────────────────────────────────────────

async function seedRevenueRules() {
  await prisma.revenueRule.upsert({
    where: { code: 'PLATFORM_DEFAULT' },
    update: {
      name: 'Règle plateforme par défaut',
      creatorSharePct: 70,
      platformSharePct: 30,
      partnerSharePct: 0,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
    create: {
      code: 'PLATFORM_DEFAULT',
      name: 'Règle plateforme par défaut',
      appliesToType: 'PLATFORM_DEFAULT',
      creatorSharePct: 70,
      platformSharePct: 30,
      partnerSharePct: 0,
      isActive: true,
      effectiveFrom: new Date('2024-01-01'),
    },
  });
  console.log('  ✓ revenue rules: 1');
}

// ─── 21. Rightsholder par défaut ──────────────────────────────────────────────

async function seedDefaultRightsholder() {
  const type = await prisma.refRightsholderType.findUnique({
    where: { code: 'PRODUCTION_COMPANY' },
    select: { id: true },
  });
  const country = await prisma.refCountry.findUnique({
    where: { isoCode: 'CI' },
    select: { id: true },
  });

  if (!type || !country) return;

  const existing = await prisma.rightsholder.findFirst({
    where: { displayName: 'IVOD Media Group' },
    select: { id: true },
  });

  if (!existing) {
    await prisma.rightsholder.create({
      data: {
        id: 'default_rightsholder',
        typeId: type.id,
        displayName: 'IVOD Media Group',
        legalName: 'IVOD Media Group SARL',
        countryId: country.id,
        isVerified: true,
      },
    });
  }
  console.log('  ✓ default rightsholder: 1');
}

// ─── 22. Utilisateurs par défaut ──────────────────────────────────────────────

const DEFAULT_PASSWORD = 'Password123!';

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  phone?: string;
  /** Abonnement payant actif (BASIC ou PREMIUM) pour tests lecture sans pub, multi-écrans, etc. */
  subscription?: {
    planCode: 'BASIC' | 'PREMIUM';
    providerCode?: string;
  };
  creator?: {
    stageName: string;
    bio: string;
    verified: boolean;
  };
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'morooumar99@gmail.com',
    firstName: 'Super',
    lastName: 'Admin',
    roleCode: 'SUPER_ADMIN',
  },
  // {
  //   email: 'ouangni@gmail.com',
  //   firstName: 'Romaric',
  //   lastName: 'Ouangni',
  //   roleCode: 'ADMIN',
  // },
  // {
  //   email: 'romaric747@gmail.com',
  //   firstName: 'Romaric',
  //   lastName: 'Ouangni',
  //   roleCode: 'CREATOR',
  //   phone: '+2250708091011',
  //   creator: {
  //     stageName: 'Romaric O.',
  //     bio: 'Réalisateur et producteur — contenus fiction et documentaires pour la plateforme IVOD.',
  //     verified: true,
  //   },
  // },
  // {
  //   email: 'josephyobouet68@gmail.com',
  //   firstName: 'Joseph',
  //   lastName: 'Yoboué',
  //   roleCode: 'VIEWER',
  // },
  // {
  //   email: 'viewer.premium@ivod.africa',
  //   firstName: 'Aya',
  //   lastName: 'Koné',
  //   roleCode: 'VIEWER',
  //   phone: '+2250700000001',
  //   subscription: { planCode: 'PREMIUM', providerCode: 'WAVE' },
  // },
  // {
  //   email: 'viewer.basic@ivod.africa',
  //   firstName: 'Kofi',
  //   lastName: 'Mensah',
  //   roleCode: 'VIEWER',
  //   subscription: { planCode: 'BASIC', providerCode: 'ORANGE_MONEY' },
  // },
];

async function seedUsers() {
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  for (const seedUser of SEED_USERS) {
    const name = `${seedUser.firstName} ${seedUser.lastName}`.trim();

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: { firstName: seedUser.firstName, lastName: seedUser.lastName, name },
      create: {
        email: seedUser.email,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        name,
        phone: seedUser.phone ?? null,
        passwordHash,
        isActive: true,
      },
      select: { id: true },
    });

    // Profil par défaut
    const existingProfile = await prisma.profile.findFirst({
      where: { userId: user.id, isDefault: true },
      select: { id: true },
    });
    if (!existingProfile) {
      await prisma.profile.create({
        data: { userId: user.id, name, isDefault: true },
      });
    }

    // Rôle RBAC
    const role = await prisma.role.findUnique({
      where: { code: seedUser.roleCode },
      select: { id: true },
    });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId: user.id },
        update: { roleId: role.id },
        create: { userId: user.id, roleId: role.id },
      });
    }

    // Profil créateur
    if (seedUser.creator) {
      await prisma.creator.upsert({
        where: { userId: user.id },
        update: {
          stageName: seedUser.creator.stageName,
          bio: seedUser.creator.bio,
          verified: seedUser.creator.verified,
        },
        create: {
          userId: user.id,
          stageName: seedUser.creator.stageName,
          bio: seedUser.creator.bio,
          verified: seedUser.creator.verified,
        },
      });
    }
  }

  console.log(`  ✓ users: ${SEED_USERS.length} (pwd: ${DEFAULT_PASSWORD})`);
}

async function seedUserSubscriptions() {
  const activeStatus = await prisma.refSubscriptionStatus.findUnique({
    where: { code: 'ACTIVE' },
    select: { id: true },
  });
  const completedPayment = await prisma.refPaymentStatus.findUnique({
    where: { code: 'COMPLETED' },
    select: { id: true },
  });
  if (!activeStatus || !completedPayment) {
    console.warn('  ⚠ subscriptions: statuts ACTIVE/COMPLETED manquants — exécutez le seed référentiels');
    return;
  }

  let count = 0;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const seedUser of SEED_USERS) {
    if (!seedUser.subscription) continue;

    const user = await prisma.user.findUnique({
      where: { email: seedUser.email },
      select: { id: true },
    });
    if (!user) continue;

    const plan = await prisma.refUserPlan.findUnique({
      where: { code: seedUser.subscription.planCode },
      select: { id: true, code: true, priceFcfaMonthly: true },
    });
    const provider = await prisma.refPaymentProvider.findUnique({
      where: { code: seedUser.subscription.providerCode ?? 'WAVE' },
      select: { id: true },
    });
    if (!plan || !provider) continue;

    const existingPaid = await prisma.userSubscription.findMany({
      where: {
        userId: user.id,
        plan: { code: { in: ['BASIC', 'PREMIUM'] } },
      },
      select: { id: true },
    });
    if (existingPaid.length > 0) {
      await prisma.payment.deleteMany({
        where: { userSubscriptionId: { in: existingPaid.map((s) => s.id) } },
      });
      await prisma.userSubscription.deleteMany({
        where: { id: { in: existingPaid.map((s) => s.id) } },
      });
    }

    await prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        statusId: activeStatus.id,
        providerId: provider.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        externalId: `seed_sub_${plan.code.toLowerCase()}`,
        payments: {
          create: {
            userId: user.id,
            amount: plan.priceFcfaMonthly,
            currency: 'XOF',
            statusId: completedPayment.id,
            providerId: provider.id,
            transactionId: `seed_tx_${user.id}_${plan.code}`,
            paidAt: now,
          },
        },
      },
    });
    count += 1;
    console.log(`    · ${seedUser.email} → ${plan.code} (ACTIVE jusqu’au ${periodEnd.toLocaleDateString('fr-CI')})`);
  }

  console.log(`  ✓ subscriptions: ${count} abonnement(s) payant(s) actif(s)`);
}

// ─── 23. Nouveaux référentiels (enums convertis) ──────────────────────────────

async function seedReportReasons() {
  const items = [
    { code: 'INAPPROPRIATE', label: 'Contenu inapproprié' },
    { code: 'SPAM', label: 'Spam ou publicité abusive' },
    { code: 'COPYRIGHT', label: "Violation de droits d'auteur" },
    { code: 'MISINFORMATION', label: 'Désinformation' },
    { code: 'OTHER', label: 'Autre' },
  ];
  await upsertMany(prisma.refReportReason, items);
  console.log(`  ✓ ref_report_reasons: ${items.length}`);
}

async function seedReportStatuses() {
  const items = [
    { code: 'PENDING', label: 'En attente' },
    { code: 'REVIEWED', label: 'Examiné' },
    { code: 'DISMISSED', label: 'Classé sans suite' },
    { code: 'ACTIONED', label: 'Action prise' },
  ];
  await upsertMany(prisma.refReportStatus, items);
  console.log(`  ✓ ref_report_statuses: ${items.length}`);
}

async function seedModerationPriorities() {
  const items = [
    { code: 'NORMAL', label: 'Normal' },
    { code: 'HIGH', label: 'Haute priorité' },
    { code: 'URGENT', label: 'Urgent' },
  ];
  await upsertMany(prisma.refModerationPriority, items);
  console.log(`  ✓ ref_moderation_priorities: ${items.length}`);
}

async function seedModerationStatuses() {
  const items = [
    { code: 'PENDING', label: "En attente d'examen" },
    { code: 'IN_REVIEW', label: "En cours d'examen" },
    { code: 'DONE', label: 'Terminé' },
  ];
  await upsertMany(prisma.refModerationStatus, items);
  console.log(`  ✓ ref_moderation_statuses: ${items.length}`);
}

async function seedSecurityLogActions() {
  const items = [
    { code: 'LOGIN', label: 'Connexion réussie' },
    { code: 'LOGOUT', label: 'Déconnexion' },
    { code: 'TOKEN_REFRESH', label: 'Rafraîchissement du token' },
    { code: 'PASSWORD_CHANGE', label: 'Changement de mot de passe' },
    { code: 'FAILED_LOGIN', label: 'Échec de connexion' },
    { code: 'LOGIN_FAILED', label: 'Échec de connexion (alias)' },
    { code: 'ACCOUNT_LOCKED', label: 'Compte verrouillé' },
    { code: 'SUSPICIOUS_ACCESS', label: 'Accès suspect' },
    { code: 'MFA_ENABLED', label: 'Authentification à deux facteurs activée' },
    { code: 'TOKEN_REVOKED', label: 'Token révoqué' },
  ];
  await upsertMany(prisma.refSecurityLogAction, items);
  console.log(`  ✓ ref_security_log_actions: ${items.length}`);
}

async function seedTransactionTypes() {
  const items = [
    { code: 'DEBIT', label: 'Débit' },
    { code: 'CREDIT', label: 'Crédit' },
    { code: 'REFUND', label: 'Remboursement' },
    { code: 'CHARGEBACK', label: 'Litige' },
  ];
  await upsertMany(prisma.refTransactionType, items);
  console.log(`  ✓ ref_transaction_types: ${items.length}`);
}

async function seedInvoiceStatuses() {
  const items = [
    { code: 'DRAFT', label: 'Brouillon' },
    { code: 'ISSUED', label: 'Émise' },
    { code: 'PAID', label: 'Payée' },
    { code: 'VOID', label: 'Annulée' },
  ];
  await upsertMany(prisma.refInvoiceStatus, items);
  console.log(`  ✓ ref_invoice_statuses: ${items.length}`);
}

async function seedRefundStatuses() {
  const items = [
    { code: 'REQUESTED', label: 'Demandé' },
    { code: 'APPROVED', label: 'Approuvé' },
    { code: 'PROCESSED', label: 'Traité' },
    { code: 'REJECTED', label: 'Refusé' },
  ];
  await upsertMany(prisma.refRefundStatus, items);
  console.log(`  ✓ ref_refund_statuses: ${items.length}`);
}

async function seedRevenueStatementStatuses() {
  const items = [
    { code: 'DRAFT', label: 'Brouillon' },
    { code: 'LOCKED', label: 'Verrouillé' },
    { code: 'PAID', label: 'Payé' },
  ];
  await upsertMany(prisma.refRevenueStatementStatus, items);
  console.log(`  ✓ ref_revenue_statement_statuses: ${items.length}`);
}

async function seedBeneficiaryTypes() {
  const items = [
    { code: 'RIGHTSHOLDER', label: 'Détenteur de droits' },
    { code: 'CREATOR', label: 'Créateur' },
    { code: 'PARTNER', label: 'Partenaire' },
  ];
  await upsertMany(prisma.refBeneficiaryType, items);
  console.log(`  ✓ ref_beneficiary_types: ${items.length}`);
}

async function seedContentRightStatuses() {
  const items = [
    { code: 'ACTIVE', label: 'Actif' },
    { code: 'EXPIRED', label: 'Expiré' },
    { code: 'SUSPENDED', label: 'Suspendu' },
  ];
  await upsertMany(prisma.refContentRightStatus, items);
  console.log(`  ✓ ref_content_right_statuses: ${items.length}`);
}

async function seedMediaAssetTypes() {
  const items = [
    { code: 'THUMBNAIL', label: 'Miniature' },
    { code: 'POSTER', label: 'Affiche' },
    { code: 'BANNER', label: 'Bannière' },
    { code: 'TEASER', label: 'Teaser' },
    { code: 'TRAILER', label: 'Bande-annonce' },
    { code: 'CLIP', label: 'Extrait' },
    { code: 'MAKING_OF', label: 'Making-of' },
    { code: 'SCREENSHOT', label: "Capture d'écran" },
  ];
  await upsertMany(prisma.refMediaAssetType, items);
  console.log(`  ✓ ref_media_asset_types: ${items.length}`);
}

async function seedLiveStreamStatuses() {
  const items = [
    { code: 'SCHEDULED', label: 'Planifié' },
    { code: 'LIVE', label: 'En direct' },
    { code: 'ENDED', label: 'Terminé' },
    { code: 'CANCELLED', label: 'Annulé' },
  ];
  await upsertMany(prisma.refLiveStreamStatus, items);
  console.log(`  ✓ ref_live_stream_statuses: ${items.length}`);
}

async function seedCampaignTypes() {
  const items = [
    { code: 'PROMO_CODE', label: 'Code promo' },
    { code: 'EMAIL', label: 'Email marketing' },
    { code: 'PUSH', label: 'Notification push' },
    { code: 'IN_APP_BANNER', label: 'Bannière in-app' },
  ];
  await upsertMany(prisma.refCampaignType, items);
  console.log(`  ✓ ref_campaign_types: ${items.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding IVOD database...\n');

  console.log('📚 Référentiels (tables stables)');
  await seedLanguages();
  await seedCountries();
  await seedCurrencies();
  await seedGenres();
  await seedContentTypes();
  await seedContentStatuses();
  await seedContentVisibilities();
  await seedMaturityRatings();
  await seedUserRoleRefs();
  await seedUserPlans();
  await seedSubscriptionStatuses();
  await seedPaymentProviders();
  await seedPaymentStatuses();
  await seedRightsholderTypes();
  await seedMonetizationTypes();
  await seedTerritoryCodes();
  await seedCrewRoles();
  await seedAwardTypes();

  console.log('\n📚 Référentiels (enums convertis)');
  await seedReportReasons();
  await seedReportStatuses();
  await seedModerationPriorities();
  await seedModerationStatuses();
  await seedSecurityLogActions();
  await seedTransactionTypes();
  await seedInvoiceStatuses();
  await seedRefundStatuses();
  await seedRevenueStatementStatuses();
  await seedBeneficiaryTypes();
  await seedContentRightStatuses();
  await seedMediaAssetTypes();
  await seedLiveStreamStatuses();
  await seedCampaignTypes();

  console.log('\n🔐 RBAC');
  await seedRBAC();

  console.log('\n💰 Revenus');
  await seedRevenueRules();

  console.log('\n🏢 Données métier');
  await seedDefaultRightsholder();

  console.log('\n👤 Utilisateurs');
  await seedUsers();

  console.log('\n💳 Abonnements test');
  await seedUserSubscriptions();

  console.log('\n✅ Seed terminé.');
  console.log('\n📋 Comptes viewer avec plan payant (mot de passe : ' + DEFAULT_PASSWORD + ')');
  console.log('   • viewer.premium@ivod.africa  → PREMIUM (sans pub, 4 écrans, FHD)');
  console.log('   • viewer.basic@ivod.africa    → BASIC (sans pub, 2 écrans, HD)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
