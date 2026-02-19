import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../../api/groups';
import { mapsApi } from '../../api/maps';
import type { Group, GameMap, Direction, MapConnection, GroupeEnnemi } from '../../types';
import '../../styles/index.css';

const CELL_SIZE = 40;
const MINIMAP_CELL = 48;

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

  // Enemy group modal state (click on enemy cell → confirm before engaging)
  const [enemyModal, setEnemyModal] = useState<{ group: GroupeEnnemi } | null>(null);

  const loadGroup = useCallback(async (gId: number) => {
    const g = await groupsApi.getById(gId);
    setGroup(g);
    if (g.mapId) {
      const map = await mapsApi.getById(g.mapId);
      setMapData(map);
    } else {
      setMapData(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const maps = await mapsApi.getAll();
      setAllMaps(maps);
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
      // Normal connection: use it directly
      setMoving(true);
      try {
        const result = await groupsApi.useConnection(group.id, conn.id);
        if (result?.combat) {
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
      const result = await groupsApi.useConnection(group.id, dungeonModal.connection.id, selectedDifficulty);
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
                  handleCellClick(group.positionX, group.positionY);
                }
              }}
            >
              {playerOnConnection.donjonId ? 'Entrer dans le donjon' : 'Utiliser le portail'}
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
                const isPlayerHere = x === group.positionX && y === group.positionY;

                let className = 'adventure-cell';
                if (isPlayerHere) className += ' cell-player';
                else if (cellType === 'enemy') className += ' cell-enemy';
                else if (cellType === 'connection') className += ' cell-connection';
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
                    } : undefined}
                  >
                    {isPlayerHere && <span className="cell-icon">P</span>}
                    {cellType === 'enemy' && <span className="cell-icon">E</span>}
                    {cellType === 'connection' && !isPlayerHere && (
                      <span className="cell-icon" style={{ fontSize: 16 }}>
                        {conn?.donjonId ? '\u2694' : '\u{1F6AA}'}
                      </span>
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
    </div>
  );
};

export default MapPage;
