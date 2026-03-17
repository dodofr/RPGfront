// Enums
export type StatType = 'FORCE' | 'INTELLIGENCE' | 'DEXTERITE' | 'AGILITE' | 'VIE' | 'CHANCE' | 'PA' | 'PM' | 'PO' | 'CRITIQUE' | 'DOMMAGES' | 'SOINS';
export type SortType = 'ARME' | 'SORT';
export type SlotType = 'ARME' | 'COIFFE' | 'AMULETTE' | 'BOUCLIER' | 'HAUT' | 'BAS' | 'ANNEAU1' | 'ANNEAU2' | 'FAMILIER';
export type EffetType = 'BUFF' | 'DEBUFF' | 'DISPEL' | 'POUSSEE' | 'ATTIRANCE' | 'POISON' | 'BOUCLIER' | 'RESISTANCE';
export type ZoneType = 'CASE' | 'CROIX' | 'LIGNE' | 'CONE' | 'CERCLE' | 'LIGNE_PERPENDICULAIRE' | 'DIAGONALE' | 'CARRE' | 'ANNEAU' | 'CONE_INVERSE';
export type CombatStatus = 'EN_COURS' | 'TERMINE' | 'ABANDONNE';
export type DialogueType = 'ACCUEIL' | 'SANS_INTERACTION';
export type RegionType = 'FORET' | 'PLAINE' | 'DESERT' | 'MONTAGNE' | 'MARAIS' | 'CAVERNE' | 'CITE';
export type MapType = 'WILDERNESS' | 'VILLE' | 'DONJON' | 'BOSS' | 'SAFE';
export type CombatMode = 'MANUEL' | 'AUTO';
export type IAType = 'EQUILIBRE' | 'AGGRESSIF' | 'SOUTIEN' | 'DISTANCE';
export type Direction = 'NORD' | 'SUD' | 'EST' | 'OUEST';
export type Sexe = 'HOMME' | 'FEMME';

// Models
export interface Player {
  id: number;
  nom: string;
  createdAt: string;
}

export interface Race {
  id: number;
  nom: string;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  imageUrlHomme?: string | null;
  imageUrlFemme?: string | null;
  spriteScale?: number;
  spriteOffsetX?: number;
  spriteOffsetY?: number;
  sorts?: Sort[];
}

export interface Zone {
  id: number;
  nom: string;
  type: ZoneType;
  taille: number;
}

export interface Sort {
  id: number;
  nom: string;
  description?: string | null;
  type: SortType;
  statUtilisee: StatType;
  coutPA: number;
  porteeMin: number;
  porteeMax: number;
  ligneDeVue: boolean;
  degatsMin: number;
  degatsMax: number;
  degatsCritMin: number;
  degatsCritMax: number;
  chanceCritBase: number;
  cooldown: number;
  cooldownRestant?: number;
  estSoin: boolean;
  tauxEchec: number;
  niveauApprentissage: number;
  zoneId: number | null;
  zone?: Zone | null;
  raceId: number | null;
  race?: Race | null;
  estInvocation: boolean;
  estVolDeVie: boolean;
  estGlyphe?: boolean;
  estPiege?: boolean;
  estTeleportation?: boolean;
  estSelfBuff?: boolean;
  poseDuree?: number | null;
  porteeModifiable?: boolean;
  ligneDirecte?: boolean;
  coefficient?: number;
  invocationTemplateId: number | null;
  effets?: {
    effetId: number;
    nom: string;
    type: string;
    statCiblee: string;
    valeur: number;
    valeurMin?: number | null;
    duree: number;
    chanceDeclenchement: number;
    surCible: boolean;
    // Nested format from raw Prisma (GET /spells)
    effet?: {
      id: number;
      nom: string;
      type: string;
      statCiblee: string;
      valeur: number;
      valeurMin?: number | null;
      duree: number;
    };
  }[];
}

