import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../../api/groups';
import { mapsApi } from '../../api/maps';
import { pnjApi } from '../../api/pnj';
import { charactersApi } from '../../api/characters';
import { queteApi } from '../../api/quetes';
import type { Group, GameMap, Direction, MapConnection, GroupeEnnemi, MapCase, PNJ, Character, InventoryState, InteractResponse, QuetePersonnage, AdvanceQuestResponse } from '../../types';
import '../../styles/index.css';

const CELL_SIZE = 40;

// Build world grid layout from directional links using BFS
function buildWorldGrid(maps: GameMap[]): { grid: Map<string, GameMap>; minX: number; minY: number; maxX: number; maxY: number } {
  const grid = new Map<string, GameMap>();
  if (maps.length === 0) return { grid, minX: 0, minY: 0, maxX: 0, maxY: 0 };

  const mapById = new Map(maps.map(m => [m.id, m]));
  const posById = new Map<number, { x: number; y: number }>();
  const visited = new Set<number>();

  // BFS from first map
  const queue: Array<{ id: number; x: number; y: number }> = [{ id: maps[0].id, x: 0, y: 0 }];
  visited.add(maps[0].id);
  posById.set(maps[0].id, { x: 0, y: 0 });

  while (queue.length > 0) {
    const { id, x, y } = queue.shift()!;
    const map = mapById.get(id);
    if (!map) continue;
    grid.set(`${x},${y}`, map);

    const neighbors: Array<{ neighborId: number | null; dx: number; dy: number }> = [
      { neighborId: map.nordMapId, dx: 0, dy: -1 },
      { neighborId: map.sudMapId, dx: 0, dy: 1 },
      { neighborId: map.estMapId, dx: 1, dy: 0 },
      { neighborId: map.ouestMapId, dx: -1, dy: 0 },
    ];

    for (const { neighborId, dx, dy } of neighbors) {
      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId);
        const nx = x + dx;
        const ny = y + dy;
        posById.set(neighborId, { x: nx, y: ny });
        queue.push({ id: neighborId, x: nx, y: ny });
      }
    }
  }

  // Handle disconnected maps (no directional links)
  let nextY = 100;
  for (const map of maps) {
    if (!visited.has(map.id)) {
      grid.set(`${0},${nextY}`, map);
      posById.set(map.id, { x: 0, y: nextY });
      nextY++;
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const key of grid.keys()) {
    const [x, y] = key.split(',').map(Number);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { grid, minX, minY, maxX, maxY };
}

const TYPE_COLORS: Record<string, string> = {
  WILDERNESS: '#2e7d32',
  VILLE: '#5c6bc0',
  DONJON: '#8e24aa',
  BOSS: '#c62828',
  SAFE: '#00838f',
};

const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const groupIdParam = searchParams.get('groupId');
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [mapData, setMapData] = useState<GameMap | null>(null);
  const [mapCases, setMapCases] = useState<MapCase[]>([]);
  const [allMaps, setAllMaps] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [enterMapId, setEnterMapId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);

  // Dungeon portal modal state
  const [dungeonModal, setDungeonModal] = useState<{
    connection: MapConnection;
  } | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(4);

  // Network portal modal state
  const [portalModal, setPortalModal] = useState<{ connection: MapConnection } | null>(null);
  const [allPortals, setAllPortals] = useState<MapConnection[]>([]);

  // PNJ state
  const [mapPNJs, setMapPNJs] = useState<PNJ[]>([]);
  const [merchantModal, setMerchantModal] = useState<PNJ | null>(null);
  const [merchantTab, setMerchantTab] = useState<'buy' | 'sell'>('buy');
  const [merchantPersonnageId, setMerchantPersonnageId] = useState<number | null>(null);
  const [merchantFeedback, setMerchantFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [merchantChars, setMerchantChars] = useState<Character[]>([]);
  const [merchantInventory, setMerchantInventory] = useState<InventoryState | null>(null);

  // Dialogue modal (quêtes PNJ)
  const [dialogueModal, setDialogueModal] = useState<{ pnj: PNJ; interactData: InteractResponse; personnageId: number; chars: Character[] } | null>(null);
  const [dialogueFeedback, setDialogueFeedback] = useState<string | null>(null);
  const [dialogueRecompenses, setDialogueRecompenses] = useState<AdvanceQuestResponse['recompenses'] | null>(null);

  // Enemy group modal state (click on enemy cell → confirm before engaging)
  const [enemyModal, setEnemyModal] = useState<{ group: GroupeEnnemi } | null>(null);

  const loadGroup = useCallback(async (gId: number) => {
    const g = await groupsApi.getById(gId);
    setGroup(g);
    if (g.mapId) {
      const [map, grid, pnjs] = await Promise.all([
        mapsApi.getById(g.mapId),
        mapsApi.getGrid(g.mapId),
        pnjApi.getByMap(g.mapId),
      ]);
      setMapData(map);
      setMapCases(grid.cases ?? []);
      setMapPNJs(pnjs);
    } else {
      setMapData(null);
      setMapCases([]);
      setMapPNJs([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [maps, portals] = await Promise.all([
        mapsApi.getAll(),
        mapsApi.getAllPortals(),
      ]);
      setAllMaps(maps);
      setAllPortals(portals);
      if (groupIdParam) {
        await loadGroup(Number(groupIdParam));
      }
      setLoading(false);
    };
    init();
  }, [groupIdParam, loadGroup]);

  // Build world grid for mini-map
  const worldGrid = useMemo(() => buildWorldGrid(allMaps), [allMaps]);

  // Build connection position lookup
  const connectionAt = useMemo(() => {
    const map = new Map<string, MapConnection>();
    if (mapData?.connectionsFrom) {
      for (const conn of mapData.connectionsFrom) {
        map.set(`${conn.positionX},${conn.positionY}`, conn);
      }
    }
    return map;
  }, [mapData]);

  // Lookup O(1) pour les cases bloquées (obstacles + zones exclues)
  const blockedAt = useMemo(() => {
    const set = new Set<string>();
    for (const c of mapCases) {
      if (c.bloqueDeplacement || c.estExclue) set.add(`${c.x},${c.y}`);
    }
    return set;
  }, [mapCases]);

  // Lookup O(1) pour les cases qui bloquent aussi la ligne de vue
  const losBlockedAt = useMemo(() => {
    const set = new Set<string>();
    for (const c of mapCases) {
      if (c.bloqueLigneDeVue || c.estExclue) set.add(`${c.x},${c.y}`);
    }
    return set;
  }, [mapCases]);

  // PNJ lookup by position
  const pnjAt = useMemo(() => {
    const map = new Map<string, PNJ>();
    for (const p of mapPNJs) {
      map.set(`${p.positionX},${p.positionY}`, p);
    }
    return map;
  }, [mapPNJs]);

  const handleCellClick = async (x: number, y: number) => {
    if (!group || !mapData || moving) return;

    // Check if clicking on a connection
    const conn = connectionAt.get(`${x},${y}`);
    if (conn && x === group.positionX && y === group.positionY) {
      // Player is on the connection cell - use it
      if (conn.donjonId && conn.donjon) {
        // Dungeon portal: show difficulty modal
        setDungeonModal({ connection: conn });
        return;
      }
      // Network portal: show destination selection modal
      setPortalModal({ connection: conn });
      return;
    }

    // Edge clicks for map transitions
    const isNord = y === 0 && mapData.nordMapId;
    const isSud = y === mapData.hauteur - 1 && mapData.sudMapId;
    const isOuest = x === 0 && mapData.ouestMapId;
    const isEst = x === mapData.largeur - 1 && mapData.estMapId;

    if (isNord || isSud || isOuest || isEst) {
      let dir: Direction;
      if (isNord) dir = 'NORD';
      else if (isSud) dir = 'SUD';
      else if (isOuest) dir = 'OUEST';
      else dir = 'EST';

      setMoving(true);
      try {
        const result = await groupsApi.moveDirection(group.id, dir);
        if (result.combat) {
          navigate(`/game/combat/${result.combat.id}`);
          return;
        }
        await loadGroup(group.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message :
          (err as any)?.response?.data?.error || 'Erreur';
        alert(msg);
      }
      setMoving(false);
      return;
    }

    // Normal move
    if (x === group.positionX && y === group.positionY) return;

    setMoving(true);
    try {
      const result = await groupsApi.move(group.id, x, y);
      if (result.combat) {
        navigate(`/game/combat/${result.combat.id}`);
        return;
      }
      await loadGroup(group.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :
        (err as any)?.response?.data?.error || 'Erreur';
      alert(msg);
    }
    setMoving(false);
  };

  const handleEnterDungeon = async () => {
    if (!group || !dungeonModal) return;
    setMoving(true);
    setDungeonModal(null);
    try {
      await groupsApi.useConnection(group.id, dungeonModal.connection.id, selectedDifficulty);
      // Dungeon entered - reload group (now on dungeon room map)
      await loadGroup(group.id);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
    setMoving(false);
  };

  const handleEnterMap = async () => {
    if (!group || !enterMapId) return;
    setMoving(true);
    try {
      const result = await groupsApi.enterMap(group.id, enterMapId);
      if (result.combat) {
        navigate(`/game/combat/${result.combat.id}`);
        return;
      }
      await loadGroup(group.id);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
    setMoving(false);
  };

  const handleLeaveMap = async () => {
    if (!group) return;
    try {
      await groupsApi.leaveMap(group.id);
      await loadGroup(group.id);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
  };

  const handleEngage = async (groupeEnnemiId: number) => {
    if (!group || !mapData) return;
    try {
      const result = await mapsApi.engage(mapData.id, {
        groupeId: group.id,
        groupeEnnemiId,
      });
      navigate(`/game/combat/${result.id}`);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
      alert(msg);
    }
  };

  const handleSpawnEnemies = async () => {
    if (!mapData || !group) return;
    await mapsApi.spawnEnemies(mapData.id);
    await loadGroup(group.id);
  };

  if (loading) return <div className="loading">Chargement...</div>;

  if (!group) {
    return (
      <div>
        <div className="page-header">
          <h1>Aventure</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/game/dashboard')}>Retour au camp</button>
        </div>
        <p className="meta">Aucun groupe selectionne. Retournez au dashboard et choisissez un groupe.</p>
      </div>
    );
  }

  // Group not on a map - show map selector
  if (!mapData) {
    return (
      <div>
        <div className="page-header">
          <h1>Aventure - {group.nom}</h1>
          <button className="btn btn-secondary" onClick={() => navigate('/game/dashboard')}>Retour au camp</button>
        </div>
        <div style={{ marginTop: 24 }}>
          <p>Le groupe n'est sur aucune map. Choisissez une map pour commencer :</p>
          <div className="inline-form" style={{ marginTop: 12 }}>
            <select
              value={enterMapId ?? ''}
              onChange={e => setEnterMapId(e.target.value ? Number(e.target.value) : null)}
              style={{ minWidth: 200 }}
            >
              <option value="">-- Choisir une map --</option>
              {allMaps.filter(m => m.type !== 'DONJON' && m.type !== 'BOSS').map(m => (
                <option key={m.id} value={m.id}>{m.nom} ({m.type})</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={handleEnterMap} disabled={!enterMapId || moving}>
              Entrer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build entity positions for the grid
  const enemies = (mapData.groupesEnnemis || []).filter(ge => !ge.vaincu);

  const getCellType = (x: number, y: number) => {
    if (x === group.positionX && y === group.positionY) return 'player';
    for (const ge of enemies) {
      if (ge.positionX === x && ge.positionY === y) return 'enemy';
    }
    if (connectionAt.has(`${x},${y}`)) return 'connection';
    if (pnjAt.has(`${x},${y}`)) return 'npc';
    return 'empty';
  };

  const getEnemyAt = (x: number, y: number) =>
    enemies.find(ge => ge.positionX === x && ge.positionY === y);

  const isEdge = (x: number, y: number) => {
    if (y === 0 && mapData.nordMapId) return 'NORD';
    if (y === mapData.hauteur - 1 && mapData.sudMapId) return 'SUD';
    if (x === 0 && mapData.ouestMapId) return 'OUEST';
    if (x === mapData.largeur - 1 && mapData.estMapId) return 'EST';
    return null;
  };

  // Check if player is on a connection
  const playerOnConnection = connectionAt.get(`${group.positionX},${group.positionY}`);

  // Check if player is on an NPC
  const playerOnNPC = pnjAt.get(`${group.positionX},${group.positionY}`);

  // Mini-map rendering
  const { grid: worldMap, minX, minY, maxX, maxY } = worldGrid;
  const worldW = maxX - minX + 1;
  const worldH = maxY - minY + 1;

  return (
    <div className="adventure-layout">
      <div className="adventure-main">
        <div className="page-header">
          <h1>{mapData.nom}</h1>
          <div>
            <button className="btn btn-secondary" onClick={handleLeaveMap} style={{ marginRight: 8 }}>
              Quitter la map
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/game/dashboard')}>
              Retour au camp
            </button>
          </div>
        </div>

        {/* Connection prompt when player is on a portal */}
        {playerOnConnection && (
          <div className="adventure-connection-prompt" style={{
            padding: '8px 16px',
            marginBottom: 8,
            background: playerOnConnection.donjonId ? 'var(--accent-purple, #8e24aa)' : 'var(--accent, #1976d2)',
            color: 'white',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>
              {playerOnConnection.donjonId ? '\u2694\ufe0f' : '\u{1F6AA}'}{' '}
              <strong>{playerOnConnection.nom}</strong>
              {playerOnConnection.donjon && (
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
                  (Niv. {playerOnConnection.donjon.niveauMin}-{playerOnConnection.donjon.niveauMax})
                </span>
              )}
            </span>
            <button
              className="btn btn-sm"
              style={{ background: 'white', color: playerOnConnection.donjonId ? '#8e24aa' : '#1976d2' }}
              onClick={() => {
                if (playerOnConnection.donjonId && playerOnConnection.donjon) {
                  setDungeonModal({ connection: playerOnConnection });
                } else {
                  setPortalModal({ connection: playerOnConnection });
                }
              }}
            >
              {playerOnConnection.donjonId ? 'Entrer dans le donjon' : 'Utiliser le portail'}
            </button>
          </div>
        )}

        {/* NPC prompt when player is on an NPC cell */}
        {playerOnNPC && (
          <div style={{
            padding: '8px 16px', marginBottom: 8, borderRadius: 8,
            background: '#388e3c', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>💬 <strong>{playerOnNPC.nom}</strong></span>
            <button
              className="btn btn-sm"
              style={{ background: 'white', color: '#388e3c' }}
              onClick={async () => {
                const chars = (group?.personnages ?? []).map((gp: any) => gp.personnage).filter(Boolean) as Character[];
                const firstCharId = chars[0]?.id ?? null;
                if (!firstCharId) return;
                try {
                  const interactData = await queteApi.interact(playerOnNPC.id, firstCharId);
                  setDialogueFeedback(null);
                  setDialogueRecompenses(null);
                  setDialogueModal({ pnj: playerOnNPC, interactData, personnageId: firstCharId, chars });
                } catch {
                  // Fallback: open merchant modal directly
                  const full = await pnjApi.getById(playerOnNPC.id);
                  setMerchantModal(full);
                  setMerchantTab('buy');
                  setMerchantFeedback({});
                  setMerchantInventory(null);
                  const g = await groupsApi.getById(group.id);
                  const chars2 = g.personnages?.map((gp: any) => gp.personnage).filter(Boolean) ?? [];
                  setMerchantChars(chars2);
                  if (chars2.length > 0) {
                    setMerchantPersonnageId(chars2[0].id);
                    const inv = await charactersApi.getInventory(chars2[0].id);
                    setMerchantInventory(inv);
                  }
                }
              }}
            >
              Parler à {playerOnNPC.nom}
            </button>
          </div>
        )}

        {/* Visual grid */}
        <div className="adventure-grid-container">
          <div
            className="adventure-grid"
            style={{
              gridTemplateColumns: `repeat(${mapData.largeur}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${mapData.hauteur}, ${CELL_SIZE}px)`,
            }}
          >
            {Array.from({ length: mapData.hauteur }, (_, y) =>
              Array.from({ length: mapData.largeur }, (_, x) => {
                const cellType = getCellType(x, y);
                const edge = isEdge(x, y);
                const enemy = cellType === 'enemy' ? getEnemyAt(x, y) : null;
                const conn = connectionAt.get(`${x},${y}`);
                const npc = pnjAt.get(`${x},${y}`);
                const isPlayerHere = x === group.positionX && y === group.positionY;

                const isBlocked = blockedAt.has(`${x},${y}`);
                const isLosBlocked = losBlockedAt.has(`${x},${y}`);
                let className = 'adventure-cell';
                if (isBlocked) className += isLosBlocked ? ' cell-obstacle-los' : ' cell-obstacle';
                if (isPlayerHere) className += ' cell-player';
                else if (cellType === 'enemy') className += ' cell-enemy';
                else if (cellType === 'connection') className += ' cell-connection';
                else if (cellType === 'npc') className += ' cell-npc';
                if (edge) className += ' cell-edge';

                return (
                  <div
                    key={`${x}-${y}`}
                    className={className}
                    onClick={() => {
                      if (cellType === 'enemy' && enemy) {
                        setEnemyModal({ group: enemy });
                      } else {
                        handleCellClick(x, y);
                      }
                    }}
                    title={
                      isPlayerHere
                        ? (conn ? `${group.nom} - ${conn.nom}` : group.nom)
                        : cellType === 'enemy' && enemy
                          ? `Ennemis (${enemy.membres?.map(m => `${m.monstre?.nom} Niv.${m.niveau}`).join(', ')})`
                          : conn
                            ? `${conn.nom}${conn.donjon ? ` [Donjon: ${conn.donjon.nom}]` : ''}`
                            : edge
                              ? `Aller ${edge}`
                              : `(${x}, ${y})`
                    }
                    style={cellType === 'connection' && !isPlayerHere ? {
                      background: conn?.donjonId ? '#ce93d8' : '#90caf9',
                    } : cellType === 'npc' && !isPlayerHere ? {
                      background: '#a5d6a7',
                    } : undefined}
                  >
                    {isPlayerHere && <span className="cell-icon">P</span>}
                    {cellType === 'enemy' && <span className="cell-icon">E</span>}
                    {cellType === 'connection' && !isPlayerHere && (
                      <span className="cell-icon" style={{ fontSize: 16 }}>
                        {conn?.donjonId ? '\u2694' : '\u{1F6AA}'}
                      </span>
                    )}
                    {cellType === 'npc' && !isPlayerHere && (
                      <span className="cell-icon" style={{ fontSize: 14 }} title={npc?.nom}>💬</span>
                    )}
                    {cellType === 'empty' && edge && <span className="cell-edge-arrow">
                      {edge === 'NORD' ? '\u2191' : edge === 'SUD' ? '\u2193' : edge === 'OUEST' ? '\u2190' : '\u2192'}
                    </span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="adventure-sidebar">
        {/* Group members */}
        {group.personnages && group.personnages.length > 0 && (
          <>
            <h3>Groupe — {group.nom}</h3>
            <div className="adventure-group-members">
              {group.personnages.map(({ personnage: p }) => (
                <button
                  key={p.id}
                  className="adventure-member-card"
                  onClick={() => navigate(
                    `/game/characters?playerId=${group.joueurId}&groupId=${groupIdParam}&charId=${p.id}`
                  )}
                  title={`Voir la fiche de ${p.nom}`}
                >
                  <div className="adventure-member-portrait">
                    {p.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="adventure-member-info">
                    <div className="adventure-member-name">{p.nom}</div>
                    <div className="adventure-member-meta">Niv. {p.niveau} · {p.race?.nom}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <h3 style={{ marginTop: group.personnages?.length ? 16 : 0 }}>Informations</h3>
        <div className="adventure-info">
          <div><strong>Map :</strong> {mapData.nom}</div>
          <div><strong>Type :</strong> {mapData.type}</div>
          <div><strong>Mode :</strong> {mapData.combatMode}</div>
          <div><strong>Region :</strong> {mapData.region?.nom}</div>
          <div><strong>Taille :</strong> {mapData.largeur}x{mapData.hauteur}</div>
          <div><strong>Position :</strong> ({group.positionX}, {group.positionY})</div>
        </div>

        {/* World map button */}
        <button className="btn btn-info" style={{ marginTop: 16, width: '100%' }}
          onClick={() => setShowWorldMap(true)}>
          Carte du monde
        </button>

        {/* Connections list */}
        {mapData.connectionsFrom && mapData.connectionsFrom.length > 0 && (
          <>
            <h4 style={{ marginTop: 16 }}>Portails ({mapData.connectionsFrom.length})</h4>
            <div className="adventure-enemies">
              {mapData.connectionsFrom.map(conn => (
                <div key={conn.id} className="adventure-enemy-card" style={{
                  borderLeft: conn.donjonId ? '3px solid #8e24aa' : '3px solid #1976d2',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {conn.donjonId ? '\u2694\ufe0f' : '\u{1F6AA}'} {conn.nom}
                  </div>
                  <div className="meta">Pos: ({conn.positionX}, {conn.positionY})</div>
                  {conn.donjon && (
                    <div style={{ fontSize: 11, color: '#8e24aa' }}>
                      Donjon: {conn.donjon.nom} (Niv.{conn.donjon.niveauMin}-{conn.donjon.niveauMax})
                    </div>
                  )}
                  {conn.toMap && !conn.donjonId && (
                    <div style={{ fontSize: 11, color: '#666' }}>
                      Vers: {conn.toMap.nom}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Enemies list */}
        {enemies.length > 0 && (
          <>
            <h4 style={{ marginTop: 16 }}>Ennemis ({enemies.length})</h4>
            <div className="adventure-enemies">
              {enemies.map(ge => (
                <div key={ge.id} className="adventure-enemy-card">
                  <div className="meta">Pos: ({ge.positionX}, {ge.positionY})</div>
                  <div style={{ fontSize: 12 }}>
                    {ge.membres?.map(m => `${m.monstre?.nom} x${m.quantite} Niv.${m.niveau}`).join(', ')}
                  </div>
                  <button className="btn btn-sm btn-danger" style={{ marginTop: 4 }}
                    onClick={() => setEnemyModal({ group: ge })}>Engager</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Spawn button */}
        {mapData.combatMode === 'MANUEL' && (
          <button className="btn btn-sm btn-secondary" style={{ marginTop: 16, width: '100%' }}
            onClick={handleSpawnEnemies}>
            Spawn ennemis
          </button>
        )}

        {/* Legend */}
        <h4 style={{ marginTop: 16 }}>Legende</h4>
        <div className="adventure-legend">
          <div><span className="legend-icon legend-player">P</span> Votre groupe</div>
          <div><span className="legend-icon legend-enemy">E</span> Ennemis</div>
          <div><span className="legend-icon legend-edge">&rarr;</span> Sortie de map</div>
          <div><span className="legend-icon" style={{ background: '#90caf9', border: '1px solid #1976d2' }}>{'\u{1F6AA}'}</span> Portail</div>
          <div><span className="legend-icon" style={{ background: '#ce93d8', border: '1px solid #8e24aa' }}>{'\u2694'}</span> Donjon</div>
        </div>
      </div>

      {/* World map modal */}
      {showWorldMap && (
        <div className="modal-overlay" onClick={() => setShowWorldMap(false)}>
          <div className="worldmap-modal" onClick={e => e.stopPropagation()}>
            <div className="worldmap-header">
              <h2>Carte du monde</h2>
              <button className="btn btn-secondary" onClick={() => setShowWorldMap(false)}>Fermer</button>
            </div>
            <div className="worldmap-legend">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <span key={type} className="worldmap-legend-item">
                  <span className="worldmap-legend-dot" style={{ background: color }} />
                  {type}
                </span>
              ))}
            </div>
            <div className="worldmap-content">
              <div
                className="minimap-grid"
                style={{
                  gridTemplateColumns: `repeat(${worldW}, 1fr)`,
                  gridTemplateRows: `repeat(${worldH}, 1fr)`,
                }}
              >
                {Array.from({ length: worldH }, (_, gy) =>
                  Array.from({ length: worldW }, (_, gx) => {
                    const wx = gx + minX;
                    const wy = gy + minY;
                    const wMap = worldMap.get(`${wx},${wy}`);
                    const isCurrent = wMap?.id === mapData.id;

                    if (!wMap) {
                      return <div key={`${gx}-${gy}`} className="worldmap-cell worldmap-cell-empty" />;
                    }

                    return (
                      <div
                        key={`${gx}-${gy}`}
                        className={`worldmap-cell ${isCurrent ? 'worldmap-cell-current' : ''}`}
                        style={{ borderColor: TYPE_COLORS[wMap.type] || 'var(--border)' }}
                      >
                        <div className="worldmap-cell-name">{wMap.nom}</div>
                        <div className="worldmap-cell-type" style={{ color: TYPE_COLORS[wMap.type] }}>{wMap.type}</div>
                        {wMap.region && <div className="worldmap-cell-region">{wMap.region.nom}</div>}
                        <div className="worldmap-cell-size">{wMap.largeur}x{wMap.hauteur}</div>
                        {isCurrent && <div className="worldmap-cell-marker">Vous etes ici</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enemy group modal */}
      {enemyModal && (
        <div className="modal-overlay" onClick={() => setEnemyModal(null)}>
          <div className="worldmap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="worldmap-header">
              <h2>Groupe ennemi</h2>
              <button className="btn btn-secondary" onClick={() => setEnemyModal(null)}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {enemyModal.group.membres?.map(m => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <strong>{m.monstre?.nom ?? `Monstre ${m.monstreId}`}</strong>
                  {' '}×{m.quantite}
                  <span className="meta"> Niv. {m.niveau}</span>
                </div>
              ))}
              <button
                className="btn btn-danger"
                style={{ marginTop: 16, width: '100%' }}
                onClick={() => { setEnemyModal(null); handleEngage(enemyModal.group.id); }}
              >
                Attaquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dungeon entry modal */}
      {dungeonModal && (
        <div className="modal-overlay" onClick={() => setDungeonModal(null)}>
          <div className="worldmap-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="worldmap-header">
              <h2>{dungeonModal.connection.donjon?.nom || 'Donjon'}</h2>
              <button className="btn btn-secondary" onClick={() => setDungeonModal(null)}>Fermer</button>
            </div>
            <div style={{ padding: 20 }}>
              {dungeonModal.connection.donjon?.description && (
                <p style={{ marginBottom: 16, color: '#ccc', fontSize: 14 }}>
                  {dungeonModal.connection.donjon.description}
                </p>
              )}
              <div style={{ marginBottom: 16 }}>
                <strong>Niveau :</strong> {dungeonModal.connection.donjon?.niveauMin} - {dungeonModal.connection.donjon?.niveauMax}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Difficulte (nombre d'ennemis par salle) :
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[4, 6, 8].map(d => (
                    <button
                      key={d}
                      className={`btn ${selectedDifficulty === d ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, fontSize: 16 }}
                      onClick={() => setSelectedDifficulty(d)}
                    >
                      {d} {d === 4 ? '(Facile)' : d === 6 ? '(Normal)' : '(Difficile)'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8, padding: '10px 0', fontSize: 15 }}
                onClick={handleEnterDungeon}
                disabled={moving}
              >
                Entrer dans le donjon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue modal (quêtes PNJ) */}
      {dialogueModal && (
        <div className="modal-overlay" onClick={() => setDialogueModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>💬 {dialogueModal.pnj.nom}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setDialogueModal(null)}>Fermer</button>
            </div>

            {/* Character selector */}
            {dialogueModal.chars.length > 0 && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 13 }}>Personnage :</label>
                <select
                  value={dialogueModal.personnageId}
                  onChange={async (e) => {
                    const id = Number(e.target.value);
                    setDialogueFeedback(null);
                    setDialogueRecompenses(null);
                    const updated = await queteApi.interact(dialogueModal.pnj.id, id);
                    setDialogueModal(prev => prev ? { ...prev, personnageId: id, interactData: updated } : null);
                  }}
                  style={{ flex: 1 }}
                >
                  {dialogueModal.chars.map(c => (
                    <option key={c.id} value={c.id}>{c.nom} — Niv. {c.niveau}</option>
                  ))}
                </select>
              </div>
            )}

            {dialogueFeedback && (
              <div style={{ padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#1b5e20', color: 'white' }}>
                {dialogueFeedback}
              </div>
            )}

            {dialogueRecompenses && (
              <div style={{ padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#1a237e', color: 'white' }}>
                <strong>Récompenses :</strong>
                {dialogueRecompenses.xp > 0 && <div>{dialogueRecompenses.xp} XP</div>}
                {dialogueRecompenses.or > 0 && <div>{dialogueRecompenses.or} or</div>}
                {dialogueRecompenses.ressources.map((r, i) => <div key={i}>{r.quantite}x {r.nom}</div>)}
                {dialogueRecompenses.items.map((it, i) => <div key={i}>Équip: {it.nom}</div>)}
              </div>
            )}

            {/* Nouvelles quêtes disponibles */}
            {dialogueModal.interactData.quetesDisponibles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--text-muted)' }}>NOUVELLES QUÊTES</h4>
                {dialogueModal.interactData.quetesDisponibles.map(q => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 6 }}>
                    <div>
                      <strong>{q.nom}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.description}</div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        try {
                          await queteApi.acceptQuest(dialogueModal.pnj.id, dialogueModal.personnageId, q.id);
                          setDialogueFeedback(`Quête "${q.nom}" acceptée !`);
                          const updated = await queteApi.interact(dialogueModal.pnj.id, dialogueModal.personnageId);
                          setDialogueModal(prev => prev ? { ...prev, interactData: updated } : null);
                        } catch (e: any) {
                          setDialogueFeedback(e?.response?.data?.error || 'Erreur');
                        }
                      }}
                    >
                      Accepter
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Étapes en attente */}
            {dialogueModal.interactData.etapesEnAttente.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--text-muted)' }}>OBJECTIFS EN ATTENTE</h4>
                {dialogueModal.interactData.etapesEnAttente.map((qp: QuetePersonnage) => {
                  const etape = qp.quete.etapes.find(e => e.ordre === qp.etapeActuelle);
                  return (
                    <div key={qp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 6 }}>
                      <div>
                        <strong>{qp.quete.nom}</strong>
                        <div style={{ fontSize: 12 }}>Étape {qp.etapeActuelle}/{qp.quete.etapes.length} : {etape?.description}</div>
                        {etape?.type === 'APPORTER_RESSOURCE' && etape.ressource && (
                          <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 2 }}>
                            Requis : {etape.quantite ?? 1}× {etape.ressource.nom}
                          </div>
                        )}
                        {etape?.type === 'APPORTER_EQUIPEMENT' && etape.equipement && (
                          <div style={{ fontSize: 12, color: '#66bb6a', marginTop: 2 }}>
                            Requis : {etape.quantite ?? 1}× {etape.equipement.nom}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginLeft: 8, flexShrink: 0 }}
                        onClick={async () => {
                          try {
                            const result = await queteApi.advanceQuest(dialogueModal.pnj.id, dialogueModal.personnageId, qp.id);
                            if (result.questComplete) {
                              setDialogueFeedback(`Quête "${qp.quete.nom}" terminée !`);
                              setDialogueRecompenses(result.recompenses ?? null);
                            } else {
                              setDialogueFeedback('Étape accomplie !');
                            }
                            const updated = await queteApi.interact(dialogueModal.pnj.id, dialogueModal.personnageId);
                            setDialogueModal(prev => prev ? { ...prev, interactData: updated } : null);
                          } catch (e: any) {
                            setDialogueFeedback(e?.response?.data?.error || 'Erreur');
                          }
                        }}
                      >
                        {(etape?.type === 'APPORTER_RESSOURCE' || etape?.type === 'APPORTER_EQUIPEMENT') ? 'Remettre' : 'Continuer'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {dialogueModal.interactData.quetesDisponibles.length === 0 && dialogueModal.interactData.etapesEnAttente.length === 0 && !dialogueFeedback && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>Pas de quête disponible pour l'instant.</p>
            )}

            {/* Bouton boutique si marchand */}
            {dialogueModal.interactData.estMarchand && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={async () => {
                    const full = await pnjApi.getById(dialogueModal.pnj.id);
                    setMerchantModal(full);
                    setMerchantTab('buy');
                    setMerchantFeedback({});
                    setMerchantInventory(null);
                    const g = await groupsApi.getById(group.id);
                    const chars = g.personnages?.map((gp: any) => gp.personnage).filter(Boolean) ?? [];
                    setMerchantChars(chars);
                    if (chars.length > 0) {
                      setMerchantPersonnageId(chars[0].id);
                      const inv = await charactersApi.getInventory(chars[0].id);
                      setMerchantInventory(inv);
                    }
                    setDialogueModal(null);
                  }}
                >
                  Ouvrir la boutique
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Merchant modal */}
      {merchantModal && (
        <div className="modal-overlay" onClick={() => setMerchantModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>💬 {merchantModal.nom}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setMerchantModal(null)}>Fermer</button>
            </div>

            {/* Character selector */}
            {merchantChars.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Personnage :</label>
                <select
                  value={merchantPersonnageId ?? ''}
                  onChange={async (e) => {
                    const id = Number(e.target.value);
                    setMerchantPersonnageId(id);
                    setMerchantFeedback({});
                    setMerchantInventory(null);
                    const inv = await charactersApi.getInventory(id);
                    setMerchantInventory(inv);
                  }}
                  style={{ flex: 1 }}
                >
                  {merchantChars.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                {merchantInventory && (
                  <span style={{ color: '#ffd700', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    💰 {merchantInventory.or} or
                  </span>
                )}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <button
                className={`btn btn-sm ${merchantTab === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setMerchantTab('buy'); setMerchantFeedback({}); }}
              >
                Acheter
              </button>
              <button
                className={`btn btn-sm ${merchantTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setMerchantTab('sell'); setMerchantFeedback({}); }}
              >
                Vendre
              </button>
            </div>

            {/* Tab content */}
            <div style={{ overflow: 'auto', flex: 1 }}>
              {merchantTab === 'buy' ? (
                <div>
                  {merchantModal.lignes.filter(l => l.prixMarchand != null).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                      Ce marchand n'a rien à vendre.
                    </p>
                  ) : (
                    merchantModal.lignes.filter(l => l.prixMarchand != null).map(l => {
                      const name = l.equipement?.nom ?? l.ressource?.nom ?? `Article #${l.id}`;
                      const fb = merchantFeedback[String(l.id)];
                      return (
                        <div key={l.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', marginBottom: 6, background: 'var(--surface-2, #2a2a2a)',
                          borderRadius: 6, gap: 8,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                            {l.equipement && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.equipement.slot}</div>}
                            {fb && (
                              <div style={{ fontSize: 12, color: fb.ok ? '#66bb6a' : '#ef5350', marginTop: 2 }}>{fb.msg}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ color: '#ffd700', fontWeight: 600 }}>{l.prixMarchand} or</span>
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={!merchantPersonnageId}
                              onClick={async () => {
                                if (!merchantPersonnageId) return;
                                try {
                                  await pnjApi.buy(merchantModal.id, { personnageId: merchantPersonnageId, ligneId: l.id });
                                  setMerchantFeedback(prev => ({ ...prev, [String(l.id)]: { ok: true, msg: 'Acheté !' } }));
                                  const inv = await charactersApi.getInventory(merchantPersonnageId);
                                  setMerchantInventory(inv);
                                } catch (err: unknown) {
                                  const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
                                  setMerchantFeedback(prev => ({ ...prev, [String(l.id)]: { ok: false, msg } }));
                                }
                              }}
                            >
                              Acheter
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div>
                  {!merchantInventory ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Chargement de l'inventaire...</p>
                  ) : (() => {
                    const rachatLines = merchantModal.lignes.filter(l => l.prixRachat != null);
                    const sellableItems = merchantInventory.items.filter(item =>
                      !item.estEquipe && rachatLines.some(l => l.equipementId === item.equipementId)
                    );
                    const sellableResources = merchantInventory.ressources.filter(res =>
                      rachatLines.some(l => l.ressourceId === res.ressourceId)
                    );

                    if (sellableItems.length === 0 && sellableResources.length === 0) {
                      return (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                          Ce marchand n'achète rien de ce que vous possédez.
                        </p>
                      );
                    }

                    return (
                      <>
                        {sellableItems.map(item => {
                          const ligne = rachatLines.find(l => l.equipementId === item.equipementId)!;
                          const fb = merchantFeedback[`item_${item.id}`];
                          return (
                            <div key={item.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', marginBottom: 6, background: 'var(--surface-2, #2a2a2a)',
                              borderRadius: 6, gap: 8,
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.nom}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.slot}</div>
                                {fb && (
                                  <div style={{ fontSize: 12, color: fb.ok ? '#66bb6a' : '#ef5350', marginTop: 2 }}>{fb.msg}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ color: '#ffd700', fontWeight: 600 }}>{ligne.prixRachat} or</span>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  disabled={!merchantPersonnageId}
                                  onClick={async () => {
                                    if (!merchantPersonnageId) return;
                                    try {
                                      await pnjApi.sell(merchantModal.id, { personnageId: merchantPersonnageId, ligneId: ligne.id, itemId: item.id });
                                      setMerchantFeedback(prev => ({ ...prev, [`item_${item.id}`]: { ok: true, msg: 'Vendu !' } }));
                                      const inv = await charactersApi.getInventory(merchantPersonnageId);
                                      setMerchantInventory(inv);
                                    } catch (err: unknown) {
                                      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
                                      setMerchantFeedback(prev => ({ ...prev, [`item_${item.id}`]: { ok: false, msg } }));
                                    }
                                  }}
                                >
                                  Vendre
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {sellableResources.map(res => {
                          const ligne = rachatLines.find(l => l.ressourceId === res.ressourceId)!;
                          const fb = merchantFeedback[`res_${res.ressourceId}`];
                          return (
                            <div key={res.ressourceId} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', marginBottom: 6, background: 'var(--surface-2, #2a2a2a)',
                              borderRadius: 6, gap: 8,
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{res.nom}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>×{res.quantite} en stock</div>
                                {fb && (
                                  <div style={{ fontSize: 12, color: fb.ok ? '#66bb6a' : '#ef5350', marginTop: 2 }}>{fb.msg}</div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ color: '#ffd700', fontWeight: 600 }}>{ligne.prixRachat} or / unité</span>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  disabled={!merchantPersonnageId}
                                  onClick={async () => {
                                    if (!merchantPersonnageId) return;
                                    try {
                                      await pnjApi.sell(merchantModal.id, { personnageId: merchantPersonnageId, ligneId: ligne.id });
                                      setMerchantFeedback(prev => ({ ...prev, [`res_${res.ressourceId}`]: { ok: true, msg: 'Vendu !' } }));
                                      const inv = await charactersApi.getInventory(merchantPersonnageId);
                                      setMerchantInventory(inv);
                                    } catch (err: unknown) {
                                      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
                                      setMerchantFeedback(prev => ({ ...prev, [`res_${res.ressourceId}`]: { ok: false, msg } }));
                                    }
                                  }}
                                >
                                  Vendre 1
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Portal network modal */}
      {portalModal && group && (
        <div className="modal-overlay" onClick={() => setPortalModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '70vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Choisir une destination</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setPortalModal(null)}>Fermer</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
              Portail : <strong>{portalModal.connection.nom}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allPortals
                .filter(p => p.id !== portalModal.connection.id)
                .map(dest => (
                  <button
                    key={dest.id}
                    className="btn btn-secondary"
                    style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    disabled={moving}
                    onClick={async () => {
                      setMoving(true);
                      try {
                        const result = await groupsApi.useConnection(group.id, portalModal.connection.id, undefined, dest.id);
                        setPortalModal(null);
                        if (result?.combat) {
                          navigate(`/game/combat/${result.combat.id}`);
                          return;
                        }
                        await loadGroup(group.id);
                      } catch (err: unknown) {
                        const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : 'Erreur');
                        alert(msg);
                      } finally {
                        setMoving(false);
                      }
                    }}
                  >
                    <span>
                      <strong>{dest.nom}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {dest.fromMap?.nom}
                      {dest.fromMap && (
                        <span style={{
                          marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 11,
                          background: dest.fromMap.type === 'VILLE' ? '#4caf50' : dest.fromMap.type === 'SAFE' ? '#2196f3' : '#9e9e9e',
                          color: 'white',
                        }}>{dest.fromMap.type}</span>
                      )}
                    </span>
                  </button>
                ))}
              {allPortals.filter(p => p.id !== portalModal.connection.id).length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Aucune autre destination disponible.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
