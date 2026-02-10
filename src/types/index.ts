// Enums
export type StatType = 'FORCE' | 'INTELLIGENCE' | 'DEXTERITE' | 'AGILITE' | 'VIE' | 'CHANCE';
export type SortType = 'ARME' | 'SORT';
export type SlotType = 'ARME' | 'COIFFE' | 'AMULETTE' | 'BOUCLIER' | 'HAUT' | 'BAS' | 'ANNEAU1' | 'ANNEAU2' | 'FAMILIER';
export type EffetType = 'BUFF' | 'DEBUFF';
export type ZoneType = 'CASE' | 'CROIX' | 'LIGNE' | 'CONE' | 'CERCLE';
export type CombatStatus = 'EN_COURS' | 'TERMINE' | 'ABANDONNE';
export type RegionType = 'FORET' | 'PLAINE' | 'DESERT' | 'MONTAGNE' | 'MARAIS' | 'CAVERNE' | 'CITE';
export type MapType = 'WILDERNESS' | 'VILLE' | 'DONJON' | 'BOSS' | 'SAFE';
export type CombatMode = 'MANUEL' | 'AUTO';
export type IAType = 'EQUILIBRE' | 'AGGRESSIF' | 'SOUTIEN' | 'DISTANCE';
export type Direction = 'NORD' | 'SUD' | 'EST' | 'OUEST';

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
  estDispel: boolean;
  tauxEchec: number;
  niveauApprentissage: number;
  zoneId: number | null;
  zone?: Zone | null;
  raceId: number | null;
  race?: Race | null;
  estInvocation: boolean;
  invocationTemplateId: number | null;
  effets?: {
    effetId: number;
    nom: string;
    type: string;
    statCiblee: string;
    valeur: number;
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
      duree: number;
    };
  }[];
}

export interface Equipment {
  id: number;
  nom: string;
  slot: SlotType;
  niveauMinimum: number;
  bonusForce: number;
  bonusIntelligence: number;
  bonusDexterite: number;
  bonusAgilite: number;
  bonusVie: number;
  bonusChance: number;
  bonusPA: number;
  bonusPM: number;
  bonusPO: number;
  degatsMin: number | null;
  degatsMax: number | null;
  degatsCritMin: number | null;
  degatsCritMax: number | null;
  chanceCritBase: number | null;
  coutPA: number | null;
  porteeMin: number | null;
  porteeMax: number | null;
  ligneDeVue: boolean | null;
  zoneId: number | null;
  statUtilisee: StatType | null;
  cooldown: number | null;
  tauxEchec: number | null;
}

export interface Effet {
  id: number;
  nom: string;
  type: EffetType;
  statCiblee: StatType;
  valeur: number;
  duree: number;
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

export interface GameMap {
  id: number;
  nom: string;
  regionId: number;
  region?: Region;
  type: MapType;
  combatMode: CombatMode;
  largeur: number;
  hauteur: number;
  tauxRencontre: number;
  nordMapId: number | null;
  sudMapId: number | null;
  estMapId: number | null;
  ouestMapId: number | null;
  groupesEnnemis?: GroupeEnnemi[];
  connectionsFrom?: MapConnection[];
  grilles?: { id: number; nom: string; largeur: number; hauteur: number; _count: { cases: number; spawns: number } }[];
  _count?: { grilles: number };
}

export interface MapConnection {
  id: number;
  fromMapId: number;
  toMapId: number;
  toMap?: { id: number; nom: string; type: MapType };
  positionX: number;
  positionY: number;
  nom: string;
}

export interface MonsterTemplate {
  id: number;
  nom: string;
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
  iaType: IAType;
  pvScalingInvocation: number | null;
  regions?: { region: { id: number; nom: string } }[];
  sorts?: MonstreSort[];
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
  pvMax: number;
}

export interface Character {
  id: number;
  nom: string;
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
  race?: Race;
  equipements: Record<string, number | null>;
  sortsAppris?: { sortId: number; sort?: Sort }[];
  totalStats?: TotalStats;
}

export interface Group {
  id: number;
  nom: string;
  positionX: number;
  positionY: number;
  mapId: number | null;
  map?: GameMap | null;
  joueurId: number;
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
}

export interface CombatState {
  id: number;
  status: CombatStatus;
  tourActuel: number;
  entiteActuelle: number;
  grille: { largeur: number; hauteur: number };
  entites: CombatEntity[];
  cases: CombatCase[];
  effetsActifs: EffetActif[];
  cooldowns: { entiteId: number; sortId: number; toursRestants: number }[];
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
}

export interface DonjonSalle {
  id: number;
  donjonId: number;
  ordre: number;
  mapId: number;
  map?: GameMap;
}

export interface GrilleCombat {
  id: number;
  nom: string;
  mapId: number;
  largeur: number;
  hauteur: number;
  cases?: GrilleCase[];
  spawns?: GrilleSpawn[];
  map?: { id: number; nom: string };
  _count?: { cases: number; spawns: number };
}

export interface GrilleCase {
  id: number;
  grilleId: number;
  x: number;
  y: number;
  bloqueDeplacement: boolean;
  bloqueLigneDeVue: boolean;
}

export interface GrilleSpawn {
  id: number;
  grilleId: number;
  x: number;
  y: number;
  equipe: number;
  ordre: number;
}
