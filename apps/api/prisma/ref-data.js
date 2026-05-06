/**
 * ref-data.js — SOURCE CANONIQUE UNIQUE pour tous les codes de référence.
 *
 * Ce fichier est la SEULE source de vérité pour les codes stockés en base.
 * - Le script de seed (seed-categories.js) l'importe pour peupler la DB.
 * - Les constantes TypeScript (src/common/constants/content.constants.ts) s'alignent sur ces valeurs.
 * - Le RefDataGuardService valide au démarrage que la DB contient bien ces codes.
 *
 * ⚠️  Pour ajouter un nouveau code : modifier ce fichier UNIQUEMENT,
 *     puis mettre à jour content.constants.ts et relancer le seed.
 */

// ─── Statuts de contenu ───────────────────────────────────────────────────────
// Machine à états :
//   SINGLE : DRAFT → UPLOADING → PROCESSING → READY → PUBLISHED / REJECTED / ARCHIVED
//   SERIES : DRAFT ──────────────────────────→ READY → PUBLISHED / REJECTED / ARCHIVED
//   EPISODE: DRAFT → UPLOADING → PROCESSING → READY → PUBLISHED / REJECTED
const CONTENT_STATUSES = [
  { code: 'DRAFT',      label: 'Brouillon' },
  { code: 'UPLOADING',  label: 'Upload en cours' },
  { code: 'PROCESSING', label: 'Traitement en cours' },
  { code: 'READY',      label: 'Prêt — en attente de validation' },
  { code: 'PUBLISHED',  label: 'Publié' },
  { code: 'REJECTED',   label: 'Rejeté' },
  { code: 'ARCHIVED',   label: 'Archivé' },
];

// ─── Visibilités de contenu ───────────────────────────────────────────────────
const CONTENT_VISIBILITIES = ['PUBLIC', 'PREMIUM_ONLY', 'PPV', 'PRIVATE'];

// ─── Types de contenu (code affichage → typeCode interne) ────────────────────
// typeCode est utilisé pour distinguer les contenus épisodiques (SERIES/WEB_SERIES)
const CONTENT_TYPES = [
  { code: 'SINGLE',     typeCode: 'SINGLE'     },
  { code: 'SERIES',     typeCode: 'SERIES'     },
  { code: 'WEB_SERIES', typeCode: 'WEB_SERIES' },
];

// ─── Plans utilisateur ────────────────────────────────────────────────────────
const USER_PLANS = [
  {
    code: 'FREE',
    label: 'Gratuit',
    priceFcfaMonthly: 0,
    maxScreens: 1,
    videoQuality: 'SD',
    hasAds: true,
    maxOfflineDownloads: 0,
    hasExclusiveAccess: false,
  },
  {
    code: 'PREMIUM',
    label: 'Premium',
    priceFcfaMonthly: 1000,
    maxScreens: 1,
    videoQuality: 'HD',
    hasAds: false,
    maxOfflineDownloads: 5,
    hasExclusiveAccess: true,
  },
  {
    code: 'PREMIUM_PLUS',
    label: 'Premium+',
    priceFcfaMonthly: 2000,
    maxScreens: 3,
    videoQuality: 'FULL_HD',
    hasAds: false,
    maxOfflineDownloads: 20,
    hasExclusiveAccess: true,
  },
];

// ─── Rôles utilisateur ────────────────────────────────────────────────────────
const USER_ROLES = ['VIEWER', 'CREATOR', 'ADMIN'];

// ─── Statuts d'abonnement ─────────────────────────────────────────────────────
const SUBSCRIPTION_STATUSES = ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'];

// ─── Catégories de contenu ────────────────────────────────────────────────────
const CATEGORY_CODES = [
  'Action',
  'Drame',
  'Comédie',
  'Romance',
  'Famille',
  'Horreur',
  'Thriller',
  'Aventure',
  'Animation',
  'Documentaire',
  'Policier',
  'Science-Fiction',
  'Historique',
  'Musical',
  'Biographie',
];

// ─── Fournisseurs de paiement ─────────────────────────────────────────────────
const PAYMENT_PROVIDERS = ['CINETPAY', 'STRIPE', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO'];

// ─── Statuts de paiement ──────────────────────────────────────────────────────
const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'];

module.exports = {
  CONTENT_STATUSES,
  CONTENT_VISIBILITIES,
  CONTENT_TYPES,
  USER_PLANS,
  USER_ROLES,
  SUBSCRIPTION_STATUSES,
  CATEGORY_CODES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
};
