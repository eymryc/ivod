export const COMPARE_ROWS = [
  { label: "Publicité", free: "Oui", paid: "Non" },
  { label: "Qualité max.", free: "SD", paid: "HD / Full HD" },
  { label: "Écrans simultanés", free: "1", paid: "Jusqu'à 4" },
  { label: "Téléchargements", free: "—", paid: "Selon le plan" },
  { label: "Exclusivités", free: "—", paid: "Premium" },
] as const;

export const PRICING_FAQ = [
  {
    q: "Comment payer ?",
    a: "Tous les paiements passent par une passerelle sécurisée : carte bancaire ou Mobile Money selon les options proposées sur la page de paiement. Montants en FCFA (XOF). iVOD ne débite pas directement Wave, Orange Money ou MTN.",
  },
  {
    q: "Quelle différence entre gratuit et Premium ?",
    a: "Le compte gratuit donne accès aux contenus publics avec publicité. Les passes et Premium débloquent le catalogue abonnés, sans pub, en meilleure qualité et avec téléchargements selon le plan.",
  },
  {
    q: "Puis-je acheter un seul film ?",
    a: "Oui. Les titres « à l'unité » (TVOD) se paient une fois sur la fiche du contenu — accès illimité après achat, sans abonnement.",
  },
  {
    q: "Le pass 24h se renouvelle-t-il automatiquement ?",
    a: "Non, sauf si vous souscrivez à nouveau. Le pass expire à la fin de la période (24h, 7 jours ou 30 jours selon l'offre).",
  },
  {
    q: "Comment annuler ?",
    a: "Les passes ne se renouvellent pas automatiquement. Pour Premium, annulez dans Paramètres → Abonnement : l'accès reste actif jusqu'à la fin de la période payée.",
  },
] as const;