export interface Equipment {
  id: number;
  nom: string;
  slot: SlotType;
  niveauMinimum: number;
  poids: number;
  panoplieId: number | null;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  bonusPA: number;
  bonusPM: number;
  bonusPO: number;
  bonusForceMax: number | null;
  bonusIntelligenceMax: number | null;
  bonusDexteriteMax: number | null;
  bonusAgiliteMax: number | null;
  bonusVieMax: number | null;
  bonusChanceMax: number | null;
  bonusPAMax: number | null;
  bonusPMMax: number | null;
  bonusPOMax: number | null;
  bonusCritiqueMax: number | null;
  resistanceForce: number;
  resistanceIntelligence: number;
  resistanceDexterite: number;
  resistanceAgilite: number;
  resistanceForceMax: number | null;
  resistanceIntelligenceMax: number | null;
  resistanceDexteriteMax: number | null;
  resistanceAgiliteMax: number | null;
  bonusDommages: number;
  bonusDommagesMax: number | null;
  bonusSoins: number;
  bonusSoinsMax: number | null;
  degatsMin: number | null;
  degatsMax: number | null;
  chanceCritBase: number | null;
  coutPA: number | null;
  porteeMin: number | null;
  porteeMax: number | null;
  ligneDeVue: boolean | null;
  zoneId: number | null;
  statUtilisee: StatType | null;
  cooldown: number | null;
  tauxEchec: number | null;
  estVolDeVie?: boolean;
  bonusCrit: number | null;
  bonusCritique: number;
  lignesDegats?: LigneDegatsArme[];
}

export interface LigneDegatsArme {
  id: number;
  equipementId: number;
  ordre: number;
  degatsMin: number;
  degatsMax: number;
  statUtilisee: StatType;
  estVolDeVie: boolean;
  estSoin: boolean;
}

export interface Effet {
  id: number;
  nom: string;
  type: EffetType;
  statCiblee: StatType;
  valeur: number;
  valeurMin?: number | null;
  duree: number;
  cumulable?: boolean;
}

export interface SortEffet {
  id: number;
  sortId: number;
  effetId: number;
  chanceDeclenchement: number;
  surCible: boolean;
  sort?: Sort;
  effet?: Effet;
}

export interface Region {
  id: number;
  nom: string;
  description: string | null;
  type: RegionType;
  niveauMin: number;
  niveauMax: number;
  maps?: GameMap[];
  monstres?: RegionMonstre[];
}

export interface MapCase {
  id: number;
  mapId: number;
  x: number;
  y: number;
  bloqueDeplacement: boolean;
  bloqueLigneDeVue: boolean;
  estExclue: boolean;
  estPremierPlan: boolean;
}

export interface MapSpawn {
  id: number;
  mapId: number;
  x: number;
  y: number;
  equipe: number;
  ordre: number;
}

export interface GameMap {
  id: number;
  nom: string;
  regionId: number;
  region?: Region;
  type: MapType;
  combatMode: CombatMode;
  largeur: number;
  hauteur: number;
  nordMapId: number | null;
  sudMapId: number | null;
  estMapId: number | null;
  ouestMapId: number | null;
  worldX: number | null;
  worldY: number | null;
  imageUrl: string | null;
  nordExitX: number | null;
  nordExitY: number | null;
  sudExitX: number | null;
  sudExitY: number | null;
  estExitX: number | null;
  estExitY: number | null;
  ouestExitX: number | null;
  ouestExitY: number | null;
  nordExitImageUrl?: string | null;
  sudExitImageUrl?: string | null;
  estExitImageUrl?: string | null;
  ouestExitImageUrl?: string | null;
  groupesEnnemis?: GroupeEnnemi[];
  connectionsFrom?: MapConnection[];
  cases?: MapCase[];
  spawns?: MapSpawn[];
}

export interface MapConnection {
  id: number;
  fromMapId: number;
  toMapId: number | null;
  toMap?: { id: number; nom: string; type: MapType } | null;
  fromMap?: { id: number; nom: string; type: MapType };
  positionX: number;
  positionY: number;
  nom: string;
  imageUrl?: string | null;
  donjonId?: number | null;
  donjon?: { id: number; nom: string; description: string | null; niveauMin: number; niveauMax: number } | null;
}

