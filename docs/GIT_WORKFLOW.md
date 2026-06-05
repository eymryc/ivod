# Tutoriel Git/GitHub Complet — Architecture 3 Équipes

## ✅ Prérequis (déjà faits)

- [x] 1 repo GitHub : `eymryc/ivod`
- [x] 3 teams créées : `team-api`, `team-web`, `team-mobile`
- [x] Fichiers créés : `.github/CODEOWNERS`, `.github/workflows/ci.yml`, `.github/pull_request_template.md`

---

## Étape 1 : Ajouter les Teams au Repository

### 1.1 Accéder aux paramètres du repo

1. Allez sur `https://github.com/eymryc/ivod`
2. Cliquez sur **Settings** (dernier onglet en haut)
3. Dans le menu à gauche, cliquez sur **Collaborators and teams**

### 1.2 Ajouter chaque team

Cliquez sur **Add teams** et ajoutez :

| Team | Permission | Rôle |
|------|-----------|------|
| `team-api` | Write | Push sur API |
| `team-web` | Write | Push sur Web |
| `team-mobile` | Write | Push sur Mobile |
| `leads` | Admin | Gestion complète |

> **Write** = peut créer des branches, ouvrir des PR, merger après review  
> **Admin** = peut modifier les settings, forcer des merges

---

## Étape 2 : Configurer les Branches Protégées

### 2.1 Créer la branche `develop`

```bash
# Dans votre terminal local
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### 2.2 Protection de `main` (production)

1. GitHub → `ivod` → Settings → **Branches**
2. Cliquez **Add branch protection rule**
3. Configurez :

```
Branch name pattern: main

☑️ Restrict updates
☑️ Require pull request reviews before merging
   → Required approving reviews: 1
   → ☑️ Dismiss stale PR approvals when new commits are pushed
   → ☑️ Require review from CODEOWNERS

☑️ Require status checks to pass
   → Search for checks: "CI" → ✅ cocher
   → ☑️ Require branches to be up to date before merging

☑️ Require conversation resolution before merging

☑️ Include administrators (même les admins doivent passer par PR)

❌ Allow force pushes → DÉCOCHÉ
❌ Allow deletions → DÉCOCHÉ
```

### 2.3 Protection de `develop` (intégration)

Ajoutez une 2ème règle :

```
Branch name pattern: develop

☑️ Require pull request reviews before merging
   → Required approving reviews: 1 (ou 0 pour plus rapide)

☑️ Require status checks to pass
   → ✅ cocher "CI"
```

> 💡 Sur `develop`, vous pouvez mettre 0 reviewer si vous faites confiance aux devs,  
> mais 1 reviewer est recommandé pour la qualité.

---

## Étape 3 : Modifier CODEOWNERS avec vos vrais noms

Ouvrez `.github/CODEOWNERS` et remplacez :

```
# AVANT (faux)
/apps/api/          @votre-org/team-api

# APRÈS (vrai)
/apps/api/          @eymryc/team-api
/apps/web/          @eymryc/team-web
/apps/mobile/       @eymryc/team-mobile
```

> **Note** : Le format est `@org/team-name` ou `@username` pour une personne.

Commit et push :
```bash
git add .github/CODEOWNERS
git commit -m "chore: update CODEOWNERS with actual team names"
git push origin main
```

---

## Étape 4 : Workflow Quotidien par Équipe

### 🔵 Équipe API — Nouvelle feature

```bash
# 1. Se mettre à jour
git checkout develop
git pull origin develop

# 2. Créer une branche de feature
git checkout -b feat/api-auth-otp

# 3. Développer...
#    Modifier apps/api/src/modules/auth/...

# 4. Commit

git add .
git commit -m "feat(api): add OTP authentication endpoint

- Generate 6-digit OTP
- Send via email
- Verify with 5min expiry"

# 5. Push
git push -u origin feat/api-auth-otp

# 6. Aller sur GitHub → Pull Requests → New PR
#    Base: develop ← Compare: feat/api-auth-otp
#    La review sera automatiquement demandée à @eymryc/team-api
```

### 🟢 Équipe Web — Nouvelle feature

```bash
git checkout develop
git pull origin develop
git checkout -b feat/web-player-controls

# Développer dans apps/web/...

git add .
git commit -m "feat(web): add player control bar"
git push -u origin feat/web-player-controls

