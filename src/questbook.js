// src/questbook.js — Quest Book Médiéval style FTB Quests (iPhone 16e 390x844 Portrait Ready)
// Tiroir chapitres rétractable, canevas interactif Pan & Pinch-Zoom, nœuds carrés biseautés & losanges lumineux,
// encadrés de groupe colorés, fiche parchemin avec récompenses réelles et épinglage HUD (Pin).

// Icônes vectorielles SVG médiévales nettes (zéro dépendance externe)
const SVG_ICONS = {
  scroll: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffd87a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h10a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>`,
  pickaxe: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#cbd5e1" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 19 10"/><path d="M5 19 15 9"/><path d="M11 4c3.5 0 7.5 1.8 9 5.5-2.6-.9-4.7-1.1-7-.4-.7-2.3-.9-3.4-2-5.1z" fill="#94a3b8"/></svg>`,
  axe: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#e2b47e" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 16 8"/><path d="M13 5l6 6-3.5 2.5a5 5 0 0 1-5-5L13 5z" fill="#b4bec9" stroke="#e2e8f0"/></svg>`,
  saw: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7" stroke-dasharray="2.5 2"/><circle cx="12" cy="12" r="2.5" fill="#f5b83d" stroke="#f5b83d"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#eab875" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h13l2 6H6L3 8z" fill="#7c4b23"/><path d="M16 11h5"/><circle cx="9" cy="18" r="2.6"/><circle cx="15" cy="18" r="2.6"/></svg>`,
  brick: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffd8b5" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2" fill="#c4623d"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="5" x2="12" y2="12"/><line x1="8" y1="12" x2="8" y2="19"/><line x1="16" y1="12" x2="16" y2="19"/></svg>`,
  slab: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#e2e8f0" stroke-width="1.9"><polygon points="12,4 21,9 12,14 3,9" fill="#cbd5e1"/><polygon points="3,9 12,14 12,19 3,14" fill="#94a3b8"/><polygon points="21,9 12,14 12,19 21,14" fill="#64748b"/></svg>`,
  house: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffe4ad" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10" fill="#8b5a2b"/><rect x="10" y="14" width="4" height="6" fill="#472812"/></svg>`,
  anvil: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-2 4h-3l2 6H7l2-6H6L4 9z" fill="#64748b"/><path d="M2 9h3" stroke="#ff9d3b" stroke-width="2.4"/></svg>`,
  mairie: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ffe180" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6"/><rect x="4" y="10" width="16" height="10" fill="#7c5634"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/><circle cx="12" cy="7.5" r="1.2" fill="#ffe180"/></svg>`,
  church: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#9be4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="7"/><line x1="10" y1="4" x2="14" y2="4"/><path d="M7 11 12 7l5 4v9H7v-9z" fill="#3b5f7a"/><path d="M10.5 20v-4a1.5 1.5 0 0 1 3 0v4" fill="#182a38"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" width="24" height="24" fill="#ffd84a" stroke="#fff3b8" stroke-width="1.8" stroke-linejoin="round"><path d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4L3 18z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f5d599" stroke-width="2" stroke-linejoin="round"><polygon points="3,6 9,4 15,6 21,4 21,18 15,20 9,18 3,20" fill="#6d4c2a"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/></svg>`,
  crate: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f5cf8e" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" fill="#7a4c25"/><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>`,
};

// Structure hiérarchique des chapitres (style FTB Quests)
const CHAPTER_CATEGORIES = [
  {
    title: 'PAROISSE MÉDIÉVALE',
    chapters: [
      { id: 'depart_outils', name: 'Départ & Outils', icon: 'scroll', kind: 'tree' },
      { id: 'batiments_bourg', name: 'Bâtiments du Bourg', icon: 'house', kind: 'tree' },
      { id: 'grandes_oeuvres', name: 'Grandes Œuvres', icon: 'church', kind: 'tree' },
    ],
  },
  {
    title: 'ARTISANAT & LOGISTIQUE',
    chapters: [
      { id: 'carriere_taille', name: 'Carrière & Taille', icon: 'pickaxe', kind: 'tree' },
      { id: 'scierie_bois', name: 'Scierie & Bois', icon: 'saw', kind: 'tree' },
      { id: 'charrette_transport', name: 'Charrette & Transport', icon: 'cart', kind: 'tree' },
    ],
  },
  {
    title: 'ENCYCLOPÉDIE DU VILLAGE',
    chapters: [
      { id: 'materiaux_briques', name: 'Matériaux & Briques', icon: 'crate', kind: 'encyclopedia_stock' },
      { id: 'plans_volumes', name: 'Plans & Volumes', icon: 'map', kind: 'encyclopedia_plan' },
    ],
  },
];

// Encadrés de groupe colorés par chapitre
const CHAPTER_GROUPS = {
  depart_outils: [
    { x: 52, y: 58, w: 320, h: 470, title: 'Premiers Pas du Bâtisseur', theme: 'gold' },
  ],
  batiments_bourg: [
    { x: 38, y: 48, w: 356, h: 525, title: 'Les 5 Maisons du Bourg', theme: 'copper' },
  ],
  grandes_oeuvres: [
    { x: 46, y: 52, w: 340, h: 175, title: 'Hôtel de Ville (8 500)', theme: 'gold' },
    { x: 46, y: 248, w: 340, h: 205, title: 'Petite Église (12 000)', theme: 'celestial' },
  ],
  carriere_taille: [
    { x: 52, y: 60, w: 320, h: 420, title: 'Carrière de Pierre (Est)', theme: 'copper' },
  ],
  scierie_bois: [
    { x: 52, y: 60, w: 320, h: 420, title: 'Atelier & Banc de Scie', theme: 'gold' },
  ],
  charrette_transport: [
    { x: 52, y: 60, w: 320, h: 420, title: 'Logistique & Charrette', theme: 'copper' },
  ],
};

// Définition complète de l'arbre de quêtes relié aux vraies variables du jeu
const QUEST_DEFINITIONS = [
  // ---- CHAPITRE 1 : DÉPART & OUTILS ----
  {
    id: 'q_appel',
    chapter: 'depart_outils',
    x: 210, y: 112,
    shape: 'diamond',
    icon: 'scroll',
    title: "L'Appel de la Paroisse",
    shortTitle: 'Charte du Bâtisseur',
    desc: "Le conseil paroissial vous confie la reconstruction complète du village médiéval selon les plans officiels. Réclamez votre dotation d'architecte pour lancer le premier chantier.",
    deps: [],
    objective: { type: 'always', target: 1, label: 'Charte signée & outils prêts' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 24, label: '+24 Briques' },
      { kind: 'inventory', key: 'slabs', amount: 12, label: '+12 Dalles de sol' },
    ],
  },
  {
    id: 'q_extract_first',
    chapter: 'depart_outils',
    x: 126, y: 242,
    shape: 'square',
    icon: 'pickaxe',
    title: 'Premiers Blocs',
    shortTitle: 'Extraire pierre/bois',
    desc: "Rendez-vous à la Carrière de pierre (Est) ou dans la Forêt d'extraction (Ouest) et détachez vos premiers matériaux bruts.",
    deps: ['q_appel'],
    objective: { type: 'stat_sum', keys: ['stoneExtracted', 'woodExtracted'], target: 4, label: 'Matériaux extraits (pierre/bois)' },
    rewards: [
      { kind: 'inventory', key: 'stone', amount: 8, label: '+8 Pierres brutes' },
      { kind: 'inventory', key: 'wood', amount: 6, label: '+6 Rondins' },
    ],
  },
  {
    id: 'q_saw_first',
    chapter: 'depart_outils',
    x: 294, y: 242,
    shape: 'square',
    icon: 'saw',
    title: 'Premier Trait de Scie',
    shortTitle: 'Façonner au banc',
    desc: "Utilisez le Banc de scie sur la place pour découper des dalles de sol, des briques taillées ou des poutres de charpente.",
    deps: ['q_appel'],
    objective: { type: 'stat', key: 'totalSawCuts', target: 2, label: 'Coupes réalisées au banc de scie' },
    rewards: [
      { kind: 'inventory', key: 'slabs', amount: 16, label: '+16 Dalles de sol' },
      { kind: 'inventory', key: 'beams', amount: 12, label: '+12 Poutres' },
    ],
  },
  {
    id: 'q_cart_first',
    chapter: 'depart_outils',
    x: 210, y: 365,
    shape: 'square',
    icon: 'cart',
    title: 'Atteler la Charrette',
    shortTitle: 'Tirer la charrette',
    desc: "Saisissez les brancards de la charrette à bras artisanale pour transporter vos matériaux jusqu'aux chantiers du bourg.",
    deps: ['q_extract_first', 'q_saw_first'],
    objective: { type: 'stat', key: 'cartGrabbed', target: 1, label: 'Charrette saisie' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 30, label: '+30 Briques' },
    ],
  },
  {
    id: 'q_first_bricks',
    chapter: 'depart_outils',
    x: 210, y: 472,
    shape: 'diamond',
    icon: 'brick',
    title: 'Première Pierre Posée',
    shortTitle: 'Poser 10 briques',
    desc: "Approchez un plan architectural translucide, alignez le réticule en aim-snapping et posez vos 10 premières briques ou dalles.",
    deps: ['q_cart_first'],
    objective: { type: 'total_bricks', target: 10, label: 'Briques ou dalles posées au village' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 50, label: '+50 Briques' },
      { kind: 'inventory', key: 'slabs', amount: 24, label: '+24 Dalles' },
    ],
  },

  // ---- CHAPITRE 2 : BÂTIMENTS DU BOURG (ENCADRÉ CUIVRE — 5 MAISONS) ----
  {
    id: 'q_bldg_chaumiere',
    chapter: 'batiments_bourg',
    x: 216, y: 118,
    shape: 'diamond',
    icon: 'house',
    buildingId: 'house_chaumiere',
    title: 'Maison 1 : Chaumière',
    shortTitle: 'Chaumière',
    desc: "Érigez la chaleureuse chaumière au toit de paille dorée au nord de la place. Une fois terminée, sa porte s'ouvre sur un intérieur 100 % marchable.",
    deps: [],
    objective: { type: 'building', buildingId: 'house_chaumiere', target: 2500, label: 'Briques posées (Chaumière)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 80, label: '+80 Briques' },
      { kind: 'inventory', key: 'beams', amount: 24, label: '+24 Poutres' },
    ],
  },
  {
    id: 'q_bldg_marchand',
    chapter: 'batiments_bourg',
    x: 118, y: 248,
    shape: 'diamond',
    icon: 'house',
    buildingId: 'house_marchand',
    title: 'Maison 5 : Marchand',
    shortTitle: 'Maison Marchand',
    desc: "Bâtissez l'échoppe à colombages et tuiles rouges à l'est du bourg pour dynamiser le négoce de matériaux.",
    deps: ['q_bldg_chaumiere'],
    objective: { type: 'building', buildingId: 'house_marchand', target: 2800, label: 'Briques posées (Marchand)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 90, label: '+90 Briques' },
      { kind: 'upgrade_cart', amount: 40, label: '+40 Capacité Charrette' },
    ],
  },
  {
    id: 'q_bldg_pierre',
    chapter: 'batiments_bourg',
    x: 314, y: 248,
    shape: 'diamond',
    icon: 'slab',
    buildingId: 'house_pierre',
    title: 'Maison 4 : Pierre',
    shortTitle: 'Maison de Pierre',
    desc: "Assemblez une solide demeure en pierre taillée et ardoises le long du chemin de la rivière.",
    deps: ['q_bldg_chaumiere'],
    objective: { type: 'building', buildingId: 'house_pierre', target: 3000, label: 'Briques posées (Maison Pierre)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 100, label: '+100 Briques' },
      { kind: 'inventory', key: 'slabs', amount: 30, label: '+30 Dalles' },
    ],
  },
  {
    id: 'q_bldg_colombages',
    chapter: 'batiments_bourg',
    x: 118, y: 386,
    shape: 'diamond',
    icon: 'house',
    buildingId: 'house_colombages',
    title: 'Maison 2 : Colombages',
    shortTitle: 'Colombages',
    desc: "Élevez la grande maison à pans de bois près du pont et des champs labourés de l'ouest.",
    deps: ['q_bldg_marchand'],
    objective: { type: 'building', buildingId: 'house_colombages', target: 3500, label: 'Briques posées (Colombages)' },
    rewards: [
      { kind: 'inventory', key: 'beams', amount: 48, label: '+48 Poutres' },
      { kind: 'inventory', key: 'bricks', amount: 110, label: '+110 Briques' },
    ],
  },
  {
    id: 'q_bldg_forge',
    chapter: 'batiments_bourg',
    x: 314, y: 386,
    shape: 'diamond',
    icon: 'anvil',
    buildingId: 'house_forge',
    title: 'Maison 3 : Forge',
    shortTitle: 'Forge du Bourg',
    desc: "Construisez la forge en briques avec sa grande cheminée extérieure, son foyer ardent et son enclume fonctionnelle.",
    deps: ['q_bldg_pierre'],
    objective: { type: 'building', buildingId: 'house_forge', target: 4500, label: 'Briques posées (Forge)' },
    rewards: [
      { kind: 'upgrade_saw', amount: 2, label: '+2 Bonus par découpe Scie' },
      { kind: 'inventory', key: 'bricks', amount: 150, label: '+150 Briques' },
    ],
  },
  {
    id: 'q_bourg_complete',
    chapter: 'batiments_bourg',
    x: 216, y: 506,
    shape: 'diamond',
    icon: 'crown',
    title: 'Cœur du Bourg Achevé',
    shortTitle: '5 Maisons finies',
    desc: "Toutes les habitations villageoises du plan sont debout et visitables. La paroisse rayonne !",
    deps: ['q_bldg_colombages', 'q_bldg_forge'],
    objective: { type: 'houses_done', target: 5, label: 'Maisons achevées (5/5)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 250, label: '+250 Briques' },
      { kind: 'upgrade_cart', amount: 60, label: '+60 Capacité Charrette' },
    ],
  },

  // ---- CHAPITRE 3 : GRANDES ŒUVRES (MAIRIE OR + PETITE ÉGLISE BLEU CÉLESTE) ----
  {
    id: 'q_bldg_mairie',
    chapter: 'grandes_oeuvres',
    x: 216, y: 140,
    shape: 'diamond',
    icon: 'mairie',
    buildingId: 'mairie',
    title: 'La Mairie Paroissiale',
    shortTitle: 'Mairie (8 500)',
    desc: "Édifiez l'imposante Mairie à deux étages, campanile et escalier de pierre extérieur dominant la place centrale.",
    deps: [],
    objective: { type: 'building', buildingId: 'mairie', target: 8500, label: 'Briques posées (Mairie)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 300, label: '+300 Briques' },
      { kind: 'upgrade_cart', amount: 80, label: '+80 Capacité Charrette' },
    ],
  },
  {
    id: 'q_church_foundation',
    chapter: 'grandes_oeuvres',
    x: 126, y: 348,
    shape: 'square',
    icon: 'slab',
    buildingId: 'church',
    title: 'Dallage de la Nef',
    shortTitle: 'Nef de l’Église',
    desc: "Posez les premières 250 dalles et assises de pierre de la Petite Église orientée Est-Ouest.",
    deps: ['q_bldg_mairie'],
    objective: { type: 'building', buildingId: 'church', target: 250, label: 'Premières pierres (Petite Église)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 180, label: '+180 Briques' },
      { kind: 'inventory', key: 'slabs', amount: 60, label: '+60 Dalles' },
    ],
  },
  {
    id: 'q_bldg_church',
    chapter: 'grandes_oeuvres',
    x: 298, y: 348,
    shape: 'diamond-blue',
    icon: 'church',
    buildingId: 'church',
    title: 'La Petite Église',
    shortTitle: 'Église (12 000)',
    desc: "Chef-d'œuvre de la paroisse : 12 000 briques de pierre, clocher occidental à flèche, abside semi-circulaire, bancs en chêne et autel illuminé.",
    deps: ['q_church_foundation'],
    objective: { type: 'building', buildingId: 'church', target: 12000, label: 'Briques posées (Petite Église)' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 500, label: '+500 Briques d’honneur' },
      { kind: 'upgrade_saw', amount: 4, label: '+4 Rendement Scie Maître' },
    ],
  },
  {
    id: 'q_master_parish',
    chapter: 'grandes_oeuvres',
    x: 216, y: 508,
    shape: 'diamond-blue',
    icon: 'crown',
    title: 'Maître Architecte',
    shortTitle: 'Paroisse 100 %',
    desc: "Complétez les 36 800 briques des 7 bâtiments du plan officiel pour entrer dans la légende des bâtisseurs médiévaux.",
    deps: ['q_bldg_church'],
    objective: { type: 'total_bricks', target: 36800, label: 'Briques totales du village' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 1000, label: '+1 000 Briques royales' },
    ],
  },

  // ---- CHAPITRE 4 : CARRIÈRE & TAILLE ----
  {
    id: 'q_stone_10',
    chapter: 'carriere_taille',
    x: 210, y: 128,
    shape: 'square',
    icon: 'pickaxe',
    title: 'Apprenti Carrier',
    shortTitle: 'Extraire 10 pierres',
    desc: "Frappez les blocs rocheux fracturés de la carrière Est pour détacher 10 pierres brutes en physique ragdoll.",
    deps: [],
    objective: { type: 'stat', key: 'stoneExtracted', target: 10, label: 'Pierres brutes extraites' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 30, label: '+30 Briques' },
    ],
  },
  {
    id: 'q_stone_30',
    chapter: 'carriere_taille',
    x: 210, y: 262,
    shape: 'square',
    icon: 'pickaxe',
    title: 'Tailleur de Pierre',
    shortTitle: 'Extraire 30 pierres',
    desc: "Approvisionnez durablement le bourg en calcaire extrait de la carrière près du ruisseau.",
    deps: ['q_stone_10'],
    objective: { type: 'stat', key: 'stoneExtracted', target: 30, label: 'Pierres brutes extraites' },
    rewards: [
      { kind: 'inventory', key: 'bricks', amount: 75, label: '+75 Briques' },
      { kind: 'inventory', key: 'slabs', amount: 24, label: '+24 Dalles' },
    ],
  },
  {
    id: 'q_stone_bricks_craft',
    chapter: 'carriere_taille',
    x: 210, y: 400,
    shape: 'diamond',
    icon: 'brick',
    title: 'Maître Maçon',
    shortTitle: 'Tailler 36 briques',
    desc: "Transformez la pierre brute de la carrière en briques finement taillées sur le banc de découpe.",
    deps: ['q_stone_30'],
    objective: { type: 'stat', key: 'bricksCut', target: 36, label: 'Briques taillées au banc' },
    rewards: [
      { kind: 'upgrade_saw', amount: 2, label: '+2 Bonus par découpe Scie' },
    ],
  },

  // ---- CHAPITRE 5 : SCIERIE & BOIS ----
  {
    id: 'q_wood_10',
    chapter: 'scierie_bois',
    x: 210, y: 128,
    shape: 'square',
    icon: 'axe',
    title: 'Bûcheron de la Vallée',
    shortTitle: 'Couper 10 rondins',
    desc: "Abattez les chênes et pins de la zone d'extraction Ouest et ramassez 10 rondins de bois.",
    deps: [],
    objective: { type: 'stat', key: 'woodExtracted', target: 10, label: 'Rondins récoltés' },
    rewards: [
      { kind: 'inventory', key: 'beams', amount: 20, label: '+20 Poutres' },
    ],
  },
  {
    id: 'q_saw_beams',
    chapter: 'scierie_bois',
    x: 130, y: 274,
    shape: 'square',
    icon: 'saw',
    title: 'Charpente & Colombages',
    shortTitle: 'Scier 16 poutres',
    desc: "Débitez vos rondins sur la lame dentée du banc de scie pour produire 16 poutres de colombages.",
    deps: ['q_wood_10'],
    objective: { type: 'stat', key: 'beamsCut', target: 16, label: 'Poutres sciées' },
    rewards: [
      { kind: 'inventory', key: 'beams', amount: 32, label: '+32 Poutres' },
    ],
  },
  {
    id: 'q_saw_slabs',
    chapter: 'scierie_bois',
    x: 292, y: 274,
    shape: 'square',
    icon: 'slab',
    title: 'Dalles de Sol Parfaites',
    shortTitle: 'Scier 20 dalles',
    desc: "Découpez 20 dalles de sol lisses pour rendre les intérieurs de vos maisons confortables et marchables.",
    deps: ['q_wood_10'],
    objective: { type: 'stat', key: 'slabsCut', target: 20, label: 'Dalles découpées' },
    rewards: [
      { kind: 'inventory', key: 'slabs', amount: 32, label: '+32 Dalles de sol' },
    ],
  },
  {
    id: 'q_saw_master',
    chapter: 'scierie_bois',
    x: 210, y: 408,
    shape: 'diamond',
    icon: 'saw',
    title: 'Maître Menuisier',
    shortTitle: '15 découpes totales',
    desc: "Maîtrisez l'atelier de découpe pour augmenter définitivement le rendement de chaque pièce façonnée.",
    deps: ['q_saw_beams', 'q_saw_slabs'],
    objective: { type: 'stat', key: 'totalSawCuts', target: 15, label: 'Découpes au banc de scie' },
    rewards: [
      { kind: 'upgrade_saw', amount: 2, label: '+2 Bonus par découpe Scie' },
      { kind: 'inventory', key: 'beams', amount: 40, label: '+40 Poutres' },
    ],
  },

  // ---- CHAPITRE 6 : CHARRETTE & TRANSPORT ----
  {
    id: 'q_cart_load',
    chapter: 'charrette_transport',
    x: 210, y: 138,
    shape: 'square',
    icon: 'cart',
    title: 'Premier Chargement',
    shortTitle: 'Charger 20 unités',
    desc: "Approchez la charrette d'un dépôt (Stock de briques ou Stockage Ouest) et chargez 20 matériaux dans la caisse.",
    deps: [],
    objective: { type: 'stat', key: 'cartLoadedItems', target: 20, label: 'Unités chargées en charrette' },
    rewards: [
      { kind: 'upgrade_cart', amount: 40, label: '+40 Capacité Charrette' },
    ],
  },
  {
    id: 'q_cart_convoy',
    chapter: 'charrette_transport',
    x: 210, y: 292,
    shape: 'diamond',
    icon: 'cart',
    title: 'Grand Convoi Paroissial',
    shortTitle: 'Charger 100 unités',
    desc: "Organisez des convois réguliers entre la carrière, la scierie et les chantiers du bourg pour débloquer une charrette renforcée.",
    deps: ['q_cart_load'],
    objective: { type: 'stat', key: 'cartLoadedItems', target: 100, label: 'Unités chargées en charrette' },
    rewards: [
      { kind: 'upgrade_cart', amount: 120, label: '+120 Capacité Charrette' },
      { kind: 'inventory', key: 'bricks', amount: 120, label: '+120 Briques' },
    ],
  },
];

export class ArchitectCodex {
  constructor(buildingSystem, world, audio, callbacks) {
    this.buildingSystem = buildingSystem;
    this.world = world;
    this.audio = audio;
    this.callbacks = callbacks;

    this.isOpen = false;
    this.activeChapterId = 'depart_outils';
    this.sidebarOpen = window.innerWidth >= 780;
    this.trackedBuildingId = 'house_chaumiere';
    this.pinnedQuestId = 'q_appel';
    this.selectedQuestId = null;

    // Quêtes dont la récompense a déjà été réclamée (persisté dans localStorage)
    this.claimedIds = new Set();

    // État Pan & Pinch-Zoom du canevas FTB Quests
    this.panX = 0;
    this.panY = 0;
    this.scale = 1.0;
    this._pointers = new Map();
    this._dragStart = null;
    this._pinchStart = null;
    this._dragMoved = false;

    // Références DOM
    this.modalEl = document.getElementById('codex-modal');
    this.sidebarEl = document.getElementById('ftb-sidebar');
    this.scrimEl = document.getElementById('ftb-drawer-scrim');
    this.chapterListEl = document.getElementById('ftb-chapter-list');
    this.chapterCatEl = document.getElementById('ftb-chapter-cat');
    this.chapterTitleEl = document.getElementById('ftb-chapter-title');
    this.globalCounterEl = document.getElementById('ftb-global-counter');
    this.drawerBadgeEl = document.getElementById('ftb-drawer-badge');
    this.notifyDot = document.getElementById('codex-dot');

    this.viewportEl = document.getElementById('ftb-canvas-viewport');
    this.stageEl = document.getElementById('ftb-stage');
    this.groupsLayer = document.getElementById('ftb-groups-layer');
    this.linksLayer = document.getElementById('ftb-links-layer');
    this.nodesLayer = document.getElementById('ftb-nodes-layer');
    this.encViewEl = document.getElementById('ftb-encyclopedia-view');

    this.detailBackdrop = document.getElementById('ftb-detail-backdrop');
    this.detailIconEl = document.getElementById('ftb-detail-icon');
    this.detailStateEl = document.getElementById('ftb-detail-badge-state');
    this.detailTitleEl = document.getElementById('ftb-detail-title');
    this.detailDescEl = document.getElementById('ftb-detail-desc');
    this.detailObjEl = document.getElementById('ftb-detail-objectives');
    this.detailRewardsEl = document.getElementById('ftb-detail-rewards');
    this.detailBldgEl = document.getElementById('ftb-detail-building-actions');
    this.claimBtnEl = document.getElementById('btn-ftb-claim');
    this.claimedBannerEl = document.getElementById('ftb-claimed-banner');
    this.pinBtnEl = document.getElementById('btn-ftb-pin');

    this._bindEvents();
    this._bindPanZoom();
    this._syncTrackedBeacon();
    this.refreshBadgesAndPin();
  }

  _bindEvents() {
    document.getElementById('btn-codex-close').addEventListener('click', () => this.close());
    document.getElementById('btn-ftb-drawer').addEventListener('click', () => this.toggleSidebar());
    this.scrimEl.addEventListener('click', () => this.setSidebarOpen(false));

    document.getElementById('btn-ftb-zoom-in').addEventListener('click', () => this._stepZoom(1.18));
    document.getElementById('btn-ftb-zoom-out').addEventListener('click', () => this._stepZoom(0.84));
    document.getElementById('btn-ftb-zoom-reset').addEventListener('click', () => this._centerActiveChapter());

    document.getElementById('btn-ftb-detail-close').addEventListener('click', () => this.closeDetail());
    this.detailBackdrop.addEventListener('click', (e) => {
      if (e.target === this.detailBackdrop) this.closeDetail();
    });

    this.pinBtnEl.addEventListener('click', () => {
      if (!this.selectedQuestId) return;
      if (this.pinnedQuestId === this.selectedQuestId) {
        this.pinnedQuestId = null;
      } else {
        this.pinnedQuestId = this.selectedQuestId;
        const q = this.getQuestById(this.selectedQuestId);
        if (q?.buildingId) {
          this.trackedBuildingId = q.buildingId;
          this._syncTrackedBeacon();
        }
      }
      this.audio.playPageFlip();
      this._renderDetailCard();
      this.refreshBadgesAndPin();
      this.callbacks.onStateChanged?.();
    });

    this.claimBtnEl.addEventListener('click', () => {
      if (this.selectedQuestId) {
        this.claimQuestReward(this.selectedQuestId);
      }
    });
  }

  _bindPanZoom() {
    const vp = this.viewportEl;

    vp.addEventListener('pointerdown', (e) => {
      // Laisse passer les boutons de zoom
      if (e.target.closest('.ftb-zoom-controls')) return;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._pointers.size === 1) {
        this._dragStart = { x: e.clientX, y: e.clientY, panX: this.panX, panY: this.panY };
        this._dragMoved = false;
      } else if (this._pointers.size === 2) {
        const pts = Array.from(this._pointers.values());
        this._pinchStart = {
          dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
          scale: this.scale,
          midX: (pts[0].x + pts[1].x) * 0.5,
          midY: (pts[0].y + pts[1].y) * 0.5,
          panX: this.panX,
          panY: this.panY,
        };
        this._dragMoved = true;
      }
    });

    vp.addEventListener('pointermove', (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._pointers.size === 1 && this._dragStart) {
        const dx = e.clientX - this._dragStart.x;
        const dy = e.clientY - this._dragStart.y;
        if (Math.hypot(dx, dy) > 8) this._dragMoved = true;
        if (this._dragMoved) {
          this.panX = this._dragStart.panX + dx;
          this.panY = this._dragStart.panY + dy;
          this._applyStageTransform();
        }
      } else if (this._pointers.size === 2 && this._pinchStart) {
        const pts = Array.from(this._pointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const factor = dist / Math.max(10, this._pinchStart.dist);
        const nextScale = Math.max(0.55, Math.min(1.75, this._pinchStart.scale * factor));
        const rect = vp.getBoundingClientRect();
        const mx = this._pinchStart.midX - rect.left;
        const my = this._pinchStart.midY - rect.top;
        const ratio = nextScale / this._pinchStart.scale;
        this.scale = nextScale;
        this.panX = mx - (mx - this._pinchStart.panX) * ratio;
        this.panY = my - (my - this._pinchStart.panY) * ratio;
        this._applyStageTransform();
      }
    });

    const releasePointer = (e) => {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size < 2) this._pinchStart = null;
      if (this._pointers.size === 0) this._dragStart = null;
    };
    vp.addEventListener('pointerup', releasePointer);
    vp.addEventListener('pointercancel', releasePointer);

    // Zoom molette sur desktop
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._stepZoom(e.deltaY < 0 ? 1.12 : 0.89);
    }, { passive: false });
  }

  _stepZoom(mult) {
    const rect = this.viewportEl.getBoundingClientRect();
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.5;
    const prev = this.scale;
    const next = Math.max(0.55, Math.min(1.75, prev * mult));
    const ratio = next / prev;
    this.scale = next;
    this.panX = cx - (cx - this.panX) * ratio;
    this.panY = cy - (cy - this.panY) * ratio;
    this._applyStageTransform();
  }

  _applyStageTransform() {
    this.stageEl.style.transform = `translate3d(${this.panX.toFixed(1)}px, ${this.panY.toFixed(1)}px, 0) scale(${this.scale.toFixed(3)})`;
  }

  _centerActiveChapter() {
    const rect = this.viewportEl.getBoundingClientRect();
    const vw = rect.width || window.innerWidth || 390;
    const vh = rect.height || (window.innerHeight - 56) || 740;
    const quests = QUEST_DEFINITIONS.filter((q) => q.chapter === this.activeChapterId);
    if (!quests.length) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of quests) {
      minX = Math.min(minX, q.x - 80);
      maxX = Math.max(maxX, q.x + 80);
      minY = Math.min(minY, q.y - 65);
      maxY = Math.max(maxY, q.y + 85);
    }
    const contentW = Math.max(280, maxX - minX);
    const contentH = Math.max(300, maxY - minY);
    const fitScale = Math.min(1.06, Math.min((vw - 24) / contentW, (vh - 30) / contentH));
    this.scale = Math.max(0.68, Math.min(1.15, fitScale));
    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;
    this.panX = vw * 0.5 - midX * this.scale;
    this.panY = vh * 0.5 - midY * this.scale;
    this._applyStageTransform();
  }

  // =========================================================================
  // ÉVALUATION DYNAMIQUE DES QUÊTES À PARTIR DES VRAIES VARIABLES DU JEU
  // =========================================================================

  getQuestById(id) {
    return QUEST_DEFINITIONS.find((q) => q.id === id) || null;
  }

  getQuestProgress(q) {
    const stats = this.callbacks.getStats ? this.callbacks.getStats() : {};
    const obj = q.objective;
    let current = 0;
    const target = obj.target;

    if (obj.type === 'always') {
      current = 1;
    } else if (obj.type === 'stat') {
      current = Math.floor(stats[obj.key] || 0);
    } else if (obj.type === 'stat_sum') {
      current = obj.keys.reduce((acc, k) => acc + Math.floor(stats[k] || 0), 0);
    } else if (obj.type === 'building') {
      const b = this.buildingSystem.getBuildingById(obj.buildingId);
      current = b ? b.placedCount : 0;
    } else if (obj.type === 'total_bricks') {
      current = this.buildingSystem.getTotalPlacedBricks();
    } else if (obj.type === 'houses_done') {
      current = this.buildingSystem.buildings.filter(
        (b) => b.id.startsWith('house_') && b.completed
      ).length;
    }

    const clamped = Math.min(target, Math.max(0, current));
    return { current: clamped, raw: current, target, done: current >= target };
  }

  // États FTB Quests : 'locked' | 'active' | 'claimable' | 'claimed'
  getQuestState(q) {
    if (this.claimedIds.has(q.id)) return 'claimed';

    // Vérifie si tous les prérequis sont terminés (atteints ou réclamés)
    const unlocked = q.deps.every((depId) => {
      const dep = this.getQuestById(depId);
      if (!dep) return true;
      return this.claimedIds.has(dep.id) || this.getQuestProgress(dep).done;
    });

    if (!unlocked) return 'locked';
    const prog = this.getQuestProgress(q);
    return prog.done ? 'claimable' : 'active';
  }

  getChapterMeta(chapterId) {
    for (const cat of CHAPTER_CATEGORIES) {
      for (const ch of cat.chapters) {
        if (ch.id === chapterId) return { category: cat.title, chapter: ch };
      }
    }
    return { category: CHAPTER_CATEGORIES[0].title, chapter: CHAPTER_CATEGORIES[0].chapters[0] };
  }

  countClaimableInChapter(chapterId) {
    let n = 0;
    for (const q of QUEST_DEFINITIONS) {
      if (q.chapter === chapterId && this.getQuestState(q) === 'claimable') n++;
    }
    return n;
  }

  countTotalClaimable() {
    let n = 0;
    for (const q of QUEST_DEFINITIONS) {
      if (this.getQuestState(q) === 'claimable') n++;
    }
    return n;
  }

  // Compatibilité avec les appels existants de main.js
  markMilestone() {
    this.refreshBadgesAndPin();
  }

  refreshBadgesAndPin() {
    const claimable = this.countTotalClaimable();
    if (this.notifyDot) {
      this.notifyDot.classList.toggle('hidden', claimable === 0);
      this.notifyDot.textContent = claimable > 9 ? '!' : (claimable > 0 ? '!' : '');
    }
    if (this.drawerBadgeEl) {
      this.drawerBadgeEl.classList.toggle('hidden', claimable === 0);
    }

    // Mini-suivi discret de la quête épinglée sur l'écran de jeu (FTB Pin)
    const pinPill = document.getElementById('hud-pinned-quest');
    if (pinPill) {
      const pq = this.pinnedQuestId ? this.getQuestById(this.pinnedQuestId) : null;
      if (pq) {
        const prog = this.getQuestProgress(pq);
        const st = this.getQuestState(pq);
        pinPill.classList.remove('hidden');
        document.getElementById('hud-pin-title').textContent = pq.shortTitle || pq.title;
        document.getElementById('hud-pin-progress').textContent =
          st === 'claimable' ? '!' : st === 'claimed' ? '✓' : `${prog.current}/${prog.target}`;
      } else {
        pinPill.classList.add('hidden');
      }
    }

    if (this.isOpen) {
      this.render();
    }
  }

  // =========================================================================
  // OUVERTURE, TIROIR CHAPITRES & RENDU DU CANEVAS FTB QUESTS
  // =========================================================================

  open() {
    this.isOpen = true;
    this.audio.playPageFlip();
    // Sur mobile portrait (<780px), le panneau des chapitres est replié par défaut (85%+ d'écran pour l'arbre)
    this.setSidebarOpen(window.innerWidth >= 780);
    this.modalEl.classList.remove('hidden');
    this.render();
    requestAnimationFrame(() => this._centerActiveChapter());
    this.callbacks.onOpenStateChange?.(true);
  }

  close() {
    if (!this.isOpen) return;
    this.closeDetail();
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
    this.refreshBadgesAndPin();
    this.callbacks.onOpenStateChange?.(false);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  toggleSidebar() {
    this.setSidebarOpen(!this.sidebarOpen);
  }

  setSidebarOpen(open) {
    this.sidebarOpen = Boolean(open);
    this.sidebarEl.classList.toggle('collapsed', !this.sidebarOpen);
    const isMobile = window.innerWidth < 780;
    this.scrimEl.classList.toggle('hidden', !(this.sidebarOpen && isMobile));
  }

  selectChapter(chapterId) {
    this.activeChapterId = chapterId;
    this.audio.playPageFlip();
    if (window.innerWidth < 780) {
      this.setSidebarOpen(false);
    }
    this.render();
    const meta = this.getChapterMeta(chapterId);
    if (meta.chapter.kind === 'tree') {
      requestAnimationFrame(() => this._centerActiveChapter());
    }
  }

  setTrackedBuilding(id) {
    this.trackedBuildingId = id;
    this._syncTrackedBeacon();
  }

  _syncTrackedBeacon() {
    const b = this.buildingSystem.getBuildingById(this.trackedBuildingId);
    if (b && !b.completed) {
      this.world.setTrackedTarget({ x: b.cfg.x, z: b.cfg.z });
    } else {
      const next = this.buildingSystem.buildings
        .slice()
        .sort((a, c) => a.cfg.order - c.cfg.order)
        .find((x) => !x.completed);
      if (next) {
        this.trackedBuildingId = next.id;
        this.world.setTrackedTarget({ x: next.cfg.x, z: next.cfg.z });
      } else {
        this.world.setTrackedTarget(null);
      }
    }
  }

  render() {
    const meta = this.getChapterMeta(this.activeChapterId);
    this.chapterCatEl.textContent = meta.category;
    this.chapterTitleEl.textContent = meta.chapter.name;

    const claimedCount = QUEST_DEFINITIONS.filter((q) => this.claimedIds.has(q.id)).length;
    this.globalCounterEl.textContent = `${claimedCount}/${QUEST_DEFINITIONS.length}`;

    this._renderSidebar();

    if (meta.chapter.kind === 'tree') {
      this.viewportEl.classList.remove('hidden');
      this.encViewEl.classList.add('hidden');
      this._renderQuestTree(meta.chapter.id);
    } else {
      this.viewportEl.classList.add('hidden');
      this.encViewEl.classList.remove('hidden');
      this._renderEncyclopedia(meta.chapter.kind);
    }

    if (this.selectedQuestId && !this.detailBackdrop.classList.contains('hidden')) {
      this._renderDetailCard();
    }
  }

  _renderSidebar() {
    let html = '';
    for (const cat of CHAPTER_CATEGORIES) {
      html += `<div class="ftb-cat-label">${cat.title}</div>`;
      for (const ch of cat.chapters) {
        const active = ch.id === this.activeChapterId;
        const claimable = this.countClaimableInChapter(ch.id);
        const chQuests = QUEST_DEFINITIONS.filter((q) => q.chapter === ch.id);
        const allDone = chQuests.length > 0 && chQuests.every((q) => this.claimedIds.has(q.id));

        html += `
          <button class="ftb-chap-btn ${active ? 'active' : ''}" data-chap="${ch.id}" type="button">
            <span class="ftb-chap-ico">${SVG_ICONS[ch.icon] || SVG_ICONS.scroll}</span>
            <span class="ftb-chap-name">${ch.name}</span>
            ${claimable > 0 ? `<span class="ftb-chap-alert">!</span>` : allDone ? `<span class="ftb-chap-done">✓</span>` : ''}
          </button>
        `;
      }
    }
    this.chapterListEl.innerHTML = html;

    this.chapterListEl.querySelectorAll('.ftb-chap-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.selectChapter(btn.dataset.chap));
    });
  }

  _renderQuestTree(chapterId) {
    const quests = QUEST_DEFINITIONS.filter((q) => q.chapter === chapterId);
    const groups = CHAPTER_GROUPS[chapterId] || [];

    // 1. Encadrés de groupe colorés
    this.groupsLayer.innerHTML = groups.map((g) => `
      <div class="ftb-group-box theme-${g.theme}" style="left:${g.x}px; top:${g.y}px; width:${g.w}px; height:${g.h}px;">
        <span class="ftb-group-title">${g.title}</span>
      </div>
    `).join('');

    // 2. Lignes de liaison SVG entre quêtes dépendantes
    const svgParts = [];
    for (const q of quests) {
      const qState = this.getQuestState(q);
      for (const depId of q.deps) {
        const dep = quests.find((x) => x.id === depId);
        if (!dep) continue;
        const depState = this.getQuestState(dep);

        let cls = 'link-locked';
        if ((depState === 'claimed' || depState === 'claimable') && (qState === 'claimed' || qState === 'claimable')) {
          cls = 'link-done';
        } else if (depState === 'claimed' || depState === 'claimable') {
          cls = 'link-active';
        }

        const midY = (dep.y + q.y) * 0.5;
        const d = `M ${dep.x} ${dep.y} C ${dep.x} ${midY}, ${q.x} ${midY}, ${q.x} ${q.y}`;
        svgParts.push(`<path class="ftb-link ${cls}" d="${d}" />`);
      }
    }
    this.linksLayer.setAttribute('viewBox', '0 0 1200 1000');
    this.linksLayer.innerHTML = svgParts.join('');

    // 3. Nœuds de quêtes interactifs
    this.nodesLayer.innerHTML = quests.map((q) => {
      const state = this.getQuestState(q);
      const prog = this.getQuestProgress(q);
      const pct = Math.min(100, Math.round((prog.current / Math.max(1, prog.target)) * 100));

      let badgeHtml = '';
      if (state === 'claimable') badgeHtml = `<span class="ftb-node-badge badge-claim">!</span>`;
      else if (state === 'claimed') badgeHtml = `<span class="ftb-node-badge badge-done">✓</span>`;
      else if (state === 'locked') badgeHtml = `<span class="ftb-node-badge badge-lock">🔒</span>`;

      return `
        <button
          class="ftb-node shape-${q.shape} state-${state}"
          data-qid="${q.id}"
          style="left:${q.x}px; top:${q.y}px;"
          type="button"
          aria-label="${q.title}"
        >
          <span class="ftb-node-frame">
            <span class="ftb-node-icon">${SVG_ICONS[q.icon] || SVG_ICONS.scroll}</span>
          </span>
          ${badgeHtml}
          <span class="ftb-node-caption">
            <span class="ftb-node-name">${q.shortTitle || q.title}</span>
            ${state !== 'locked' && q.objective.type !== 'always' ? `
              <span class="ftb-node-mini-bar"><span class="ftb-node-mini-fill" style="width:${pct}%"></span></span>
              <span class="ftb-node-mini-num">${prog.current}/${prog.target}</span>
            ` : ''}
          </span>
        </button>
      `;
    }).join('');

    this.nodesLayer.querySelectorAll('.ftb-node').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._dragMoved) return; // Évite d'ouvrir après un glissement Pan
        this.openDetail(btn.dataset.qid);
      });
    });
  }

  // =========================================================================
  // FICHE DÉTAIL PARCHEMIN, RÉCOMPENSES RÉELLES & ÉPINGLAGE
  // =========================================================================

  openDetail(questId) {
    const q = this.getQuestById(questId);
    if (!q) return;
    this.selectedQuestId = questId;
    this.audio.playPageFlip();
    this._renderDetailCard();
    this.detailBackdrop.classList.remove('hidden');
  }

  closeDetail() {
    this.selectedQuestId = null;
    this.detailBackdrop.classList.add('hidden');
  }

  _renderDetailCard() {
    const q = this.getQuestById(this.selectedQuestId);
    if (!q) return;

    const state = this.getQuestState(q);
    const prog = this.getQuestProgress(q);
    const pct = Math.min(100, (prog.current / Math.max(1, prog.target)) * 100);

    this.detailIconEl.innerHTML = SVG_ICONS[q.icon] || SVG_ICONS.scroll;
    this.detailTitleEl.textContent = q.title;
    this.detailDescEl.textContent = q.desc;

    // Étiquette d'état
    this.detailStateEl.className = 'ftb-state-tag';
    if (state === 'locked') {
      this.detailStateEl.textContent = '🔒 VERROUILLÉE';
    } else if (state === 'active') {
      this.detailStateEl.textContent = 'EN COURS';
      this.detailStateEl.classList.add('tag-active');
    } else if (state === 'claimable') {
      this.detailStateEl.textContent = '! RÉCOMPENSE PRÊTE';
      this.detailStateEl.classList.add('tag-claim');
    } else {
      this.detailStateEl.textContent = '✓ VALIDÉE';
      this.detailStateEl.classList.add('tag-done');
    }

    // Bouton Épingler (Pin FTB Quests)
    this.pinBtnEl.classList.toggle('pinned', this.pinnedQuestId === q.id);

    // Objectifs requis
    let depNotice = '';
    if (state === 'locked' && q.deps.length > 0) {
      const names = q.deps.map((id) => this.getQuestById(id)?.title || id).join(', ');
      depNotice = `
        <div class="ftb-obj-row">
          <div class="ftb-obj-top"><span>🔒 Prérequis : ${names}</span></div>
        </div>
      `;
    }

    this.detailObjEl.innerHTML = depNotice + `
      <div class="ftb-obj-row ${prog.done ? 'done' : ''}">
        <div class="ftb-obj-top">
          <span>${prog.done ? '✅' : '🎯'} ${q.objective.label}</span>
          <span>${prog.current.toLocaleString('fr-FR')} / ${prog.target.toLocaleString('fr-FR')}</span>
        </div>
        <div class="ftb-obj-bar"><div class="ftb-obj-fill" style="width:${pct.toFixed(1)}%"></div></div>
      </div>
    `;

    // Récompenses
    this.detailRewardsEl.innerHTML = q.rewards.map((r) => `
      <span class="ftb-reward-chip">🎁 ${r.label}</span>
    `).join('');

    // Actions chantier (si la quête correspond à un bâtiment du village)
    if (q.buildingId) {
      const b = this.buildingSystem.getBuildingById(q.buildingId);
      if (b) {
        const isTracked = this.trackedBuildingId === b.id && !b.completed;
        const isAssisted = this.buildingSystem.masonAssistIds.has(b.id);
        this.detailBldgEl.classList.remove('hidden');
        this.detailBldgEl.innerHTML = !b.completed ? `
          <button class="q-btn ${isTracked ? 'active' : 'primary'}" data-bact="track" type="button">
            ${isTracked ? '📍 Guidage actif' : '📍 Guider'}
          </button>
          <button class="q-btn ${isAssisted ? 'active' : ''}" data-bact="masons" type="button">
            ${isAssisted ? '👷 Maçons actifs' : '👷 Compagnons'}
          </button>
          <button class="q-btn" data-bact="finish" type="button">🏛 Achever & Visiter</button>
        ` : `
          <button class="q-btn active" data-bact="visit" type="button">🚪 Visiter l'intérieur</button>
        `;

        this.detailBldgEl.querySelectorAll('button[data-bact]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const act = btn.dataset.bact;
            if (act === 'track') {
              this.setTrackedBuilding(b.id);
              this.close();
            } else if (act === 'masons') {
              this.buildingSystem.toggleMasonAssist(b.id);
              this._renderDetailCard();
            } else if (act === 'finish') {
              this.buildingSystem.completeBuildingNow(b.id);
              this._syncTrackedBeacon();
              this.render();
            } else if (act === 'visit') {
              this.callbacks.onTeleportToBuilding?.(b.id);
              this.close();
            }
          });
        });
      }
    } else {
      this.detailBldgEl.classList.add('hidden');
      this.detailBldgEl.innerHTML = '';
    }

    // Bouton RÉCLAMER LA RÉCOMPENSE
    this.claimBtnEl.classList.toggle('hidden', state !== 'claimable');
    this.claimedBannerEl.classList.toggle('hidden', state !== 'claimed');
  }

  claimQuestReward(questId) {
    const q = this.getQuestById(questId);
    if (!q || this.getQuestState(q) !== 'claimable') return false;

    this.claimedIds.add(q.id);
    this.callbacks.onGrantRewards?.(q.rewards, q);
    this.audio.playFanfare();
    if (navigator.vibrate) {
      try { navigator.vibrate([20, 40, 30]); } catch (_) {}
    }

    // Si la quête réclamée était épinglée, épingle automatiquement la suivante débloquée si disponible
    if (this.pinnedQuestId === q.id) {
      const next = QUEST_DEFINITIONS.find((x) => this.getQuestState(x) === 'active');
      if (next) this.pinnedQuestId = next.id;
    }

    this.refreshBadgesAndPin();
    this.callbacks.onStateChanged?.();
    return true;
  }

  // =========================================================================
  // ENCYCLOPÉDIE DU VILLAGE (MATÉRIAUX & PLAN OFFICIEL IMG_0581)
  // =========================================================================

  _renderEncyclopedia(kind) {
    if (kind === 'encyclopedia_plan') {
      const totalPlaced = this.buildingSystem.getTotalPlacedBricks();
      const totalTarget = this.buildingSystem.getTotalTargetBricks();
      const rows = this.buildingSystem.buildings
        .slice()
        .sort((a, b) => a.cfg.order - b.cfg.order)
        .map((b) => `
          <div class="stock-box">
            <span>${b.icon} ${b.name}</span>
            <span>${b.placedCount.toLocaleString('fr-FR')} / ${b.targetBricks.toLocaleString('fr-FR')}</span>
          </div>
        `).join('');

      this.encViewEl.innerHTML = `
        <div class="ftb-enc-card">
          <h3>🗺 Plan Architectural Officiel de la Paroisse</h3>
          <div class="codex-plan-frame">
            <img src="./assets/plan.jpg" alt="Plan officiel du village" class="codex-plan-img" />
          </div>
          <div class="stock-box" style="margin-bottom:8px;">
            <span>🏛 Total du Village</span>
            <span>${totalPlaced.toLocaleString('fr-FR')} / ${totalTarget.toLocaleString('fr-FR')} briques</span>
          </div>
          <div class="stock-grid">${rows}</div>
        </div>
      `;
      return;
    }

    // Encyclopédie : Matériaux & Briques + déplacements rapides
    const inv = this.callbacks.getInventory();
    const cart = this.callbacks.getCartCargo();
    const stats = this.callbacks.getStats ? this.callbacks.getStats() : {};
    const cartTotal = Object.values(cart).reduce((a, b) => a + b, 0);
    const cartCap = 240 + (stats.cartCapacityBonus || 0);

    this.encViewEl.innerHTML = `
      <div class="ftb-enc-card">
        <h3>📦 Réserves Actuelles (Sac &amp; Charrette)</h3>
        <div class="stock-grid">
          <div class="stock-box"><span>🧱 Briques</span><span>${inv.bricks} (+${cart.bricks || 0})</span></div>
          <div class="stock-box"><span>⬜ Dalles sol</span><span>${inv.slabs} (+${cart.slabs || 0})</span></div>
          <div class="stock-box"><span>🪵 Poutres</span><span>${inv.beams} (+${cart.beams || 0})</span></div>
          <div class="stock-box"><span>🪨 Pierre brute</span><span>${inv.stone} (+${cart.stone || 0})</span></div>
          <div class="stock-box"><span>🌲 Rondins</span><span>${inv.wood} (+${cart.wood || 0})</span></div>
          <div class="stock-box"><span>🛞 Charrette</span><span>${cartTotal} / ${cartCap}</span></div>
        </div>
        <div class="ftb-bldg-actions">
          <button class="q-btn primary" data-tp="plaza" type="button">⛲ Place du Village</button>
          <button class="q-btn" data-tp="workbench" type="button">🪚 Banc de Scie</button>
          <button class="q-btn" data-tp="quarry" type="button">⛏ Carrière</button>
        </div>
      </div>

      <div class="ftb-enc-card">
        <h3>⚒ Bonus d'Artisanat Débloqués</h3>
        <div class="stock-grid">
          <div class="stock-box"><span>🛞 Capacité Charrette</span><span>${cartCap}</span></div>
          <div class="stock-box"><span>🪚 Bonus Scie</span><span>+${stats.sawYieldBonus || 0} / coupe</span></div>
          <div class="stock-box"><span>⛏ Pierres extraites</span><span>${stats.stoneExtracted || 0}</span></div>
          <div class="stock-box"><span>🪓 Rondins coupés</span><span>${stats.woodExtracted || 0}</span></div>
        </div>
      </div>
    `;

    this.encViewEl.querySelectorAll('button[data-tp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onTeleportToSpot?.(btn.dataset.tp);
        this.close();
      });
    });
  }

  // =========================================================================
  // SAUVEGARDE / RESTAURATION localStorage
  // =========================================================================

  serialize() {
    return {
      trackedBuildingId: this.trackedBuildingId,
      activeChapterId: this.activeChapterId,
      pinnedQuestId: this.pinnedQuestId,
      claimedIds: Array.from(this.claimedIds),
    };
  }

  deserialize(data) {
    if (!data) return;
    if (data.trackedBuildingId) this.trackedBuildingId = data.trackedBuildingId;
    if (data.activeChapterId) this.activeChapterId = data.activeChapterId;
    if (data.pinnedQuestId !== undefined) this.pinnedQuestId = data.pinnedQuestId;
    if (Array.isArray(data.claimedIds)) {
      this.claimedIds = new Set(data.claimedIds);
    }
    this._syncTrackedBeacon();
    this.refreshBadgesAndPin();
  }
}