export interface MonsterTemplate {
  id: number;
  nom: string;
  imageUrl?: string | null;
  spriteScale?: number;
  spriteOffsetX?: number;
  spriteOffsetY?: number;
  force: number;
  intelligence: number;
  dexterite: number;
  agilite: number;
  vie: number;
  chance: number;
  pvBase: number;
  paBase: number;
  pmBase: number;
  niveauBase: number;
  xpRecompense: number;
  orMin: number;
  orMax: number;
  iaType: IAType;
  pvScalingInvocation: number | null;
  resistanceForce: number;
  resistanceIntelligence: number;
  resistanceDexterite: number;
  resistanceAgilite: number;
  regions?: { regionId: number; probabilite: number; region: { id: number; nom: string } }[];
  sorts?: MonstreSort[];
  drops?: MonstreDrop[];
}

export interface MonstreSort {
  id: number;
  monstreId: number;
  sortId: number;
  priorite: number;
  sort?: Sort;
}

export interface RegionMonstre {
  id: number;
  regionId: number;
  monstreId: number;
  probabilite: number;
  monstre?: MonsterTemplate;
  region?: Region;
}

export interface GroupeEnnemi {
  id: number;
  mapId: number;
  positionX: number;
  positionY: number;
  vaincu: boolean;
  membres?: GroupeEnnemiMembre[];
}

export interface GroupeEnnemiMembre {
  id: number;
  groupeEnnemiId: number;
  monstreId: number;
  monstre?: MonsterTemplate;
  quantite: number;
  niveau: number;
}

export interface TotalStats {
  force: number;
  intelligence: number;
  dexterite: number;
  agilite: number;
  vie: number;
  chance: number;
  pa: number;
  pm: number;
  po: number;
  bonusCritique: number;
  pvMax: number;
  resistanceForce: number;
  resistanceIntelligence: number;
  resistanceDexterite: number;
  resistanceAgilite: number;
  bonusDommages: number;
  bonusSoins: number;
}

export interface Character {
  id: number;
  nom: string;
  imageUrl?: string | null;
  sexe?: Sexe;
  niveau: number;
  experience: number;
  pointsStatsDisponibles: number;
  force: number;
  intelligence: number;
  dexterite: number;
  agilite: number;
  vie: number;
  chance: number;
  joueurId: number;
  raceId: number;
  mapId: number | null;
  positionX: number;
  positionY: number;
  race?: Race;
  map?: GameMap | null;
  equipements: Record<string, number | null>;
  sortsAppris?: { sortId: number; sort?: Sort }[];
  totalStats?: TotalStats;
}

export interface Group {
  id: number;
  nom: string;
  joueurId: number;
  leaderId: number | null;
  leader?: Character & { map?: GameMap | null };
  personnages?: { personnage: Character }[];
}

export interface CombatEntity {
  id: number;
  personnageId: number | null;
  nom: string;
  equipe: number;
  position: { x: number; y: number };
  initiative: number;
  ordreJeu: number;
  pvMax: number;
  pvActuels: number;
  paMax: number;
  paActuels: number;
  pmMax: number;
  pmActuels: number;
  stats: {
    force: number;
    intelligence: number;
    dexterite: number;
    agilite: number;
    vie: number;
    chance: number;
  };
  invocateurId: number | null;
  armeData: unknown;
  armeCooldownRestant: number;
  niveau: number | null;
  monstreTemplateId: number | null;
  iaType: string | null;
  poBonus: number;
  bonusCritique: number;
  resistanceForce: number;
  resistanceIntelligence: number;
  resistanceDexterite: number;
  resistanceAgilite: number;
  bonusDommages: number;
  bonusSoins: number;
  imageUrl?: string | null;
  spriteScale?: number;
  spriteOffsetX?: number;
  spriteOffsetY?: number;
  sorts?: Sort[];
}

export interface CombatCase {
  x: number;
  y: number;
  bloqueDeplacement: boolean;
  bloqueLigneDeVue: boolean;
}

