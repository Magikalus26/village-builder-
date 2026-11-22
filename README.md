# Village Builder: Medieval Parish

Jeu de construction médiévale 3D web développé en **Three.js** (modules ES natifs, prêt pour **GitHub Pages** sans étape de build) et optimisé en priorité pour **Safari mobile sur iPhone 16e (iOS)**.

## Aperçu & Visuels intégrés
- `assets/menu.jpg` — Illustration principale de l'écran d'accueil (mise en page en 3 zones verticales garantissant zéro superposition entre le titre, le décor central et les boutons).
- `assets/icon.jpg` — Icône carrée du jeu configurée pour `<link rel="icon">`, `<link rel="apple-touch-icon">`, manifeste PWA (`manifest.webmanifest`) et vignette OpenGraph.
- `assets/plan.jpg` — Plan architectural officiel du village utilisé comme référence spatiale et consultable dans le **Codex de l'Architecte**.

## Architecture du Village (36 800 briques via `InstancedMesh`)
| Bâtiment | Volume exact | Particularités |
| :--- | ---: | :--- |
| **Petite Église** | `12 000` briques | Clocher Ouest + flèche & cloche, nef à fenêtres en arc, abside semi-circulaire Est, autel et bancs marchables |
| **Mairie** | `8 500` briques | 2 niveaux colombages/pierre, campanile, escalier extérieur en pierre, salle du conseil marchable |
| **Maison 1 : Chaumière** | `2 500` briques | Toit en chaume doré, foyer et intérieur marchable |
| **Maison 2 : Colombages** | `3 500` briques | Façade à colombages bois & torchis, intérieur marchable |
| **Maison 3 : Forge** | `4 500` briques | Grande cheminée de forge extérieure, foyer incandescent animé & enclume interactive |
| **Maison 4 : Pierre** | `3 000` briques | Maçonnerie de pierre taillée, toit d'ardoise, intérieur marchable |
| **Maison 5 : Marchand** | `2 800` briques | Colombages & tuiles rouges, intérieur marchable |

## Architecture Modulaire (`src/`)
- `index.html` & `style.css` — PWA iOS, Safe Areas iPhone 16e, HUD 100 % diégétique (icônes sans texte envahissant), contrôles tactiles.
- `src/main.js` — Orchestrateur WebGL (`pixelRatio <= 2`), boucle 60 FPS, physique joueur première personne et sauvegarde automatique `localStorage`.
- `src/world.js` — Implantation spatiale du plan, rivière & pont, champs, textures procédurales Canvas (gazon, chemins de terre battue, pierre, briques, colombages, chaume, tuiles, dalles), herbe et arbres en `InstancedMesh`.
- `src/resources.js` — Carrière de pierre et forêt d'extraction avec **physique ragdoll** dynamique (rebonds, roulements, ramassage).
- `src/workbench.js` — Banc de scie interactif (dalles de sol, briques, poutres) avec **caméra droite verrouillée sans inversion ni retournement**.
- `src/transport.js` — **Charrette à bras** physique (cinématique remorque, roues tournantes, empilement visuel des matériaux dans la caisse).
- `src/building.js` — Construction par `InstancedMesh`, plans translucides au sol, **raycast aim-snapping** et comptage atomique strictement `+1` par brique posée.
- `src/interiors.js` — Intérieurs 100 % marchables sans chargement, portes ouvrables sur gonds, toitures et mobilier médiéval.
- `src/questbook.js` — **Codex de l'Architecte** illustré style *Neo Adventure* (chantiers, plan du village, réserves, faisceau de guidage et compagnons maçons).
- `src/controls.js` — Joystick tactile gauche, glissement caméra droit, boutons contextuels anti-rebond (`pointerdown` exclusif) et support clavier desktop.
- `src/audio.js` — Synthétiseur Web Audio procédural (pioche, hache, rebonds ragdoll, scie, pose de briques, charrette, porte, enclume, fanfare).

## Déploiement GitHub Pages
1. Dans les paramètres du dépôt GitHub (`Settings > Pages`), sélectionner la branche `main` et le dossier `/ (root)`.
2. Ouvrir l'URL GitHub Pages directement dans Safari sur iPhone 16e (et ajouter à l'écran d'accueil via Partager → *Sur l'écran d'accueil*).