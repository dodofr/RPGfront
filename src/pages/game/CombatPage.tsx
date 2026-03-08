import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { combatApi } from '../../api/combat';
import { zonesApi } from '../../api/static';
import type { CombatState, CombatEntity, CombatCase, Sort, EffetActif, ZoneType, Zone, CombatLogEntry, ZonePoseeState } from '../../types';
import {
  getReachableCells,
  getCellsInRange,
  getAffectedCells,
  hasLineOfSight,
  getPathTo,
} from '../../utils/combatPreview';

interface LigneDegatsData {
  ordre: number;
  degatsMin: number;
  degatsMax: number;
  statUtilisee: string;
  estVolDeVie: boolean;
  estSoin: boolean;
}

interface ArmeData {
  nom: string;
  degatsMin: number;
  degatsMax: number;
  degatsCritMin: number;
  degatsCritMax: number;
  chanceCritBase: number;
  bonusCrit: number;
  coutPA: number;
  porteeMin: number;
  porteeMax: number;
  ligneDeVue: boolean;
  zoneId: number | null;
  statUtilisee: string;
  cooldown: number;
  tauxEchec: number;
  estVolDeVie?: boolean;
  lignes?: LigneDegatsData[];
}

interface SlotTooltipData {
  nom: string;
  description?: string | null;
  coutPA: number;
  degatsMin: number;
  degatsMax: number;
  degatsCritMin: number;
  degatsCritMax: number;
  chanceCritBase: number;
  bonusCrit: number;
  tauxEchec: number;
  porteeMin: number;
  porteeMax: number;
  statUtilisee: string;
  zone: { type: string; taille: number } | null;
  cooldown: number;
  cooldownRestant: number;
  estSoin: boolean;
  estInvocation: boolean;
  estVolDeVie: boolean;
  effets: NonNullable<Sort['effets']>;
  lignes: LigneDegatsData[];
  sort: Sort | null;
}

const STAT_LABELS: Record<string, string> = {
  FORCE: 'Force',
  INTELLIGENCE: 'Intelligence',
  DEXTERITE: 'Dextérité',
  AGILITE: 'Agilité',
  VIE: 'Vie',
  DOMMAGES: 'Dégâts',
  SOINS: 'Soins',
  CHANCE: 'Chance',
  PA: 'PA',
  PM: 'PM',
  PO: 'PO',
  CRITIQUE: 'Critique',
};

const ZONE_LABELS: Record<string, string> = {
  CASE: 'Case',
  CROIX: 'Croix',
  CERCLE: 'Cercle',
  LIGNE: 'Ligne',
  CONE: 'Cône',
  LIGNE_PERPENDICULAIRE: 'Ligne perp.',
  DIAGONALE: 'Diagonale',
  CARRE: 'Carré',
  ANNEAU: 'Anneau',
  CONE_INVERSE: 'Cône inv.',
};

const RESIST_STATS = [
  ['FOR', 'FORCE'],
  ['INT', 'INTELLIGENCE'],
  ['DEX', 'DEXTERITE'],
  ['AGI', 'AGILITE'],
] as const;

function calcEffectiveResistance(
  entiteId: number,
  entity: { resistanceForce: number; resistanceIntelligence: number; resistanceDexterite: number; resistanceAgilite: number },
  stat: 'FORCE' | 'INTELLIGENCE' | 'DEXTERITE' | 'AGILITE',
  effetsActifs: EffetActif[]
): number {
  const base = { FORCE: entity.resistanceForce, INTELLIGENCE: entity.resistanceIntelligence, DEXTERITE: entity.resistanceDexterite, AGILITE: entity.resistanceAgilite }[stat];
  const modifier = effetsActifs
    .filter(e => e.entiteId === entiteId && e.type === 'RESISTANCE' && e.statCiblee === stat)
    .reduce((sum, e) => sum + e.valeur, 0);
  return base + modifier;
}

function getSpellEmoji(s: Sort): string {
  if (s.estSoin) return '💚';
  if (s.estInvocation) return '👻';
  if (s.estVolDeVie) return '🩸';
  if ((s as any).estGlyphe) return '⬡';
  if ((s as any).estPiege) return '⊗';
  if ((s as any).estTeleportation) return '🌀';
  if ((s as any).estSelfBuff) return '✨';
  if (s.statUtilisee === 'FORCE') return '⚔️';
  if (s.statUtilisee === 'INTELLIGENCE') return '🔮';
  if (s.statUtilisee === 'DEXTERITE') return '🏹';
  if (s.statUtilisee === 'AGILITE') return '💨';
  return '💥';
}

const CombatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<CombatEntity | null>(null);
  const [selectedSort, setSelectedSort] = useState<Sort | null>(null);
  const [weaponMode, setWeaponMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [log, setLog] = useState<CombatLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [combatList, setCombatList] = useState<CombatState[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | 'arme' | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const lastLogIdRef = useRef<number>(0);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridPixelSize, setGridPixelSize] = useState<{ w: number; h: number } | null>(null);

  const combatId = id ? parseInt(id) : null;

  useEffect(() => {
    zonesApi.getAll().then(setZones);
  }, []);

  useEffect(() => {
    if (!combatId) {
      combatApi.getAll().then(setCombatList).finally(() => setLoading(false));
    }
  }, [combatId]);

  const fetchCombat = useCallback(async () => {
    if (!combatId) return;
    try {
      const data = await combatApi.getById(combatId);
      setCombat(data);
      if (data.logs) {
        const newLogs = data.logs.filter(l => l.id > lastLogIdRef.current);
        if (newLogs.length > 0) {
          setLog(prev => [...prev, ...newLogs]);
          lastLogIdRef.current = newLogs[newLogs.length - 1].id;
        }
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [combatId]);

  useEffect(() => {
    if (!combatId) return;
    fetchCombat();
    const timer = setInterval(fetchCombat, 500);
    return () => clearInterval(timer);
  }, [combatId, fetchCombat]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useLayoutEffect(() => {
    const container = gridContainerRef.current;
    if (!container || !combat) return;
    const W = combat.grille.largeur;
    const H = combat.grille.hauteur;
    const computeSize = (innerW: number, innerH: number) => {
      if (innerW <= 0 || innerH <= 0) return;
      const byWidth = innerW * H / W;
      const w = byWidth <= innerH ? innerW : innerH * W / H;
      const h = byWidth <= innerH ? byWidth : innerH;
      setGridPixelSize(prev => {
        if (prev && Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1) return prev;
        return { w: Math.floor(w), h: Math.floor(h) };
      });
    };
    // Mesure initiale synchrone (fallback avant le premier fire du ResizeObserver)
    const rect = container.getBoundingClientRect();
    computeSize(rect.width - 16, rect.height - 16);
    // ResizeObserver tire après layout stabilisé et corrige si besoin
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        computeSize(width, height);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [combat?.grille.largeur, combat?.grille.hauteur]);

  if (!combatId) {
    if (loading) return <div className="loading">Chargement...</div>;
    return (
      <div>
        <div className="page-header"><h1>Combats</h1></div>
        {combatList.length === 0 ? (
          <p className="meta">Aucun combat en cours. Engagez un ennemi depuis la carte.</p>
        ) : (
          <div className="card-grid">
            {combatList.map(c => (
              <div key={c.id} className="card" onClick={() => navigate(`/game/combat/${c.id}`)}>
                <h4>Combat #{c.id}</h4>
                <div className="meta">
                  <span className={`status ${c.status.toLowerCase().replace('_', '-')}`}>{c.status}</span>
                  {' | '}Tour {c.tourActuel} | {c.entites.filter(e => e.equipe === 0 && e.pvActuels > 0).length} joueurs / {c.entites.filter(e => e.equipe === 1 && e.pvActuels > 0).length} ennemis
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading || !combat) return <div className="loading">Chargement du combat...</div>;

  const currentEntity = combat.entites.find(e => e.id === combat.entiteActuelle);
  const isPlayerTurn = currentEntity && currentEntity.equipe === 0 && !currentEntity.invocateurId;
  const isFinished = combat.status !== 'EN_COURS';

  const enemiesAlive = combat.entites.filter(e => e.equipe === 1 && e.pvActuels > 0 && !e.invocateurId);

  const spells: Sort[] = (() => {
    if (!currentEntity || !isPlayerTurn) return [];
    return currentEntity.sorts || [];
  })();

  const obstacleMap = new Map<string, CombatCase>();
  combat.cases.forEach(c => obstacleMap.set(`${c.x},${c.y}`, c));
  const entityMap = new Map<string, CombatEntity>();
  combat.entites.filter(e => e.pvActuels > 0).forEach(e => entityMap.set(`${e.position.x},${e.position.y}`, e));

  const monEquipe = 0;

  const glypheCellMap = new Map<string, ZonePoseeState>();
  const piegeCellMap = new Map<string, ZonePoseeState>();
  if (combat.zonesActives) {
    for (const z of combat.zonesActives) {
      const cells = getAffectedCells(
        { x: z.x, y: z.y },
        { type: z.zoneType, taille: z.zoneTaille },
        combat.grille.largeur,
        combat.grille.hauteur
      );
      for (const cellKey of cells) {
        if (!z.estPiege) {
          if (!glypheCellMap.has(cellKey)) glypheCellMap.set(cellKey, z);
        } else if (z.poseurEquipe === monEquipe) {
          if (!piegeCellMap.has(cellKey)) piegeCellMap.set(cellKey, z);
        }
      }
    }
  }

  const armeData = currentEntity?.armeData ? currentEntity.armeData as unknown as ArmeData : null;
  const armeZone = armeData?.zoneId ? zones.find(z => z.id === armeData.zoneId) ?? null : null;

  const reachableCells: Set<string> = (() => {
    if (!moveMode || !currentEntity || !isPlayerTurn) return new Set<string>();
    return getReachableCells(
      currentEntity.position,
      currentEntity.pmActuels,
      combat.grille.largeur,
      combat.grille.hauteur,
      combat.entites,
      combat.cases
    );
  })();

  const pathCells: Set<string> = (() => {
    if (!moveMode || !hoveredCell || !currentEntity || !isPlayerTurn) return new Set<string>();
    const hKey = `${hoveredCell.x},${hoveredCell.y}`;
    if (!reachableCells.has(hKey)) return new Set<string>();
    const path = getPathTo(
      currentEntity.position,
      hoveredCell,
      currentEntity.pmActuels,
      combat.grille.largeur,
      combat.grille.hauteur,
      combat.entites,
      combat.cases
    );
    if (!path) return new Set<string>();
    const result = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      result.add(`${path[i].x},${path[i].y}`);
    }
    return result;
  })();

  const rangeCells: Set<string> = (() => {
    if (!currentEntity || !isPlayerTurn) return new Set<string>();
    if (!selectedSort && !weaponMode) return new Set<string>();

    const porteeModifiable = selectedSort ? (selectedSort.porteeModifiable !== false) : true;
    const poBonus = porteeModifiable ? (currentEntity.poBonus ?? 0) : 0;
    const porteeMin = Math.max(0, (selectedSort ? selectedSort.porteeMin : armeData?.porteeMin ?? 1) - poBonus);
    const porteeMax = (selectedSort ? selectedSort.porteeMax : armeData?.porteeMax ?? 1) + poBonus;
    const needLos = selectedSort ? selectedSort.ligneDeVue : armeData?.ligneDeVue ?? true;
    const isLigneDirecte = selectedSort?.ligneDirecte ?? false;

    const allInRange = getCellsInRange(
      currentEntity.position,
      porteeMin,
      porteeMax,
      combat.grille.largeur,
      combat.grille.hauteur
    );

    const inRangeFiltered = isLigneDirecte
      ? (() => {
          const r = new Set<string>();
          allInRange.forEach(k => {
            const [cx, cy] = k.split(',').map(Number);
            if (cx === currentEntity.position.x || cy === currentEntity.position.y) r.add(k);
          });
          return r;
        })()
      : allInRange;

    if (!needLos) {
      if (selectedSort?.estTeleportation) {
        const occupiedSet = new Set<string>();
        const blockedSet = new Set<string>();
        combat.entites.filter(e => e.pvActuels > 0).forEach(e => occupiedSet.add(`${e.position.x},${e.position.y}`));
        combat.cases.filter(c => c.bloqueDeplacement).forEach(c => blockedSet.add(`${c.x},${c.y}`));
        const filtered = new Set<string>();
        inRangeFiltered.forEach(k => {
          if (!occupiedSet.has(k) && !blockedSet.has(k)) filtered.add(k);
        });
        return filtered;
      }
      return inRangeFiltered;
    }

    const result = new Set<string>();
    inRangeFiltered.forEach(k => {
      const [cx, cy] = k.split(',').map(Number);
      if (hasLineOfSight(currentEntity.position, { x: cx, y: cy }, combat.entites, combat.cases)) {
        result.add(k);
      }
    });
    return result;
  })();

  const rangeBlockedCells: Set<string> = (() => {
    if (!currentEntity || !isPlayerTurn) return new Set<string>();
    if (!selectedSort && !weaponMode) return new Set<string>();

    const needLos = selectedSort ? selectedSort.ligneDeVue : armeData?.ligneDeVue ?? true;
    if (!needLos) {
      if (selectedSort?.estTeleportation) {
        const tpPoBonus = (selectedSort.porteeModifiable !== false) ? (currentEntity.poBonus ?? 0) : 0;
        const allInRange = getCellsInRange(
          currentEntity.position,
          Math.max(0, selectedSort.porteeMin - tpPoBonus),
          selectedSort.porteeMax + tpPoBonus,
          combat.grille.largeur,
          combat.grille.hauteur
        );
        const occupiedSet = new Set<string>();
        const blockedSet = new Set<string>();
        combat.entites.filter(e => e.pvActuels > 0).forEach(e => occupiedSet.add(`${e.position.x},${e.position.y}`));
        combat.cases.filter(c => c.bloqueDeplacement).forEach(c => blockedSet.add(`${c.x},${c.y}`));
        const result = new Set<string>();
        allInRange.forEach(k => {
          if (occupiedSet.has(k) || blockedSet.has(k)) result.add(k);
        });
        return result;
      }
      return new Set<string>();
    }

    const blockedPorteeModifiable = selectedSort ? (selectedSort.porteeModifiable !== false) : true;
    const blockedPoBonus = blockedPorteeModifiable ? (currentEntity.poBonus ?? 0) : 0;
    const porteeMin = Math.max(0, (selectedSort ? selectedSort.porteeMin : armeData?.porteeMin ?? 1) - blockedPoBonus);
    const porteeMax = (selectedSort ? selectedSort.porteeMax : armeData?.porteeMax ?? 1) + blockedPoBonus;
    const isLigneDirecte = selectedSort?.ligneDirecte ?? false;

    let allInRange = getCellsInRange(
      currentEntity.position,
      porteeMin,
      porteeMax,
      combat.grille.largeur,
      combat.grille.hauteur
    );

    if (isLigneDirecte) {
      const r = new Set<string>();
      allInRange.forEach(k => {
        const [cx, cy] = k.split(',').map(Number);
        if (cx === currentEntity.position.x || cy === currentEntity.position.y) r.add(k);
      });
      allInRange = r;
    }

    const blocked = new Set<string>();
    allInRange.forEach(k => {
      if (!rangeCells.has(k)) blocked.add(k);
    });
    return blocked;
  })();

  const aoeCells: Set<string> = (() => {
    if (!hoveredCell || !currentEntity || !isPlayerTurn) return new Set<string>();
    if (!selectedSort && !weaponMode) return new Set<string>();

    const hKey = `${hoveredCell.x},${hoveredCell.y}`;
    if (!rangeCells.has(hKey)) return new Set<string>();

    let zoneConfig: { type: ZoneType; taille: number } = { type: 'CASE', taille: 0 };
    if (selectedSort?.zone) {
      zoneConfig = { type: selectedSort.zone.type, taille: selectedSort.zone.taille };
    } else if (weaponMode && armeData) {
      zoneConfig = armeZone ? { type: armeZone.type, taille: armeZone.taille } : { type: 'CASE', taille: 0 };
    }

    return getAffectedCells(
      hoveredCell,
      zoneConfig,
      combat.grille.largeur,
      combat.grille.hauteur,
      currentEntity.position
    );
  })();

  const clearTargeting = () => {
    setSelectedSort(null);
    setWeaponMode(false);
    setMoveMode(false);
  };

  const handleCellClick = async (x: number, y: number) => {
    if (!isPlayerTurn || isFinished || !currentEntity) return;

    if (moveMode) {
      const k = `${x},${y}`;
      if (!reachableCells.has(k)) return;
      try {
        await combatApi.move(combat.id, { entiteId: currentEntity.id, targetX: x, targetY: y });
        setMoveMode(false);
        fetchCombat();
      } catch { /* Invalid move */ }
      return;
    }

    if (weaponMode) {
      const k = `${x},${y}`;
      if (!rangeCells.has(k)) return;
      try {
        await combatApi.action(combat.id, {
          entiteId: currentEntity.id,
          useArme: true,
          targetX: x,
          targetY: y,
        });
        setWeaponMode(false);
        fetchCombat();
      } catch { /* Invalid action */ }
      return;
    }

    if (selectedSort) {
      const k = `${x},${y}`;
      if (!rangeCells.has(k)) return;
      try {
        await combatApi.action(combat.id, {
          entiteId: currentEntity.id,
          sortId: selectedSort.id,
          targetX: x,
          targetY: y,
        });
        setSelectedSort(null);
        fetchCombat();
      } catch { /* Invalid action */ }
      return;
    }

    const entity = entityMap.get(`${x},${y}`);
    if (entity) setSelectedEntity(entity);
  };

  const turnOrder = [...combat.entites].sort((a, b) => a.ordreJeu - b.ordreJeu);

  const getEntityEffects = (entiteId: number): EffetActif[] =>
    combat.effetsActifs?.filter(e => e.entiteId === entiteId) || [];

  // Slot tooltip data computed from hoveredSlotIdx
  const slotTooltipData: SlotTooltipData | null = (() => {
    if (hoveredSlotIdx === null) return null;
    if (hoveredSlotIdx === 'arme' && armeData) {
      return {
        nom: armeData.nom,
        description: null,
        coutPA: armeData.coutPA,
        degatsMin: armeData.degatsMin,
        degatsMax: armeData.degatsMax,
        degatsCritMin: armeData.degatsCritMin,
        degatsCritMax: armeData.degatsCritMax,
        chanceCritBase: armeData.chanceCritBase,
        bonusCrit: armeData.bonusCrit ?? 0,
        tauxEchec: armeData.tauxEchec,
        porteeMin: armeData.porteeMin,
        porteeMax: armeData.porteeMax,
        statUtilisee: armeData.statUtilisee,
        zone: armeZone ? { type: armeZone.type, taille: armeZone.taille } : null,
        cooldown: armeData.cooldown,
        cooldownRestant: currentEntity?.armeCooldownRestant ?? 0,
        estSoin: false,
        estInvocation: false,
        estVolDeVie: armeData.estVolDeVie ?? false,
        effets: [] as NonNullable<Sort['effets']>,
        lignes: armeData.lignes ?? [],
        sort: null,
      };
    }
    if (typeof hoveredSlotIdx === 'number') {
      const s = spells[hoveredSlotIdx];
      if (!s) return null;
      const poBonus = (s.porteeModifiable !== false) ? (currentEntity?.poBonus ?? 0) : 0;
      return {
        nom: s.nom,
        description: s.description,
        coutPA: s.coutPA,
        degatsMin: s.degatsMin,
        degatsMax: s.degatsMax,
        degatsCritMin: s.degatsCritMin,
        degatsCritMax: s.degatsCritMax,
        chanceCritBase: s.chanceCritBase,
        bonusCrit: 0,
        tauxEchec: s.tauxEchec,
        porteeMin: Math.max(0, s.porteeMin - poBonus),
        porteeMax: s.porteeMax + poBonus,
        statUtilisee: s.statUtilisee,
        zone: s.zone ?? null,
        cooldown: s.cooldown,
        cooldownRestant: s.cooldownRestant ?? 0,
        estSoin: s.estSoin,
        estInvocation: s.estInvocation,
        estVolDeVie: s.estVolDeVie ?? false,
        effets: s.effets || [],
        lignes: [],
        sort: s,
      };
    }
    return null;
  })();

  const renderSlotTooltipContent = (data: SlotTooltipData) => (
    <>
      <div className="spell-info-header">
        <strong>{data.nom}</strong>
        <span className="spell-info-pa">{data.coutPA} PA</span>
      </div>
      {data.description && <div className="spell-description">{data.description}</div>}
      <div className="spell-info-rows">
        {data.lignes.length > 0 ? (
          <>
            {data.lignes.map((l, i) => (
              <div key={i} className="spell-info-row">
                <span className="label">
                  {l.estSoin ? 'Soin' : 'Dgts'} {i + 1}
                  {l.estVolDeVie && <span style={{ color: '#00c853', fontSize: 9, marginLeft: 3 }}>VdV</span>}
                </span>
                <span>{l.degatsMin}-{l.degatsMax} {STAT_LABELS[l.statUtilisee] || l.statUtilisee}</span>
              </div>
            ))}
            <div className="spell-info-row">
              <span className="label">Crit</span>
              <span>+{data.bonusCrit} ({Math.round(data.chanceCritBase * 100)}%)</span>
            </div>
          </>
        ) : !data.estInvocation && (
          <>
            <div className="spell-info-row">
              <span className="label">{data.estSoin ? 'Soin' : 'Dgts'}</span>
              <span>{data.degatsMin}-{data.degatsMax} {STAT_LABELS[data.statUtilisee] || data.statUtilisee}</span>
            </div>
            {data.degatsCritMin > 0 && (
              <div className="spell-info-row">
                <span className="label">Crit</span>
                <span>{data.degatsCritMin}-{data.degatsCritMax} ({Math.round(data.chanceCritBase * 100)}%)</span>
              </div>
            )}
          </>
        )}
        {data.tauxEchec > 0 && (
          <div className="spell-info-row">
            <span className="label">Echec</span>
            <span>{Math.round(data.tauxEchec * 100)}%</span>
          </div>
        )}
        <div className="spell-info-row">
          <span className="label">Portée</span>
          <span>
            {data.porteeMin}-{data.porteeMax}
            {data.sort?.porteeModifiable === false && <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 4 }}>(fixe)</span>}
          </span>
        </div>
        {data.zone && (
          <div className="spell-info-row">
            <span className="label">Zone</span>
            <span>{ZONE_LABELS[data.zone.type] || data.zone.type} {data.zone.taille > 0 ? data.zone.taille : ''}</span>
          </div>
        )}
        {data.cooldown > 0 && (
          <div className="spell-info-row">
            <span className="label">Cooldown</span>
            <span>{data.cooldown}t{data.cooldownRestant > 0 ? ` (${data.cooldownRestant}t)` : ''}</span>
          </div>
        )}
      </div>
      {(data.estSoin || data.estInvocation || data.estVolDeVie || data.sort?.estGlyphe || data.sort?.estPiege || (data.sort as any)?.estTeleportation || data.sort?.ligneDirecte) && (
        <div className="spell-info-badges">
          {data.estSoin && <span className="spell-badge heal">Soin</span>}
          {data.estInvocation && <span className="spell-badge invocation">Invocation</span>}
          {data.estVolDeVie && <span className="spell-badge lifesteal">Vol de vie</span>}
          {data.sort?.estGlyphe && <span className="spell-badge" style={{ background: 'rgba(255,140,0,0.2)', color: '#ff8c00' }}>Glyphe ({data.sort.poseDuree ?? '?'}t)</span>}
          {data.sort?.estPiege && <span className="spell-badge" style={{ background: 'rgba(180,0,200,0.2)', color: '#b400c8' }}>Piège ({data.sort.poseDuree ?? '?'}t)</span>}
          {(data.sort as any)?.estTeleportation && <span className="spell-badge" style={{ background: 'rgba(100,60,220,0.2)', color: '#7c3aed' }}>Téléportation</span>}
          {data.sort?.ligneDirecte && <span className="spell-badge" style={{ background: 'rgba(0,150,255,0.15)', color: '#0096ff' }}>Ligne droite</span>}
        </div>
      )}
      {data.effets && data.effets.length > 0 && (
        <div className="spell-effects-section">
          <div className="spell-effects-title">Effets</div>
          {data.effets.map((ef, i) => (
            <div key={i} className={`spell-effect-row ${ef.type.toLowerCase()}`}>
              <span className="spell-effect-name">{ef.nom}</span>
              <span className="spell-effect-detail">
                {ef.type === 'POISON'
                  ? `${ef.valeurMin ?? ef.valeur}-${ef.valeur} dgts/t`
                  : ef.type === 'RESISTANCE'
                    ? `r${{ FORCE: 'FOR', INTELLIGENCE: 'INT', DEXTERITE: 'DEX', AGILITE: 'AGI' }[ef.statCiblee] || ef.statCiblee} ${ef.valeur > 0 ? '+' : ''}${ef.valeur}%`
                    : `${STAT_LABELS[ef.statCiblee] || ef.statCiblee} ${ef.valeur > 0 ? '+' : ''}${ef.valeur}`}
              </span>
              <span className="spell-effect-meta">{ef.duree}t | {Math.round(ef.chanceDeclenchement * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="combat-page">
      {/* Header */}
      <div className="combat-header">
        <div>
          <strong>Combat #{combat.id}</strong> | Tour {combat.tourActuel}
        </div>
        <div>
          {currentEntity && <span>Au tour de: <strong>{currentEntity.nom}</strong></span>}
        </div>
        <div className={`status ${combat.status.toLowerCase().replace('_', '-')}`}>
          {combat.status}
        </div>
      </div>

      {/* Main area: turn-order left + grid + right panel */}
      <div className="combat-main">
        {/* Turn order - colonne gauche verticale */}
        <div className="turn-order">
          {turnOrder.map(e => {
            const effects = getEntityEffects(e.id);
            const hasBuff = effects.some(ef => ef.type === 'BUFF');
            const hasDebuff = effects.some(ef => ef.type === 'DEBUFF');
            const hasPoison = effects.some(ef => ef.type === 'POISON');
            return (
              <div key={e.id} className={`turn-entity ${e.equipe === 0 ? 'player' : 'enemy'} ${e.pvActuels <= 0 ? 'dead' : ''} ${e.id === combat.entiteActuelle ? 'active' : ''}`}>
                <span className="turn-name">{e.nom}</span>
                <span className="turn-stats">{e.pvActuels}/{e.pvMax} PV</span>
                {e.pvActuels > 0 && (
                  <span className="turn-resources">
                    <span className="turn-pa">{e.paActuels}PA</span>
                    <span className="turn-pm">{e.pmActuels}PM</span>
                    {(hasBuff || hasDebuff || hasPoison) && (
                      <span className="turn-effects">
                        {hasBuff && <span className="turn-dot buff-dot" />}
                        {hasDebuff && <span className="turn-dot debuff-dot" />}
                        {hasPoison && <span className="turn-dot poison-dot" />}
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Victory/Defeat overlay */}
        {isFinished && (
          <div className="combat-result-overlay">
            <div className={`combat-result ${enemiesAlive.length === 0 ? 'victory' : 'defeat'}`}>
              <h2>{enemiesAlive.length === 0 ? 'Victoire!' : 'Defaite...'}</h2>
              {enemiesAlive.length === 0 && (() => {
                const lootLogs = log.filter(l => l.type === 'FIN' && l.message.includes('Butin'));
                if (lootLogs.length === 0) return null;
                return (
                  <div className="loot-panel">
                    <h3>Butin</h3>
                    {lootLogs.map(l => (
                      <div key={l.id} className="loot-line">{l.message}</div>
                    ))}
                  </div>
                );
              })()}
              <button className="btn btn-primary" onClick={() => {
                if (combat.groupeId) navigate(`/game/adventure?groupId=${combat.groupeId}`);
                else if (combat.personnageId) navigate(`/game/adventure?charId=${combat.personnageId}`);
                else navigate('/game/dashboard');
              }}>Retour a l'aventure</button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid-container" ref={gridContainerRef}>
          <div className="combat-grid" style={{
            gridTemplateColumns: `repeat(${combat.grille.largeur}, 1fr)`,
            gridTemplateRows: `repeat(${combat.grille.hauteur}, 1fr)`,
            ...(gridPixelSize
              ? { width: gridPixelSize.w, height: gridPixelSize.h }
              : { width: '100%', aspectRatio: `${combat.grille.largeur} / ${combat.grille.hauteur}` }),
          }}>
            {Array.from({ length: combat.grille.hauteur }, (_, y) =>
              Array.from({ length: combat.grille.largeur }, (_, x) => {
                const cellKey = `${x},${y}`;
                const obstacle = obstacleMap.get(cellKey);
                const entity = entityMap.get(cellKey);
                const isCurrentTurn = entity?.id === combat.entiteActuelle;
                const isSelected = entity?.id === selectedEntity?.id;
                const isDead = entity && entity.pvActuels <= 0;

                const inMoveRange = moveMode && reachableCells.has(cellKey);
                const inPath = moveMode && pathCells.has(cellKey);
                const inSpellRange = (selectedSort || weaponMode) && rangeCells.has(cellKey);
                const inSpellBlocked = (selectedSort || weaponMode) && rangeBlockedCells.has(cellKey);
                const inAoe = aoeCells.has(cellKey);
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

                const glyphe = glypheCellMap.get(cellKey);
                const piege = piegeCellMap.get(cellKey);

                let cellClass = 'combat-cell';
                if (obstacle) {
                  cellClass += obstacle.bloqueLigneDeVue ? ' obstacle-los' : ' obstacle';
                }
                if (entity && !isDead) {
                  if (entity.invocateurId) cellClass += ' invocation-cell';
                  else if (entity.equipe === 0) cellClass += ' player-cell';
                  else cellClass += ' enemy-cell';
                }
                if (isCurrentTurn) cellClass += ' current-turn';
                if (isSelected) cellClass += ' selected-cell';
                if (isDead) cellClass += ' dead';
                if (inMoveRange) cellClass += ' move-range';
                if (inPath) cellClass += ' cell-path';
                if (inSpellRange) cellClass += ' spell-range';
                if (inSpellBlocked) cellClass += ' spell-range-blocked';
                if (inAoe) cellClass += ' aoe-preview';
                if ((moveMode || selectedSort || weaponMode) && !inMoveRange && !inSpellRange && !inSpellBlocked) cellClass += ' target-mode-off';
                if (inMoveRange || inSpellRange) cellClass += ' target-mode';

                const showTooltip = isHovered && entity && entity.pvActuels > 0 && !moveMode && !selectedSort && !weaponMode;
                const hoveredEffects = entity ? getEntityEffects(entity.id) : [];
                const entityEffects = entity ? getEntityEffects(entity.id) : [];
                const entHasBuff = entityEffects.some(ef => ef.type === 'BUFF');
                const entHasDebuff = entityEffects.some(ef => ef.type === 'DEBUFF');

                return (
                  <div key={cellKey} className={cellClass}
                    onClick={() => handleCellClick(x, y)}
                    onMouseEnter={() => setHoveredCell({ x, y })}
                    onMouseLeave={() => setHoveredCell(null)}>
                    {entity && (
                      <>
                        <div className="hp-mini">
                          <div className="hp-mini-fill" style={{ width: `${(entity.pvActuels / entity.pvMax) * 100}%` }} />
                        </div>
                        <span className="entity-icon">
                          {entity.invocateurId ? 'I' : entity.equipe === 0 ? 'J' : 'M'}
                        </span>
                        <span className="entity-name">{entity.nom}</span>
                        {(entHasBuff || entHasDebuff || entityEffects.some(ef => ef.type === 'BOUCLIER')) && (
                          <div className="cell-effects">
                            {entHasBuff && <span className="cell-dot buff-dot" />}
                            {entHasDebuff && <span className="cell-dot debuff-dot" />}
                            {entityEffects.some(ef => ef.type === 'BOUCLIER') && <span className="bouclier-badge" title="Bouclier actif">🛡</span>}
                          </div>
                        )}
                        {entity.id === combat.entiteActuelle && (
                          <div className="cell-resources">
                            <span className="cell-pa">{entity.paActuels}</span>
                            <span className="cell-pm">{entity.pmActuels}</span>
                          </div>
                        )}
                      </>
                    )}
                    {obstacle && !entity && <span style={{ color: '#555' }}>X</span>}
                    {glyphe && (
                      <div className="zone-glyphe" title={`Glyphe (${glyphe.toursRestants}t restants)`}>⬡</div>
                    )}
                    {piege && (
                      <div className="zone-piege" title={`Piège (${piege.toursRestants}t restants)`}>⊗</div>
                    )}
                    {showTooltip && entity && (
                      <div className="entity-tooltip">
                        <div className="tooltip-name">{entity.nom}</div>
                        <div className="tooltip-hp">{entity.pvActuels}/{entity.pvMax} PV</div>
                        <div className="tooltip-resources">
                          <span className="tooltip-pa">{entity.paActuels}/{entity.paMax} PA</span>
                          <span className="tooltip-pm">{entity.pmActuels}/{entity.pmMax} PM</span>
                        </div>
                        <div className="tooltip-team">
                          {entity.invocateurId ? 'Invocation' : entity.equipe === 0 ? 'Joueur' : 'Ennemi'}
                        </div>
                        {(() => {
                          const allEffets = combat.effetsActifs || [];
                          const resistRows = RESIST_STATS
                            .map(([label, stat]) => [`r${label}`, calcEffectiveResistance(entity.id, entity, stat, allEffets)] as [string, number])
                            .filter(([, v]) => v !== 0);
                          if (resistRows.length === 0) return null;
                          return (
                            <div className="tooltip-resistances">
                              {resistRows.map(([label, val]) => (
                                <span key={label} className="tooltip-resist" style={{ color: val > 0 ? undefined : '#ff6b6b' }}>
                                  {label} {val > 0 ? '+' : ''}{val}%
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                        {hoveredEffects.length > 0 && (
                          <div className="tooltip-effects">
                            {hoveredEffects.map(ef => {
                              const isPoisonEf = ef.type === 'POISON';
                              const isResistEf = ef.type === 'RESISTANCE';
                              const STAT_ABBR: Record<string, string> = { FORCE: 'FOR', INTELLIGENCE: 'INT', DEXTERITE: 'DEX', AGILITE: 'AGI' };
                              const detail = isPoisonEf
                                ? `${ef.valeurMin ?? ef.valeur}-${ef.valeur} dgts/tour`
                                : isResistEf
                                  ? `r${STAT_ABBR[ef.statCiblee] || ef.statCiblee} ${ef.valeur > 0 ? '+' : ''}${ef.valeur}%`
                                  : `${STAT_LABELS[ef.statCiblee] || ef.statCiblee} ${ef.valeur > 0 ? '+' : ''}${ef.valeur}`;
                              return (
                                <span key={ef.id} className={`tooltip-effect ${ef.type?.toLowerCase() || ''}`}>
                                  {ef.nom || `Effet #${ef.effetId}`} ({ef.toursRestants}t)
                                  <span className="tooltip-effect-detail"> {detail}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel: journal */}
        <div className="combat-right-panel">
          <div className="combat-log" ref={logRef}>
            <h4>Journal</h4>
            {log.length === 0 ? (
              <div className="log-entry" style={{ color: 'var(--text-muted)' }}>Combat commence...</div>
            ) : (
              log.map((entry) => {
                let entryClass = 'log-entry';
                switch (entry.type) {
                  case 'ACTION':
                    entryClass += entry.message.includes('récupère') ? ' log-heal' : ' log-damage';
                    break;
                  case 'MORT': entryClass += ' log-death'; break;
                  case 'TOUR':
                  case 'DEPLACEMENT': entryClass += ' log-turn'; break;
                  case 'EFFET': entryClass += ' log-effect'; break;
                  case 'EFFET_EXPIRE': entryClass += ' log-effect-expire'; break;
                  case 'FIN': entryClass += ' log-death'; break;
                }
                return <div key={entry.id} className={entryClass}>{entry.message}</div>;
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar: weapon + spell grid + actions */}
      <div className="bottom-bar">
        {/* Enemy turn / finished overlay */}
        {(!isPlayerTurn || isFinished) && (
          <div className="bottom-bar-overlay">
            {isFinished ? 'Combat terminé' : `Tour de ${currentEntity?.nom || 'ennemi'}...`}
          </div>
        )}

        {/* Spell bar group: weapon + grid + actions (50% de la barre) */}
        <div className="spell-bar-group">
        {/* Weapon slot */}
        <div
          className={`spell-slot-weapon ${!armeData ? 'disabled' : ''} ${weaponMode ? 'selected' : ''}`}
          onClick={() => {
            if (!isPlayerTurn || isFinished || !armeData) return;
            clearTargeting();
            setWeaponMode(!weaponMode);
          }}
          onMouseEnter={() => { if (armeData) setHoveredSlotIdx('arme'); }}
          onMouseLeave={() => setHoveredSlotIdx(null)}
        >
          <span style={{ fontSize: 14 }}>{armeData ? '⚔️' : '—'}</span>
          <span className="slot-name">{armeData?.nom || 'Arme'}</span>
          {(currentEntity?.armeCooldownRestant ?? 0) > 0 && (
            <span className="slot-cooldown">{currentEntity!.armeCooldownRestant}</span>
          )}
          {hoveredSlotIdx === 'arme' && slotTooltipData && (
            <div className="slot-tooltip">{renderSlotTooltipContent(slotTooltipData)}</div>
          )}
        </div>

        {/* Spell grid: 8 columns × 3 rows = 24 slots */}
        <div className="spell-grid">
          {Array.from({ length: 24 }, (_, i) => {
            const s = spells[i] ?? null;
            if (!s) return <div key={i} className="spell-slot empty" />;
            const onCd = !!(s.cooldownRestant && s.cooldownRestant > 0);
            const tooExpensive = !!(currentEntity && s.coutPA > currentEntity.paActuels);
            const isSelected = selectedSort?.id === s.id;
            return (
              <div
                key={i}
                className={`spell-slot${isSelected ? ' selected' : ''}${(onCd || tooExpensive) ? ' too-expensive' : ''}`}
                onClick={() => {
                  if (!isPlayerTurn || isFinished || onCd || tooExpensive) return;
                  clearTargeting();
                  setSelectedSort(selectedSort?.id === s.id ? null : s);
                }}
                onMouseEnter={() => setHoveredSlotIdx(i)}
                onMouseLeave={() => setHoveredSlotIdx(null)}
              >
                <span className="slot-emoji">{getSpellEmoji(s)}</span>
                <span className="slot-name">{s.nom}</span>
                <span className="slot-pa">{s.coutPA}PA</span>
                {onCd && <span className="slot-cooldown">{s.cooldownRestant}</span>}
                {hoveredSlotIdx === i && slotTooltipData && (
                  <div className="slot-tooltip">{renderSlotTooltipContent(slotTooltipData)}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action column */}
        <div className="action-col">
          {isPlayerTurn && !isFinished && (
            <>
              <div className="pa-pm-display">
                <span style={{ color: 'var(--info)' }}>{currentEntity?.paActuels ?? 0} PA</span>
                {' | '}
                <span style={{ color: 'var(--success)' }}>{currentEntity?.pmActuels ?? 0} PM</span>
              </div>
            </>
          )}
          <button
            className={`btn btn-sm ${moveMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { clearTargeting(); setMoveMode(!moveMode); }}
            disabled={!isPlayerTurn || isFinished}
          >
            Déplacer
          </button>
          <button
            className="btn btn-sm btn-warning"
            onClick={async () => {
              if (!currentEntity) return;
              await combatApi.endTurn(combat.id, { entiteId: currentEntity.id });
              fetchCombat();
            }}
            disabled={!isPlayerTurn || isFinished}
          >
            Fin tour
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={async () => {
              if (!currentEntity) return;
              if (confirm('Fuir le combat?')) {
                await combatApi.flee(combat.id, { entiteId: currentEntity.id });
                fetchCombat();
              }
            }}
            disabled={!isPlayerTurn || isFinished}
          >
            Fuir
          </button>
        </div>
        </div>{/* fin spell-bar-group */}

        {/* Entity panel compact — en bas à droite (50% de la barre), 3 colonnes */}
        <div className="entity-panel-compact">
          {(() => {
            const ent = selectedEntity || currentEntity;
            if (!ent) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Cliquez sur une entité</span>;
            const allEffets = combat.effetsActifs || [];
            const resistRows = RESIST_STATS
              .map(([label, stat]) => [label, calcEffectiveResistance(ent.id, ent, stat, allEffets)] as [string, number])
              .filter(([, v]) => v !== 0);
            const effects = getEntityEffects(ent.id);
            return (
              <div className="epc-columns">
                {/* Colonne 1 : nom + barres */}
                <div className="epc-col epc-col-bars">
                  <div className="epc-name">{ent.nom}</div>
                  <div className="epc-bar-row">
                    <span className="epc-label">PV</span>
                    <div className="epc-bar"><div className="epc-bar-fill hp" style={{ width: `${(ent.pvActuels / ent.pvMax) * 100}%` }} /></div>
                    <span className="epc-val">{ent.pvActuels}/{ent.pvMax}</span>
                  </div>
                  <div className="epc-bar-row">
                    <span className="epc-label">PA</span>
                    <div className="epc-bar"><div className="epc-bar-fill pa" style={{ width: `${(ent.paActuels / ent.paMax) * 100}%` }} /></div>
                    <span className="epc-val">{ent.paActuels}/{ent.paMax}</span>
                  </div>
                  <div className="epc-bar-row">
                    <span className="epc-label">PM</span>
                    <div className="epc-bar"><div className="epc-bar-fill pm" style={{ width: `${(ent.pmActuels / ent.pmMax) * 100}%` }} /></div>
                    <span className="epc-val">{ent.pmActuels}/{ent.pmMax}</span>
                  </div>
                  {effects.length > 0 && (
                    <div className="epc-effects">
                      {effects.map(ef => (
                        <span key={ef.id} className={`effect-tag ${ef.type?.toLowerCase() || ''}`}>
                          {ef.nom} ({ef.toursRestants}t)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Colonne 2 : stats */}
                <div className="epc-col epc-col-stats">
                  <div className="epc-col-title">Stats</div>
                  <div className="epc-stat-row"><span>FOR</span><span>{ent.stats.force}</span></div>
                  <div className="epc-stat-row"><span>INT</span><span>{ent.stats.intelligence}</span></div>
                  <div className="epc-stat-row"><span>DEX</span><span>{ent.stats.dexterite}</span></div>
                  <div className="epc-stat-row"><span>AGI</span><span>{ent.stats.agilite}</span></div>
                  <div className="epc-stat-row"><span>CHA</span><span>{ent.stats.chance}</span></div>
                </div>
                {/* Colonne 3 : résistances */}
                <div className="epc-col epc-col-resist">
                  <div className="epc-col-title">Résistances</div>
                  {resistRows.length === 0
                    ? <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                    : resistRows.map(([label, val]) => (
                      <div key={label} className="epc-stat-row">
                        <span>r{label}</span>
                        <span style={{ color: val > 0 ? 'var(--success)' : 'var(--danger)' }}>{val > 0 ? '+' : ''}{val}%</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CombatPage;