export interface EffetActif {
  id: number;
  entiteId: number;
  effetId: number;
  toursRestants: number;
  nom: string;
  type: string;
  statCiblee: string;
  valeur: number;
  valeurMin?: number | null;
}

export type CombatLogType = 'ACTION' | 'DEPLACEMENT' | 'TOUR' | 'MORT' | 'EFFET' | 'EFFET_EXPIRE' | 'FIN';

export interface CombatLogEntry {
  id: number;
  tour: number;
  message: string;
  type: CombatLogType;
}

export interface ZonePoseeState {
  id: number;
  x: number;
  y: number;
  poseurId: number;
  poseurEquipe: number;
  estPiege: boolean;
  toursRestants: number;
  degatsMinFinal: number;
  degatsMaxFinal: number;
  statUtilisee: string;
  effetId?: number | null;
  zoneTaille: number;
  zoneType: ZoneType;
}

export interface CombatState {
  id: number;
  status: CombatStatus;
  tourActuel: number;
  entiteActuelle: number;
  groupeId: number | null;
  personnageId: number | null;
  mapId: number | null;
  mapImageUrl: string | null;
  mapPremierPlan: { x: number; y: number }[];
  grille: { largeur: number; hauteur: number };
  entites: CombatEntity[];
  cases: CombatCase[];
  effetsActifs: EffetActif[];
  cooldowns: { entiteId: number; sortId: number; toursRestants: number }[];
  logs: CombatLogEntry[];
  zonesActives?: ZonePoseeState[];
}

export interface DonjonSalleComposition {
  id: number;
  salleId: number;
  difficulte: number;
  monstreTemplateId: number;
  monstre?: MonsterTemplate;
  niveau: number;
  quantite: number;
}

export interface Donjon {
  id: number;
  nom: string;
  description: string | null;
  regionId: number;
  region?: Region;
  niveauMin: number;
  niveauMax: number;
  bossId: number;
  boss?: MonsterTemplate;
  salles?: DonjonSalle[];
  portails?: MapConnection[];
}

export interface DonjonSalle {
  id: number;
  donjonId: number;
  ordre: number;
  mapId: number;
  map?: GameMap;
  compositions?: DonjonSalleComposition[];
}

// ============ Ressources / Drops / Inventaire / Craft / Panoplies ============

export interface Ressource {
  id: number;
  nom: string;
  description?: string | null;
  poids: number;
  estPremium: boolean;
}

export interface MonstreDrop {
  id: number;
  monstreId: number;
  ressourceId: number | null;
  equipementId: number | null;
  tauxDrop: number;
  quantiteMin: number;
  quantiteMax: number;
  ressource?: Ressource | null;
  equipement?: Equipment | null;
}

export interface Panoplie {
  id: number;
  nom: string;
  description?: string | null;
  equipements?: Equipment[];
  bonus?: PanoplieBonus[];
}

export interface PanoplieBonus {
  id: number;
  panoplieId: number;
  nombrePieces: number;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  bonusPA: number;
  bonusPM: number;
  bonusPO: number;
  bonusCritique: number;
}

export interface Recette {
  id: number;
  nom: string;
  description?: string | null;
  equipementId: number;
  equipement?: Equipment;
  niveauMinimum: number;
  coutOr: number;
  ingredients?: RecetteIngredient[];
}

export interface RecetteIngredient {
  id: number;
  recetteId: number;
  ressourceId: number;
  quantite: number;
  ressource?: Ressource;
}

export interface InventoryItemInstance {
  id: number;
  personnageId: number;
  equipementId: number;
  equipement?: Equipment;
  nom: string;
  slot: SlotType;
  poids: number;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  bonusPA: number;
  bonusPM: number;
  bonusPO: number;
  bonusCritique: number;
  resistanceForce: number;
  resistanceIntelligence: number;
  resistanceDexterite: number;
  resistanceAgilite: number;
  bonusDommages: number;
  bonusSoins: number;
  estEquipe: boolean;
  panoplieId: number | null;
}

export interface ResourceStack {
  ressourceId: number;
  nom: string;
  description?: string | null;
  poids: number;
  quantite: number;
}

