# Mamie SEO — Journal de modifications

## 2026-04-07 — Implémentation Product_Full_Spec.md

### Phase 1 : Landing Page (Spec A1) — DONE
- [x] Hero redesign : nouveau titre "Votre site attire-t-il vraiment vos futurs clients ?"
- [x] Suppression champ email avant analyse (URL seulement)
- [x] Animated placeholder : typing effect cyclant entre 5 URLs de freelances
- [x] Validation URL en temps réel (bordure verte/rouge)
- [x] Auto-prepend https:// si manquant
- [x] Social proof : avatars + compteur "+1 200 analyses ce mois"
- [x] Badges de confiance : Gratuit / Résultat en 60s / Sans installation
- [x] Section témoignages : 3 quotes de freelances
- [x] Auto-focus sur l'input URL au chargement (desktop)
- [x] Redirect direct vers /analyzing (skip onboarding)

### Phase 2 : Page d'analyse / Chargement (Spec A2) — DONE
- [x] Affichage du domaine analysé en grand
- [x] Biais cognitifs : 14 tips rotatifs catégorisés (curiosity, loss, authority, social, insight)
- [x] Micro-découvertes en temps réel (HTTPS, CMS, Sitemap, Pages détectés progressivement)
- [x] Tips rotatifs avec type indicator et smooth transition (fade in/out)
- [x] Progress ring amélioré avec pourcentage et cubic-bezier
- [x] Timer de temps investi (sunk cost bias)
- [x] Compteur d'éléments analysés (Zeigarnik effect)
- [x] Layout deux colonnes : progression + découvertes
- [x] Prompt création compte après analyse (si non connecté)

### Phase 3 : Rapport — Blur Gate (Spec A3 + A4) — DONE
- [x] Vue partielle : score global + tech + top 3 critiques visibles pour tous
- [x] Gate de conversion : blur CSS + overlay "Voir le rapport complet"
- [x] CTA créer un compte + lien connexion
- [x] Vue complète pour utilisateurs connectés (all sections)
- [x] CTA contact doux (Cal.com si configuré + lien /contact)
- [x] Section upsell Analyse UI Pro en bas de rapport
- [x] Message rassurant dans le gate

### Phase 4 : Dashboard (Spec A5) — DONE
- [x] Évolution du score entre analyses (badge +X pts ou -X pts)
- [x] Groupement par domaine pour calculer la progression
- [x] Bouton "Relancer l'analyse" sur chaque rapport
- [x] Layout amélioré avec re-analyze inline

### Phase 5 : Contact & CTA — DONE
- [x] Page /contact avec formulaire pré-rempli (contexte rapport)
- [x] Sujets prédéfinis (audit, SEO, refonte, autre)
- [x] Intégration Cal.com (variable d'env NEXT_PUBLIC_CAL_LINK)
- [x] API /api/contact : sauvegarde en base + notification email Brevo
- [x] Page de confirmation après envoi

### Phase 6 : Base de données — DONE
- [x] Table contact_requests ajoutée au schema
- [x] Table ip_rate_limits ajoutée au schema
- [x] Index sur email et status

### Phase 7 : API — DONE
- [x] /api/crawl : email et onboarding optionnels (defaults fournis)
- [x] /api/contact : nouvelle route (POST)
- [x] Rate limiting IP-only pour utilisateurs anonymes
- [x] Message d'erreur invitant à créer un compte

---

## Historique des modifications

| Date | Fichier | Modification |
|------|---------|-------------|
| 2026-04-07 | app/page.tsx | Landing page redesign : animated placeholder, social proof, no email, testimonials |
| 2026-04-07 | app/analyzing/page.tsx | Cognitive biases, micro-discoveries, 2-column layout, element counter |
| 2026-04-07 | app/report/[id]/page.tsx | Blur gate pour non-connectés, CTA contact, section upsell Pro |
| 2026-04-07 | app/dashboard/page.tsx | Score evolution badges, re-analyze button, domain grouping |
| 2026-04-07 | app/contact/page.tsx | NOUVEAU — page contact avec formulaire pré-rempli |
| 2026-04-07 | app/api/contact/route.ts | NOUVEAU — API contact (save + email notification) |
| 2026-04-07 | app/api/crawl/route.ts | Email et onboarding optionnels, defaults |
| 2026-04-07 | lib/supabase.ts | Rate limiting IP-only pour anonymes, message mis à jour |
| 2026-04-07 | supabase-schema.sql | Tables contact_requests et ip_rate_limits ajoutées |
| 2026-04-07 | app/api/link-reports/route.ts | Accept reportId + userId directly, retry logic |
| 2026-04-07 | app/analyzing/page.tsx | Fix: controlled email state, get userId from auth, link by reportId |
| 2026-04-07 | app/signup/page.tsx | Fix: preserve pending report, auto-link if auto-confirmed |
| 2026-04-07 | app/login/page.tsx | Fix: link pending reports after login via userId |
| 2026-04-07 | components/AuthProvider.tsx | Fix: selective signOut cleanup, auto-link on SIGNED_IN event |
| 2026-04-07 | app/report/[id]/page.tsx | Fix: blur gate saves mamie_pending_report before redirect |

---

## Variables d'environnement ajoutées

| Variable | Requis | Description |
|----------|--------|-------------|
| NEXT_PUBLIC_CAL_LINK | Non | Lien Cal.com pour les CTA de prise de rendez-vous |

---

## Prochaines étapes (Sprint 2+)

- [ ] Pipeline batch (import CSV + génération en masse) — Parcours B
- [ ] Email HTML outreach (Resend) — Parcours B
- [ ] Page rapport non-réclamé avec expiration
- [ ] Système de crédits multi-packs (Découverte / Essentiel / Studio)
- [ ] Génération PDF du rapport
- [ ] Notifications email (rappel 3 mois)
- [ ] Interface admin (stats, rapports batch, suivi emails)
- [ ] Google OAuth dans le flow d'inscription
