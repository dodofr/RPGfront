import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { combatApi } from '../../api/combat';
import { zonesApi } from '../../api/static';
import type { CombatState, CombatEntity, CombatCase, Sort, EffetActif, ZoneType, Zone, CombatLogEntry } from '../../types';
import {
  getReachableCells,
  getCellsInRange,
  getAffectedCells,
  hasLineOfSight,
} from '../../utils/combatPreview';

interface ArmeData {
  nom: string;
  degatsMin: number;
  degatsMax: number;
  degatsCritMin: number;
  degatsCritMax: number;
  chanceCritBase: number;
  coutPA: number;
  porteeMin: number;
  porteeMax: number;
  ligneDeVue: boolean;
  zoneId: number | null;
  statUtilisee: string;
  cooldown: number;
  tauxEchec: number;
}

const STAT_LABELS: Record<string, string> = {
  FORCE: 'Force',
  INTELLIGENCE: 'Intelligence',
  DEXTERITE: 'Dextérité',
  AGILITE: 'Agilité',
  VIE: 'Vie',
  CHANCE: 'Chance',
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
  const [zones, setZones] = useState<Zone[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const lastLogIdRef = useRef<number>(0);

  const combatId = id ? parseInt(id) : null;

  // Fetch zones for weapon AoE resolution
  useEffect(() => {
    zonesApi.getAll().then(setZones);
  }, []);

  // Fetch combat list if no ID
  useEffect(() => {
    if (!combatId) {
      combatApi.getAll().then(setCombatList).finally(() => setLoading(false));
    }
  }, [combatId]);

  // Fetch combat state
  const fetchCombat = useCallback(async () => {
    if (!combatId) return;
    try {
      const data = await combatApi.getById(combatId);
      setCombat(data);

      // Append new logs from backend
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

  // Polling
  useEffect(() => {
    if (!combatId) return;
    fetchCombat();
    const timer = setInterval(fetchCombat, 500);
    return () => clearInterval(timer);
  }, [combatId, fetchCombat]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // No combat ID - show list
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

  // Use spells from combat state (entity.sorts) instead of separate API call
  const spells: Sort[] = (() => {
    if (!currentEntity || !isPlayerTurn) return [];
    return currentEntity.sorts || [];
  })();

  // Build grid lookup maps
  const obstacleMap = new Map<string, CombatCase>();
  combat.cases.forEach(c => obstacleMap.set(`${c.x},${c.y}`, c));
  const entityMap = new Map<string, CombatEntity>();
  combat.entites.filter(e => e.pvActuels > 0).forEach(e => entityMap.set(`${e.position.x},${e.position.y}`, e));

  // ArmeData helper
  const armeData = currentEntity?.armeData ? currentEntity.armeData as unknown as ArmeData : null;
  const armeZone = armeData?.zoneId ? zones.find(z => z.id === armeData.zoneId) ?? null : null;

  // --- Preview computations ---

  // Reachable cells for movement
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

  // Range cells for spell/weapon
  const rangeCells: Set<string> = (() => {
    if (!currentEntity || !isPlayerTurn) return new Set<string>();
    if (!selectedSort && !weaponMode) return new Set<string>();

    const porteeMin = selectedSort ? selectedSort.porteeMin : armeData?.porteeMin ?? 1;
    const porteeMax = selectedSort ? selectedSort.porteeMax : armeData?.porteeMax ?? 1;
    const needLos = selectedSort ? selectedSort.ligneDeVue : armeData?.ligneDeVue ?? true;

    const allInRange = getCellsInRange(
      currentEntity.position,
      porteeMin,
      porteeMax,
      combat.grille.largeur,
      combat.grille.hauteur
    );

    if (!needLos) return allInRange;

    // Filter by LOS
    const result = new Set<string>();
    allInRange.forEach(k => {
      const [cx, cy] = k.split(',').map(Number);
      if (hasLineOfSight(currentEntity.position, { x: cx, y: cy }, combat.entites, combat.cases)) {
        result.add(k);
      }
    });
    return result;
  })();

  // Blocked range cells (in range but no LOS)
  const rangeBlockedCells: Set<string> = (() => {
    if (!currentEntity || !isPlayerTurn) return new Set<string>();
    if (!selectedSort && !weaponMode) return new Set<string>();

    const needLos = selectedSort ? selectedSort.ligneDeVue : armeData?.ligneDeVue ?? true;
    if (!needLos) return new Set<string>();

    const porteeMin = selectedSort ? selectedSort.porteeMin : armeData?.porteeMin ?? 1;
    const porteeMax = selectedSort ? selectedSort.porteeMax : armeData?.porteeMax ?? 1;

    const allInRange = getCellsInRange(
      currentEntity.position,
      porteeMin,
      porteeMax,
      combat.grille.largeur,
      combat.grille.hauteur
    );

    const blocked = new Set<string>();
    allInRange.forEach(k => {
      if (!rangeCells.has(k)) {
        blocked.add(k);
      }
    });
    return blocked;
  })();

  // AoE preview cells
  const aoeCells: Set<string> = (() => {
    if (!hoveredCell || !currentEntity || !isPlayerTurn) return new Set<string>();
    if (!selectedSort && !weaponMode) return new Set<string>();

    const hKey = `${hoveredCell.x},${hoveredCell.y}`;
    if (!rangeCells.has(hKey)) return new Set<string>();

    // Determine zone config
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
      } catch {
        // Invalid move
      }
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
      } catch {
        // Invalid action
      }
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
      } catch {
        // Invalid action
      }
      return;
    }

    // Click on entity to select it for info
    const entity = entityMap.get(`${x},${y}`);
    if (entity) setSelectedEntity(entity);
  };

  // Sort entities by ordreJeu for turn order display
  const turnOrder = [...combat.entites].sort((a, b) => a.ordreJeu - b.ordreJeu);

  // Entity effects helper
  const getEntityEffects = (entiteId: number): EffetActif[] =>
    combat.effetsActifs?.filter(e => e.entiteId === entiteId) || [];

  // Spell info panel data
  const spellInfoData = (() => {
    if (selectedSort) {
      return {
        nom: selectedSort.nom,
        description: selectedSort.description,
        coutPA: selectedSort.coutPA,
        degatsMin: selectedSort.degatsMin,
        degatsMax: selectedSort.degatsMax,
        degatsCritMin: selectedSort.degatsCritMin,
        degatsCritMax: selectedSort.degatsCritMax,
        chanceCritBase: selectedSort.chanceCritBase,
        tauxEchec: selectedSort.tauxEchec,
        porteeMin: selectedSort.porteeMin,
        porteeMax: selectedSort.porteeMax,
        statUtilisee: selectedSort.statUtilisee,
        zone: selectedSort.zone,
        cooldown: selectedSort.cooldown,
        cooldownRestant: selectedSort.cooldownRestant ?? 0,
        estSoin: selectedSort.estSoin,
        estDispel: selectedSort.estDispel,
        estInvocation: selectedSort.estInvocation,
        effets: selectedSort.effets || [],
      };
    }
    if (weaponMode && armeData) {
      return {
        nom: armeData.nom,
        description: null as string | null | undefined,
        coutPA: armeData.coutPA,
        degatsMin: armeData.degatsMin,
        degatsMax: armeData.degatsMax,
        degatsCritMin: armeData.degatsCritMin,
        degatsCritMax: armeData.degatsCritMax,
        chanceCritBase: armeData.chanceCritBase,
        tauxEchec: armeData.tauxEchec,
        porteeMin: armeData.porteeMin,
        porteeMax: armeData.porteeMax,
        statUtilisee: armeData.statUtilisee,
        zone: armeZone ? { type: armeZone.type, taille: armeZone.taille } : null,
        cooldown: armeData.cooldown,
        cooldownRestant: currentEntity?.armeCooldownRestant ?? 0,
        estSoin: false,
        estDispel: false,
        estInvocation: false,
        effets: [] as NonNullable<Sort['effets']>,
      };
    }
    return null;
  })();

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

      {/* Finished state */}
      {isFinished && (
        <div className={`combat-result ${enemiesAlive.length === 0 ? 'victory' : 'defeat'}`}>
          <h2>{enemiesAlive.length === 0 ? 'Victoire!' : 'Defaite...'}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/game/combat')}>Retour</button>
        </div>
      )}

      {/* Turn order - enhanced with PA/PM and effect dots */}
      <div className="turn-order">
        {turnOrder.map(e => {
          const effects = getEntityEffects(e.id);
          const hasBuff = effects.some(ef => ef.type === 'BUFF');
          const hasDebuff = effects.some(ef => ef.type === 'DEBUFF');
          return (
            <span key={e.id} className={`turn-entity ${e.equipe === 0 ? 'player' : 'enemy'} ${e.pvActuels <= 0 ? 'dead' : ''} ${e.id === combat.entiteActuelle ? 'active' : ''}`}>
              <span className="turn-name">{e.nom}</span>
              <span className="turn-stats">{e.pvActuels}/{e.pvMax} PV</span>
              {e.pvActuels > 0 && (
                <span className="turn-resources">
                  <span className="turn-pa">{e.paActuels}PA</span>
                  <span className="turn-pm">{e.pmActuels}PM</span>
                </span>
              )}
              {(hasBuff || hasDebuff) && (
                <span className="turn-effects">
                  {hasBuff && <span className="turn-dot buff-dot" />}
                  {hasDebuff && <span className="turn-dot debuff-dot" />}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div className="combat-body">
        {/* Sidebar */}
        <div className="combat-sidebar">
          {/* Entity Panel */}
          <div className="entity-panel">
            <h4>{selectedEntity?.nom || currentEntity?.nom || '---'}</h4>
            {(() => {
              const ent = selectedEntity || currentEntity;
              if (!ent) return null;
              const hpPct = (ent.pvActuels / ent.pvMax) * 100;
              const effects = getEntityEffects(ent.id);
              return (
                <>
                  <div className="bars">
                    <div className="bar-label"><span>PV</span><span>{ent.pvActuels}/{ent.pvMax}</span></div>
                    <div className="stat-bar hp-bar"><div className="stat-bar-fill" style={{ width: `${hpPct}%` }} /></div>
                    <div className="bar-label" style={{ marginTop: 4 }}><span>PA</span><span>{ent.paActuels}/{ent.paMax}</span></div>
                    <div className="stat-bar pa-bar"><div className="stat-bar-fill" style={{ width: `${(ent.paActuels / ent.paMax) * 100}%` }} /></div>
                    <div className="bar-label" style={{ marginTop: 4 }}><span>PM</span><span>{ent.pmActuels}/{ent.pmMax}</span></div>
                    <div className="stat-bar pm-bar"><div className="stat-bar-fill" style={{ width: `${(ent.pmActuels / ent.pmMax) * 100}%` }} /></div>
                  </div>
                  <div className="stat-row"><span className="label">FOR</span><span>{ent.stats.force}</span></div>
                  <div className="stat-row"><span className="label">INT</span><span>{ent.stats.intelligence}</span></div>
                  <div className="stat-row"><span className="label">DEX</span><span>{ent.stats.dexterite}</span></div>
                  <div className="stat-row"><span className="label">AGI</span><span>{ent.stats.agilite}</span></div>
                  <div className="stat-row"><span className="label">VIE</span><span>{ent.stats.vie}</span></div>
                  <div className="stat-row"><span className="label">CHA</span><span>{ent.stats.chance}</span></div>
                  {effects.length > 0 && (
                    <div className="effects-list">
                      {effects.map(ef => (
                        <span key={ef.id} className={`effect-tag ${ef.type?.toLowerCase() || ''}`}
                          title={`${STAT_LABELS[ef.statCiblee] || ef.statCiblee} ${ef.valeur > 0 ? '+' : ''}${ef.valeur}`}>
                          {ef.nom || `Effet #${ef.effetId}`} ({ef.toursRestants}t)
                          <span className="effect-detail"> {STAT_LABELS[ef.statCiblee] || ef.statCiblee} {ef.valeur > 0 ? '+' : ''}{ef.valeur}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Spell Bar */}
          {isPlayerTurn && !isFinished && (
            <div className="spell-bar">
              <h4>Actions</h4>
              <div className="spell-list">
                {spells.map(s => {
                  const onCd = s.cooldownRestant && s.cooldownRestant > 0;
                  const tooExpensive = currentEntity && s.coutPA > currentEntity.paActuels;
                  return (
                    <button key={s.id}
                      className={`spell-btn ${selectedSort?.id === s.id ? 'selected' : ''} ${onCd || tooExpensive ? 'on-cooldown' : ''}`}
                      onClick={() => {
                        if (onCd || tooExpensive) return;
                        clearTargeting();
                        setSelectedSort(selectedSort?.id === s.id ? null : s);
                      }}
                      disabled={!!onCd || !!tooExpensive}
                      title={s.description || `${s.nom} - ${s.degatsMin}-${s.degatsMax} dmg`}>
                      {s.nom}
                      <span className="pa-cost">{s.coutPA}PA</span>
                      {onCd && <span className="cooldown-badge">{s.cooldownRestant}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="action-buttons">
                {currentEntity?.armeData && (
                  <button className={`btn btn-sm ${weaponMode ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      clearTargeting();
                      setWeaponMode(!weaponMode);
                    }}>Arme</button>
                )}
                <button className={`btn btn-sm ${moveMode ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    clearTargeting();
                    setMoveMode(!moveMode);
                  }}>
                  Deplacer ({currentEntity?.pmActuels}PM)
                </button>
                <button className="btn btn-sm btn-warning"
                  onClick={async () => {
                    if (!currentEntity) return;
                    await combatApi.endTurn(combat.id, { entiteId: currentEntity.id });
                    fetchCombat();
                  }}>Fin tour</button>
                <button className="btn btn-sm btn-danger"
                  onClick={async () => {
                    if (!currentEntity) return;
                    if (confirm('Fuir le combat?')) {
                      await combatApi.flee(combat.id, { entiteId: currentEntity.id });
                      fetchCombat();
                    }
                  }}>Fuir</button>
              </div>

              {/* Spell/Weapon Info Panel - Enhanced with description + effects */}
              {spellInfoData && (
                <div className="spell-info-panel">
                  <div className="spell-info-header">
                    <strong>{spellInfoData.nom}</strong>
                    <span className="spell-info-pa">{spellInfoData.coutPA} PA</span>
                  </div>
                  {spellInfoData.description && (
                    <div className="spell-description">{spellInfoData.description}</div>
                  )}
                  <div className="spell-info-rows">
                    {!spellInfoData.estDispel && !spellInfoData.estInvocation && (
                      <div className="spell-info-row">
                        <span className="label">{spellInfoData.estSoin ? 'Soin' : 'Degats'}</span>
                        <span>{spellInfoData.degatsMin}-{spellInfoData.degatsMax} {STAT_LABELS[spellInfoData.statUtilisee] || spellInfoData.statUtilisee}</span>
                      </div>
                    )}
                    {!spellInfoData.estDispel && !spellInfoData.estInvocation && spellInfoData.degatsCritMin > 0 && (
                      <div className="spell-info-row">
                        <span className="label">Critique</span>
                        <span>{spellInfoData.degatsCritMin}-{spellInfoData.degatsCritMax} ({Math.round(spellInfoData.chanceCritBase * 100)}%)</span>
                      </div>
                    )}
                    {spellInfoData.tauxEchec > 0 && (
                      <div className="spell-info-row">
                        <span className="label">Echec</span>
                        <span>{Math.round(spellInfoData.tauxEchec * 100)}%</span>
                      </div>
                    )}
                    <div className="spell-info-row">
                      <span className="label">Portee</span>
                      <span>{spellInfoData.porteeMin}-{spellInfoData.porteeMax}</span>
                    </div>
                    {spellInfoData.zone && (
                      <div className="spell-info-row">
                        <span className="label">Zone</span>
                        <span>{ZONE_LABELS[spellInfoData.zone.type] || spellInfoData.zone.type} {spellInfoData.zone.taille > 0 ? spellInfoData.zone.taille : ''}</span>
                      </div>
                    )}
                    {spellInfoData.cooldown > 0 && (
                      <div className="spell-info-row">
                        <span className="label">Cooldown</span>
                        <span>{spellInfoData.cooldown} tours{spellInfoData.cooldownRestant > 0 ? ` (${spellInfoData.cooldownRestant}t restants)` : ''}</span>
                      </div>
                    )}
                  </div>
                  {(spellInfoData.estSoin || spellInfoData.estDispel || spellInfoData.estInvocation) && (
                    <div className="spell-info-badges">
                      {spellInfoData.estSoin && <span className="spell-badge heal">Soin</span>}
                      {spellInfoData.estDispel && <span className="spell-badge dispel">Dispel</span>}
                      {spellInfoData.estInvocation && <span className="spell-badge invocation">Invocation</span>}
                    </div>
                  )}
                  {/* Effects section */}
                  {spellInfoData.effets && spellInfoData.effets.length > 0 && (
                    <div className="spell-effects-section">
                      <div className="spell-effects-title">Effets</div>
                      {spellInfoData.effets.map((ef, i) => (
                        <div key={i} className={`spell-effect-row ${ef.type.toLowerCase()}`}>
                          <span className="spell-effect-name">{ef.nom}</span>
                          <span className="spell-effect-detail">
                            {STAT_LABELS[ef.statCiblee] || ef.statCiblee} {ef.valeur > 0 ? '+' : ''}{ef.valeur}
                          </span>
                          <span className="spell-effect-meta">
                            {ef.duree}t | {Math.round(ef.chanceDeclenchement * 100)}% | {ef.surCible ? 'cible' : 'lanceur'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid-container">
          <div className="combat-grid" style={{
            gridTemplateColumns: `repeat(${combat.grille.largeur}, 40px)`,
            gridTemplateRows: `repeat(${combat.grille.hauteur}, 40px)`,
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
                const inSpellRange = (selectedSort || weaponMode) && rangeCells.has(cellKey);
                const inSpellBlocked = (selectedSort || weaponMode) && rangeBlockedCells.has(cellKey);
                const inAoe = aoeCells.has(cellKey);
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

                let cellClass = 'combat-cell';
                if (obstacle) cellClass += ' obstacle';
                if (entity && !isDead) {
                  if (entity.invocateurId) cellClass += ' invocation-cell';
                  else if (entity.equipe === 0) cellClass += ' player-cell';
                  else cellClass += ' enemy-cell';
                }
                if (isCurrentTurn) cellClass += ' current-turn';
                if (isSelected) cellClass += ' selected-cell';
                if (isDead) cellClass += ' dead';
                if (inMoveRange) cellClass += ' move-range';
                if (inSpellRange) cellClass += ' spell-range';
                if (inSpellBlocked) cellClass += ' spell-range-blocked';
                if (inAoe) cellClass += ' aoe-preview';
                if ((moveMode || selectedSort || weaponMode) && !inMoveRange && !inSpellRange && !inSpellBlocked) cellClass += ' target-mode-off';
                if (inMoveRange || inSpellRange) cellClass += ' target-mode';

                // Show tooltip for hovered entity
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
                        {/* Effect indicators on grid */}
                        {(entHasBuff || entHasDebuff) && (
                          <div className="cell-effects">
                            {entHasBuff && <span className="cell-dot buff-dot" />}
                            {entHasDebuff && <span className="cell-dot debuff-dot" />}
                          </div>
                        )}
                        {/* PA/PM mini display */}
                        {entity.id === combat.entiteActuelle && (
                          <div className="cell-resources">
                            <span className="cell-pa">{entity.paActuels}</span>
                            <span className="cell-pm">{entity.pmActuels}</span>
                          </div>
                        )}
                      </>
                    )}
                    {obstacle && !entity && <span style={{ color: '#555' }}>X</span>}
                    {/* Entity Tooltip - Enhanced with stats and effect details */}
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
                        {hoveredEffects.length > 0 && (
                          <div className="tooltip-effects">
                            {hoveredEffects.map(ef => (
                              <span key={ef.id} className={`tooltip-effect ${ef.type?.toLowerCase() || ''}`}>
                                {ef.nom || `Effet #${ef.effetId}`} ({ef.toursRestants}t)
                                <span className="tooltip-effect-detail">
                                  {' '}{STAT_LABELS[ef.statCiblee] || ef.statCiblee} {ef.valeur > 0 ? '+' : ''}{ef.valeur}
                                </span>
                              </span>
                            ))}
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
      </div>

      {/* Combat Log */}
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
              case 'MORT':
                entryClass += ' log-death';
                break;
              case 'TOUR':
              case 'DEPLACEMENT':
                entryClass += ' log-turn';
                break;
              case 'EFFET':
                entryClass += ' log-effect';
                break;
              case 'EFFET_EXPIRE':
                entryClass += ' log-effect-expire';
                break;
              case 'FIN':
                entryClass += ' log-death';
                break;
            }
            return <div key={entry.id} className={entryClass}>{entry.message}</div>;
          })
        )}
      </div>
    </div>
  );
};

export default CombatPage;
