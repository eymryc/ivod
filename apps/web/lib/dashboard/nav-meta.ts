export type DashboardVariant = "admin" | "studio";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface DashboardNavMeta {
  section: string;
  title: string;
  description?: string;
  breadcrumbs: BreadcrumbItem[];
}

type RouteRule = {
  pattern: RegExp;
  meta: (pathname: string) => DashboardNavMeta;
};

const ADMIN_RULES: RouteRule[] = [
  {
    pattern: /^\/admin\/contents\/[^/]+\/geo$/,
    meta: () => ({
      section: "Contenus",
      title: "Restrictions géographiques",
      description: "Zones autorisées ou bloquées pour la diffusion",
      breadcrumbs: [
        { label: "Admin", href: "/admin" },
        { label: "Contenus", href: "/admin/contents" },
        { label: "Géo" },
      ],
    }),
  },
  {
    pattern: /^\/admin\/creators\/new$/,
    meta: () => ({
      section: "Créateurs",
      title: "Nouveau créateur",
      description: "Associer un compte utilisateur au profil créateur",
      breadcrumbs: [
        { label: "Admin", href: "/admin" },
        { label: "Créateurs", href: "/admin/creators" },
        { label: "Nouveau" },
      ],
    }),
  },
  {
    pattern: /^\/admin\/contents$/,
    meta: () => ({
      section: "Contenus",
      title: "Contenus",
      description: "Lire, valider et publier les œuvres des créateurs",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Contenus" }],
    }),
  },
  {
    pattern: /^\/admin\/moderation$/,
    meta: () => ({
      section: "Confiance",
      title: "Signalements",
      description: "Contenus et comportements signalés par la communauté",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Signalements" }],
    }),
  },
  {
    pattern: /^\/admin\/users$/,
    meta: () => ({
      section: "Comptes",
      title: "Utilisateurs",
      description: "Rôles, plans et statut des comptes",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Utilisateurs" }],
    }),
  },
  {
    pattern: /^\/admin\/creators$/,
    meta: () => ({
      section: "Créateurs",
      title: "Créateurs",
      description: "Profils uploaders et accès studio",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Créateurs" }],
    }),
  },
  {
    pattern: /^\/admin\/banners\/new$/,
    meta: () => ({
      section: "Marketing",
      title: "Nouvelle bannière",
      description: "Assistant de création — hero homepage",
      breadcrumbs: [
        { label: "Admin", href: "/admin" },
        { label: "Bannières", href: "/admin/banners" },
        { label: "Nouvelle" },
      ],
    }),
  },
  {
    pattern: /^\/admin\/banners\/[^/]+\/edit$/,
    meta: () => ({
      section: "Marketing",
      title: "Modifier la bannière",
      description: "Assistant d'édition — hero homepage",
      breadcrumbs: [
        { label: "Admin", href: "/admin" },
        { label: "Bannières", href: "/admin/banners" },
        { label: "Édition" },
      ],
    }),
  },
  {
    pattern: /^\/admin\/banners$/,
    meta: () => ({
      section: "Marketing",
      title: "Bannières",
      description: "Visuels homepage et campagnes éditoriales",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Bannières" }],
    }),
  },
  {
    pattern: /^\/admin\/campaigns$/,
    meta: () => ({
      section: "Marketing",
      title: "Campagnes",
      description: "Promotions et messages ciblés",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Campagnes" }],
    }),
  },
  {
    pattern: /^\/admin\/revenue$/,
    meta: () => ({
      section: "Finance",
      title: "Revenus & paiements",
      description: "Transactions, abonnements et partage",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Finance" }],
    }),
  },
  {
    pattern: /^\/admin\/rightsholders$/,
    meta: () => ({
      section: "Juridique",
      title: "Ayants droit",
      description: "Contrats et répartition des revenus",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Droits" }],
    }),
  },
  {
    pattern: /^\/admin\/references$/,
    meta: () => ({
      section: "Système",
      title: "Référentiels",
      description: "Statuts, types, rôles et tables de référence",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Référentiels" }],
    }),
  },
  {
    pattern: /^\/admin\/security-logs$/,
    meta: () => ({
      section: "Sécurité",
      title: "Journaux de sécurité",
      description: "Connexions, alertes et événements sensibles",
      breadcrumbs: [{ label: "Admin", href: "/admin" }, { label: "Sécurité" }],
    }),
  },
  {
    pattern: /^\/admin\/?$/,
    meta: () => ({
      section: "Vue d'ensemble",
      title: "Tableau de bord",
      description: "KPIs plateforme, alertes et activité récente",
      breadcrumbs: [{ label: "Admin" }],
    }),
  },
];