export interface SetBonusInfo {
  panoplieId: number;
  nom: string;
  piecesEquipees: number;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  bonusPA: number;
  bonusPM: number;
  bonusPO: number;
  bonusCritique: number;
}

export interface InventoryState {
  items: InventoryItemInstance[];
  ressources: ResourceStack[];
  poidsActuel: number;
  poidsMax: number;
  or: number;
  setBonuses?: SetBonusInfo[];
}

export interface PNJDialogue {
  id: number;
  pnjId: number;
  type: DialogueType;
  texte: string;
  ordre: number;
  queteId?: number | null;
  etapeOrdre?: number | null;
}

export interface PnjStatusEntry {
  pnjId: number;
  hasAvailable: boolean;
  hasPending: boolean;
}

export interface MarchandLigne {
  id: number;
  pnjId: number;
  equipementId?: number | null;
  equipement?: { id: number; nom: string; slot: string } | null;
  ressourceId?: number | null;
  ressource?: { id: number; nom: string } | null;
  prixMarchand?: number | null;
  prixRachat?: number | null;
}

export interface PNJ {
  id: number;
  nom: string;
  imageUrl?: string | null;
  spriteScale?: number;
  spriteOffsetX?: number;
  spriteOffsetY?: number;
  description?: string | null;
  mapId: number;
  map?: { id: number; nom: string; type: MapType };
  positionX: number;
  positionY: number;
  estMarchand: boolean;
  lignes: MarchandLigne[];
  dialogues?: PNJDialogue[];
  quetesDepart?: { id: number; nom: string; niveauRequis: number }[];
}

// ============ Quêtes ============

export type QueteEtapeType = 'PARLER_PNJ' | 'TUER_MONSTRE' | 'APPORTER_RESSOURCE' | 'APPORTER_EQUIPEMENT';
export type QueteStatut = 'EN_COURS' | 'TERMINEE';

export interface QueteEtape {
  id: number;
  queteId: number;
  ordre: number;
  description: string;
  type: QueteEtapeType;
  pnjId?: number | null;
  pnj?: { id: number; nom: string } | null;
  monstreTemplateId?: number | null;
  monstreTemplate?: { id: number; nom: string } | null;
  quantite?: number | null;
  ressourceId?: number | null;
  ressource?: { id: number; nom: string } | null;
  equipementId?: number | null;
  equipement?: { id: number; nom: string; slot: string } | null;
}

export interface QueteRecompense {
  id: number;
  queteId: number;
  xp: number;
  or: number;
  ressourceId?: number | null;
  ressource?: { id: number; nom: string } | null;
  quantiteRessource?: number | null;
  equipementId?: number | null;
  equipement?: { id: number; nom: string } | null;
}

export interface Quete {
  id: number;
  nom: string;
  description?: string | null;
  niveauRequis: number;
  pnjDepartId?: number | null;
  pnjDepart?: { id: number; nom: string } | null;
  etapes: QueteEtape[];
  recompenses: QueteRecompense[];
  prerequis?: { prerequisId: number; prerequis: { id: number; nom: string } }[];
}

export interface QuetePersonnage {
  id: number;
  queteId: number;
  personnageId: number;
  statut: QueteStatut;
  etapeActuelle: number;
  compteurEtape: number;
  quete: Quete;
}

export interface InteractResponse {
  quetesDisponibles: Quete[];
  etapesEnAttente: QuetePersonnage[];
  estMarchand: boolean;
  dialogues?: PNJDialogue[];
  dialogueTexte?: string | null;
}

export interface AdvanceQuestResponse {
  quetePersonnage: QuetePersonnage;
  questComplete: boolean;
  recompenses?: {
    xp: number;
    or: number;
    ressources: { nom: string; quantite: number }[];
    items: { nom: string }[];
  };
}

export interface CompetencePassive {
  id: number;
  nom: string;
  description?: string | null;
  niveauDeblocage: number;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  bonusPa: number;
  bonusPm: number;
  bonusPo: number;
  bonusCritique: number;
  bonusDommages: number;
  bonusSoins: number;
}