# PR vers develop → review par @eymryc/team-web
```

### 🟠 Équipe Mobile — Nouvelle feature

```bash
git checkout develop
git pull origin develop
git checkout -b feat/mobile-download-offline

# Développer dans apps/mobile/...

git add .
git commit -m "feat(mobile): offline video download"
git push -u origin feat/mobile-download-offline

# PR vers develop → review par @eymryc/team-mobile
```

---

## Étape 5 : Processus de Release (hebdomadaire)

Quand `develop` est stable et testé :

```bash
# 1. Créer une branche de release (optionnel mais propre)
git checkout develop
git pull origin develop
git checkout -b release/2024-06-05
git push -u origin release/2024-06-05

# 2. Sur GitHub : New Pull Request
#    Base: main ← Compare: develop (ou release/2024-06-05)
#    Titre: "Release 2024-06-05 — Auth & Player improvements"

# 3. La CI doit être verte ✅
# 4. 1 review de @eymryc/leads minimum
# 5. Merge → "Create a merge commit" (pas squash pour garder l'historique)

# 6. Tag la version
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Version 1.2.0 — Auth OTP & Player controls"
git push origin v1.2.0
```

---

## Étape 6 : Hotfix Urgent (production)

Un bug critique en prod ? Ne passez PAS par `develop`.

```bash
# 1. Partir de main
git checkout main
git pull origin main
git checkout -b hotfix/payment-crash

# 2. Corriger le bug (modif minimale !)
#    Dans apps/api/src/modules/payments/...

# 3. Commit & push
git add .
git commit -m "hotfix(api): fix null pointer in payment callback"
git push -u origin hotfix/payment-crash

# 4. PR vers main (pas develop !)
#    ⚠️ Cochez "Allow emergency merge" si besoin

# 5. Après merge sur main, backporter sur develop :
git checkout develop
git pull origin develop
git merge origin/main
git push origin develop
```

---

## Étape 7 : Commandes de Base à Connaître

### Rebase (si la branche est "outdated")

```bash
git checkout feat/api-auth-otp
git fetch origin
git rebase origin/develop

# Si conflits : résoudre, puis
git add .
git rebase --continue

git push --force-with-lease  # ⚠️ jamais sur main/develop !
```

### Annuler un commit local (pas pushé)

```bash
git reset HEAD~1
# ou pour garder les modifs
git reset --soft HEAD~1
```

### Voir qui a modifié quoi

```bash
git blame apps/api/src/modules/auth/auth.service.ts
```

---

## Règles d'Or à Respecter

| ❌ Interdit | ✅ Obligatoire |
|-------------|----------------|
| Push direct sur `main` | Toujours passer par une PR |
| Push direct sur `develop` | Toujours passer par une PR |
| Force push sur `main`/`develop` | Rebase uniquement sur branches perso |
| Commit sans message clair | Message au format `type(scope): description` |
| PR de 500+ lignes | Split en petites PRs reviewables |
| Merge sans CI verte | Attendre ✅ sur la PR |

---

## Types de Commit Conventionnels

```
feat:     nouvelle feature
fix:      correction de bug
refactor: restructuration sans changement fonctionnel
docs:     documentation
test:     tests
chore:    tâches de maintenance (deps, config, etc.)
style:    formatage (espaces, points-virgules)
```

Exemples :
```
feat(api): add JWT refresh token endpoint
fix(web): correct player aspect ratio on mobile
refactor(api): simplify payment provider factory
docs: update README with Docker instructions
```

---

## Vérification Finale

Avant de dire "c'est prêt", vérifiez :

- [ ] Les 4 teams ont été ajoutées au repo avec permission Write
- [ ] Branch protection activée sur `main` (1 reviewer + CI)
- [ ] Branch protection activée sur `develop` (1 reviewer + CI)
- [ ] `CODEOWNERS` contient `@eymryc/team-*` (pas `@votre-org`)
- [ ] Branche `develop` existe et est à jour
- [ ] Chaque dev a fait un test : créer branche → push → ouvrir PR

---

## Besoin d'Aide ?

| Problème | Solution |
|----------|----------|
| "Cannot push to protected branch" | Créer une PR, ne pas push direct |
| "Review required from CODEOWNERS" | Attendre qu'un membre de la team approuve |
| "CI failed" | Cliquer sur "Details" → voir l'erreur → corriger → push |
| Conflit sur la PR | Local : `git checkout ma-branche && git merge origin/develop` |

---

**Votre workflow Git est maintenant prêt !** 🚀
