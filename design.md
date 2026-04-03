# Design System

> Interface minimaliste et monochrome — les couleurs saturées sont réservées aux états sémantiques uniquement. L'élévation repose sur le contraste de fond, jamais sur des ombres portées.

---

## 1. Philosophie

- **Monochrome par défaut** : toute la structure repose sur des nuances de gris et des contrastes de fond.
- **Couleur = sens** : aucune couleur décorative. Les teintes saturées encodent uniquement un état (statut, delta, progression).
- **Zéro shadow** : la hiérarchie visuelle est exprimée par le contraste `background-primary` vs `background-secondary`, jamais par des `drop-shadow`.
- **Densité maîtrisée** : espacement généreux, labels courts, aucune surcharge d'information par écran.

---

## 2. Couleurs

### 2.1 Neutres — backbone de l'UI

| Token | Hex | Usage |
|---|---|---|
| White | `#FFFFFF` | Fond de card, input, surface raised |
| Surface | `#F8F8F7` | Fond de page, sidebar |
| Border light | `#EEEDEB` | Séparateurs, bordures de card |
| Muted | `#C2C0B6` | Placeholders, icônes inactives |
| Secondary | `#73726C` | Texte secondaire, labels |
| Primary | `#1A1A18` | Texte principal, nav actif (inversé) |

### 2.2 Accents sémantiques — utilisés avec parcimonie

| Token | Hex | Rôle |
|---|---|---|
| Purple | `#7F77DD` | Tâche complétée |
| Green | `#7ABF6C` | En cours / in progress |
| Amber | `#F0C744` | En attente / pending |
| Orange | `#F27A2A` | Barre d'activité (ex. Claude AI prompt bar) |
| Teal green | `#22A168` | Delta positif (`+0.94`) |
| Red | `#E05252` | Delta négatif |

> **Règle** : ne jamais utiliser plus de deux accents simultanément sur un même écran. L'accent n'apparaît que sur un élément porteur de sens (badge, indicateur, sparkline highlight).

---

## 3. Typographie

Une seule famille sans-serif (type Inter / Geist). Deux poids seulement : 400 regular et 500 medium.

| Niveau | Taille | Poids | Usage |
|---|---|---|---|
| KPI / Display | 32px | 500 | Valeurs métriques principales (`$20,320`) |
| Heading | 18px | 500 | Titre de page (`Welcome back, Salung`) |
| Subheading | 14px | 500 | Titre de section, label de carte |
| Body | 13px | 400 | Contenu courant, descriptions |
| Caption | 10px | 500 | Labels uppercase trackés (`TOTAL REVENUE`) |
| Delta / tag | 11px | 500 | Indicateurs de variation (`↑ +0.94 last year`) |

**Règles typographiques :**

- Les captions utilisent `text-transform: uppercase` et `letter-spacing: 0.06–0.08em`.
- Les valeurs KPI utilisent la tabulation numérique (`font-variant-numeric: tabular-nums`) pour l'alignement vertical dans les colonnes.
- Jamais de gras (`700`) — le `500` suffit pour tous les niveaux de hiérarchie.
- Sentence case partout, sauf les captions en uppercase.

---

## 4. Spacing

Échelle en multiples de 4, base 4px.

| Token | Valeur | Usage typique |
|---|---|---|
| `spacing-1` | 4px | Gap entre icône et label |
| `spacing-2` | 8px | Padding interne d'un badge/pill |
| `spacing-3` | 12px | Gap entre éléments de nav |
| `spacing-4` | 16px | Padding horizontal d'un nav item |
| `spacing-5` | 20px | Padding interne d'une card |
| `spacing-6` | 24px | Gap entre sections d'une même card |
| `spacing-8` | 32px | Gap entre sections de page |

---

## 5. Border Radius

| Valeur | Usage |
|---|---|
| `4px` | Chips, icônes, petits éléments |
| `8px` | Boutons, nav items, inputs |
| `12px` | Cards, panels, modals |
| `999px` | Pills, badges, tags |
| `50%` | Avatars, indicateurs de statut de tâche |

---

## 6. Élévation

Pas de `box-shadow` visible. L'élévation repose sur le contraste de fond uniquement.

| Niveau | Fond | Bordure | Usage |
|---|---|---|---|
| Level 0 | `#F8F8F7` | Aucune | Fond de page, sidebar |
| Level 1 | `#FFFFFF` | `1px solid #EEEDEB` | Card standard |
| Level 2 | `#FFFFFF` | `1px solid #EEEDEB` + `box-shadow: 0 1px 4px rgba(0,0,0,.06)` | Card raised, tooltip |

---

## 7. Composants

### 7.1 Metric Card

Structure : label caption + valeur KPI + sparkline + delta.