const STUDIO_RULES: RouteRule[] = [
  {
    pattern: /^\/studio\/contents\/[^/]+\/episodes\/[^/]+\/upload$/,
    meta: () => ({
      section: "Production",
      title: "Upload épisode",
      description: "Envoi et transcodage de la vidéo",
      breadcrumbs: [
        { label: "Studio", href: "/studio" },
        { label: "Contenus", href: "/studio/contents" },
        { label: "Épisode", href: "/studio/contents" },
        { label: "Upload" },
      ],
    }),
  },
  {
    pattern: /^\/studio\/contents\/[^/]+\/episodes$/,
    meta: () => ({
      section: "Séries",
      title: "Épisodes",
      description: "Saisons, numérotation et statut vidéo",
      breadcrumbs: [
        { label: "Studio", href: "/studio" },
        { label: "Contenus", href: "/studio/contents" },
        { label: "Épisodes" },
      ],
    }),
  },
  {
    pattern: /^\/studio\/contents\/[^/]+\/upload$/,
    meta: () => ({
      section: "Production",
      title: "Upload vidéo",
      description: "Pipeline MinIO → transcodage multi-qualités",
      breadcrumbs: [
        { label: "Studio", href: "/studio" },
        { label: "Contenus", href: "/studio/contents" },
        { label: "Upload" },
      ],
    }),
  },
  {
    pattern: /^\/studio\/contents\/[^/]+\/cast$/,
    meta: () => ({
      section: "Fiche",
      title: "Distribution",
      description: "Casting et équipe artistique",
      breadcrumbs: [
        { label: "Studio", href: "/studio" },
        { label: "Contenus", href: "/studio/contents" },
        { label: "Distribution" },
      ],
    }),
  },
  {
    pattern: /^\/studio\/contents\/[^/]+\/awards$/,
    meta: () => ({
      section: "Fiche",
      title: "Récompenses",
      description: "Prix et distinctions du contenu",
      breadcrumbs: [
        { label: "Studio", href: "/studio" },
        { label: "Contenus", href: "/studio/contents" },
        { label: "Récompenses" },
      ],
    }),
  },
  {
    pattern: /^\/studio\/contents\/[^/]+$/,
    meta: (pathname) => {
      const id = pathname.split("/")[3];
      return {
        section: "Fiche",
        title: "Modifier le contenu",
        description: "Métadonnées, visuels et publication",
        breadcrumbs: [
          { label: "Studio", href: "/studio" },
          { label: "Contenus", href: "/studio/contents" },
          { label: id ? `…${id.slice(-6)}` : "Détail" },
        ],
      };
    },
  },
  {
    pattern: /^\/studio\/contents\/new$/,
    meta: () => ({
      section: "Catalogue",
      title: "Nouveau contenu",
      description: "Créer une fiche film ou série",
      breadcrumbs: [
        { label: "Studio", href: "/studio" },
        { label: "Contenus", href: "/studio/contents" },
        { label: "Nouveau" },
      ],
    }),
  },
  {
    pattern: /^\/studio\/contents\/?$/,
    meta: () => ({
      section: "Catalogue",
      title: "Mes contenus",
      description: "Films, séries et statut de publication",
      breadcrumbs: [{ label: "Studio", href: "/studio" }, { label: "Contenus" }],
    }),
  },
  {
    pattern: /^\/studio\/analytics$/,
    meta: () => ({
      section: "Performance",
      title: "Statistiques",
      description: "Vues, abonnés et tendances",
      breadcrumbs: [{ label: "Studio", href: "/studio" }, { label: "Statistiques" }],
    }),
  },
  {
    pattern: /^\/studio\/revenue$/,
    meta: () => ({
      section: "Finance",
      title: "Revenus",
      description: "Gains, partages et historique",
      breadcrumbs: [{ label: "Studio", href: "/studio" }, { label: "Revenus" }],
    }),
  },
  {
    pattern: /^\/studio\/?$/,
    meta: () => ({
      section: "Vue d'ensemble",
      title: "Tableau de bord",
      description: "Audience, top contenus et activité récente",
      breadcrumbs: [{ label: "Studio" }],
    }),
  },
];

const FALLBACK: Record<DashboardVariant, DashboardNavMeta> = {
  admin: {
    section: "Administration",
    title: "Espace admin",
    breadcrumbs: [{ label: "Admin", href: "/admin" }],
  },
  studio: {
    section: "Creator Studio",
    title: "Espace créateur",
    breadcrumbs: [{ label: "Studio", href: "/studio" }],
  },
};

export function resolveDashboardNavMeta(
  variant: DashboardVariant,
  pathname: string,
): DashboardNavMeta {
  const rules = variant === "admin" ? ADMIN_RULES : STUDIO_RULES;
  for (const rule of rules) {
    if (rule.pattern.test(pathname)) {
      return rule.meta(pathname);
    }
  }
  return FALLBACK[variant];
}
