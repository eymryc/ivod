# iVOD Web — Design tokens

Référence pour designers & développeurs. Implémentation : `app/globals.css`, `lib/design/tokens.ts`.

## Typographie

| Rôle | Police | Usage |
|------|--------|--------|
| **Display** | Rajdhani 600/700 | Titres, nav, KPI, kickers |
| **Body** | Inter 400/500/600 | Synopsis, formulaires, tableaux, légal |

Classes : `.font-display`, `.font-body`, `.text-body-lg`, `.text-body`, `.text-caption`

## Couleurs texte (contraste AA visé)

| Token | Valeur | Usage |
|-------|--------|--------|
| `--text-primary` | white 92% | Titres, labels |
| `--text-secondary` | white 72% | Corps, meta |
| `--text-muted` | white 58% | Hints, captions |

## Dégradé — tiering

1. **Full gradient** (`ivod-gradient`, `ivod-btn-primary`) — hero, 1 CTA principal / page
2. **Magenta uni** (`ivod-btn-secondary`) — actions secondaires
3. **Ghost** (`ivod-btn-ghost`) — tertiaire, filtres

## Géométrie

Charte **cinéma angulaire** : `border-radius: 0` sur cartes, boutons, panels. Exceptions : play orb (cercle), avatars profil (carré).

## Thèmes

- **Dark** (défaut) — viewer, catalogue, lecteur
- **Light** (`.theme-light`) — auth, paramètres, formulaires longs

## Motion

- Easing premium : `cubic-bezier(0.22, 1, 0.36, 1)`
- `prefers-reduced-motion` respecté partout (Framer + CSS)
- Entrée page : `.ivod-page-enter`

## Composants clés

- `RAIL_SCROLL_CLASS` — rails horizontaux
- `TrustPaymentBar` — confiance paiement FCFA
- `ContentDetailTabs` — fiche contenu
- `EmptyStateIllustration` — états vides studio/admin