```
┌─────────────────────────────────────┐
│  TOTAL REVENUE            ▌▌▌▌▌▌▌  │
│  $20,320                            │
│  ↑ +0.94 last year                  │
└─────────────────────────────────────┘
```

- Label : 10px uppercase, couleur `secondary`
- Valeur : 32px 500, couleur `primary`
- Sparkline : barres monochromes à `opacity: 0.15`, hauteur max 24px
- Delta : 11px 500, couleur `teal-green` ou `red` selon signe

### 7.2 Sidebar Navigation

- Fond de sidebar : `#F8F8F7`
- Item inactif : fond transparent, texte `secondary`, icône `opacity: 0.5`
- Item actif : fond `#1A1A18` (inversé), texte `#FFFFFF` — pas de couleur, inversion totale
- Border-radius des items : `8px`
- Pas de bordure latérale ou indicateur coloré sur l'item actif

### 7.3 Task Item

Trois états visuels, tous représentés par un cercle de 28px :

| État | Bordure | Fond | Icône |
|---|---|---|---|
| Complété | `2px solid #7F77DD` | `#EEEDFE` à 70% | `✓` violet |
| En cours | `2px dashed #7ABF6C` | `#EAF3DE` à 70% | Vide |
| En attente | `2px solid #F0C744` | `#FAEEDA` | `▶` ambre |

Le texte d'une tâche complétée reçoit `text-decoration: line-through` en couleur `tertiary`.

### 7.4 Segmented Toggle (Weekly / Monthly)

- Conteneur : fond `background-secondary`, bordure `1px`, `border-radius: 8px`, padding `3px`
- Bouton inactif : fond transparent, texte `secondary`, 12px
- Bouton actif : fond `background-primary`, texte `primary`, `font-weight: 500`, `box-shadow: 0 1px 3px rgba(0,0,0,.08)`
- Aucune couleur d'accent — toggle purement noir/blanc

### 7.5 Tab Bar

- Fond transparent, séparateur `1px solid border-light` en bas du conteneur
- Tab inactive : texte `tertiary`, 13px
- Tab active : texte `primary`, `font-weight: 500`, `border-bottom: 2px solid #1A1A18`
- Pas d'indicateur coloré, pas de fond sur la tab active

### 7.6 Pills / Badges

Fond + texte depuis la même famille de couleur (shade clair pour fond, shade foncé pour texte).

| Variante | Fond | Texte |
|---|---|---|
| Completed | `#EEEDFE` | `#3C3489` |
| In progress | `#EAF3DE` | `#3B6D11` |
| Pending / Next | `#FAEEDA` | `#854F0B` |
| Neutral | `background-secondary` | `secondary` + bordure |

### 7.7 Barre de progression segmentée (Activity bar)

Utilisée notamment dans les vues d'activité d'outil (Claude AI card).

- Segments discrets de largeur fixe, gap de 2px entre chaque
- Hauteur : 8px, `border-radius: 2px` par segment
- Segments remplis : `#F27A2A` (orange)
- Segments vides : `border-tertiary`
- Pas de label de pourcentage affiché directement sur la barre

---

## 8. Charts & Dataviz

**Style monochrome, opacité comme seul encodage d'intensité.**

- Barres verticales monochromes (`#1A1A18`), `opacity` variable selon la valeur et la série
- Série "New User" : opacité basse (~0.15)
- Série "Existing User" : opacité haute (~0.45–0.80)
- Pas de grille visible, pas de ligne de fond
- Axes minimalistes : labels de mois en 10px `tertiary`, aucune bordure d'axe épaisse
- Tooltip : card blanche `border-radius: 8px`, `border: 1px solid border-light`, padding 12px, typographie body 13px
- Aucune légende colorée — la distinction de série repose uniquement sur le contraste d'opacité

---

## 9. Iconographie

- Style : outline fin, stroke 1.5px, caps ronds
- Taille standard : 16×16px dans la nav, 20×20px dans les headers
- Couleur : hérite de `currentColor` — jamais de couleur propre à l'icône
- Pas de fond ou de container sur les icônes de navigation

---

## 10. Principes de mise en page

- **Sidebar fixe** à gauche, largeur ~180px, fond `Surface`
- **Zone de contenu** : fond `Surface`, padding horizontal 24–32px
- **Cards** : disposées en grille 1/2/3 colonnes selon la largeur disponible, gap 16–20px
- **Séparateurs** : `1px dashed border-light` pour les listes (tasks), `1px solid border-light` pour les sections majeures
- **Aucune image décorative, aucun fond texturé, aucun dégradé** sauf pour l'encodage physique d'une donnée continue

---

*Design system extrait par analyse des interfaces Spark Pixel Team dashboard, Claude AI activity card et My Tasks — avril 2026.*
