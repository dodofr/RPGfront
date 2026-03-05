import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mapsApi } from '../../api/maps';
import type { MapConnection } from '../../types';

const GRID_WIDTH = 16;
const GRID_HEIGHT = 18;

type CellData =
  | { type: 'spawn-player'; ordre: number }
  | { type: 'spawn-enemy'; ordre: number }
  | { type: 'obstacle-pm' }
  | { type: 'obstacle-los' }
  | { type: 'excluded' };

type Tool = 'spawn-player' | 'spawn-enemy' | 'obstacle-pm' | 'obstacle-los' | 'excluded' | 'portal' | 'eraser';

type PortalData = { nom: string };

const GridEditorPage: React.FC = () => {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const [cells, setCells] = useState<Map<string, CellData>>(new Map());
  const [portals, setPortals] = useState<Map<string, PortalData>>(new Map());
  const [originalConnections, setOriginalConnections] = useState<MapConnection[]>([]);
  const [portalNom, setPortalNom] = useState('');
  const [tool, setTool] = useState<Tool>('spawn-player');
  const [painting, setPainting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mapId) return;
    setLoading(true);
    Promise.all([
      mapsApi.getGrid(Number(mapId)),
      mapsApi.getById(Number(mapId)),
    ]).then(([grid, mapInfo]) => {
      const initial = new Map<string, CellData>();
      if (grid.cases) {
        for (const c of grid.cases) {
          if (c.estExclue) {
            initial.set(`${c.x},${c.y}`, { type: 'excluded' });
          } else if (c.bloqueLigneDeVue) {
            initial.set(`${c.x},${c.y}`, { type: 'obstacle-los' });
          } else {
            initial.set(`${c.x},${c.y}`, { type: 'obstacle-pm' });
          }
        }
      }
      if (grid.spawns) {
        for (const s of grid.spawns) {
          initial.set(`${s.x},${s.y}`, {
            type: s.equipe === 0 ? 'spawn-player' : 'spawn-enemy',
            ordre: s.ordre,
          });
        }
      }
      setCells(initial);

      // Charger les portails existants (hors donjons)
      const nonDungeonConns = (mapInfo.connectionsFrom ?? []).filter(c => !c.donjonId);
      setOriginalConnections(nonDungeonConns);
      const initialPortals = new Map<string, PortalData>();
      for (const conn of nonDungeonConns) {
        initialPortals.set(`${conn.positionX},${conn.positionY}`, {
          nom: conn.nom,
        });
      }
      setPortals(initialPortals);

    }).catch(() => setError('Impossible de charger la grille'))
      .finally(() => setLoading(false));
  }, [mapId]);

  const countSpawns = useCallback((type: 'spawn-player' | 'spawn-enemy') => {
    let count = 0;
    for (const v of cells.values()) {
      if (v.type === type) count++;
    }
    return count;
  }, [cells]);

  const applyTool = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;

    if (tool === 'eraser') {
      // Supprimer des portails si présent
      setPortals(prev => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      // Supprimer des cases + renuméroter spawns
      setCells(prev => {
        const next = new Map(prev);
        const deleted = next.get(key);
        next.delete(key);
        if (deleted && (deleted.type === 'spawn-player' || deleted.type === 'spawn-enemy')) {
          const spawnType = deleted.type;
          const spawns: { key: string; data: CellData & { type: typeof spawnType; ordre: number } }[] = [];
          for (const [k, v] of next.entries()) {
            if (v.type === spawnType) spawns.push({ key: k, data: v as any });
          }
          spawns.sort((a, b) => a.data.ordre - b.data.ordre);
          spawns.forEach((s, i) => {
            next.set(s.key, { type: spawnType, ordre: i + 1 });
          });
        }
        return next;
      });
      return;
    }

    if (tool === 'portal') {
      if (!portalNom.trim()) return;
      setPortals(prev => {
        const next = new Map(prev);
        next.set(key, { nom: portalNom.trim() });
        return next;
      });
      return;
    }

    setCells(prev => {
      const next = new Map(prev);

      // Don't overwrite existing cell when dragging
      if (prev.has(key)) return prev;

      if (tool === 'spawn-player' || tool === 'spawn-enemy') {
        let count = 0;
        for (const v of prev.values()) {
          if (v.type === tool) count++;
        }
        if (count >= 8) return prev;
        next.set(key, { type: tool, ordre: count + 1 });
      } else if (tool === 'obstacle-pm') {
        next.set(key, { type: 'obstacle-pm' });
      } else if (tool === 'obstacle-los') {
        next.set(key, { type: 'obstacle-los' });
      } else if (tool === 'excluded') {
        next.set(key, { type: 'excluded' });
      }

      return next;
    });
  }, [tool, portalNom]);

  const handleMouseDown = (x: number, y: number) => {
    setPainting(true);
    applyTool(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (painting && tool !== 'portal') applyTool(x, y);
  };

  const handleMouseUp = () => setPainting(false);

  useEffect(() => {
    const up = () => setPainting(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const playerCount = countSpawns('spawn-player');
  const enemyCount = countSpawns('spawn-enemy');
  const canSave = playerCount === 8 && enemyCount === 8;

  const handleSave = async () => {
    if (!mapId || !canSave) return;
    setSaving(true);
    setError('');
    try {
      const obstacles: { x: number; y: number; bloqueDeplacement: boolean; bloqueLigneDeVue: boolean; estExclue: boolean }[] = [];
      const spawns: { x: number; y: number; equipe: number; ordre: number }[] = [];

      for (const [key, data] of cells.entries()) {
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr);
        const y = Number(yStr);

        if (data.type === 'obstacle-pm') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: false, estExclue: false });
        } else if (data.type === 'obstacle-los') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: true, estExclue: false });
        } else if (data.type === 'excluded') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: true, estExclue: true });
        } else if (data.type === 'spawn-player') {
          spawns.push({ x, y, equipe: 0, ordre: data.ordre });
        } else if (data.type === 'spawn-enemy') {
          spawns.push({ x, y, equipe: 1, ordre: data.ordre });
        }
      }

      await mapsApi.setCases(Number(mapId), obstacles);
      await mapsApi.setSpawns(Number(mapId), spawns);

      // Sauvegarder les portails : supprimer les anciennes connexions non-donjon, créer les nouvelles
      await Promise.all(originalConnections.map(conn => mapsApi.removeConnection(Number(mapId), conn.id)));
      await Promise.all([...portals.entries()].map(([key, data]) => {
        const [xStr, yStr] = key.split(',');
        return mapsApi.addConnection(Number(mapId), {
          toMapId: null,
          positionX: Number(xStr),
          positionY: Number(yStr),
          nom: data.nom,
        });
      }));

      navigate('/admin/monde');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getCellClass = (cell?: CellData) => {
    if (!cell) return '';
    switch (cell.type) {
      case 'spawn-player': return 'spawn-player';
      case 'spawn-enemy': return 'spawn-enemy';
      case 'obstacle-pm': return 'obstacle-cell';
      case 'obstacle-los': return 'obstacle-cell obstacle-los';
      case 'excluded': return 'excluded-cell';
      default: return '';
    }
  };

  const getCellLabel = (cell?: CellData) => {
    if (!cell) return '';
    if (cell.type === 'spawn-player' || cell.type === 'spawn-enemy') return String(cell.ordre);
    if (cell.type === 'obstacle-los') return 'LDV';
    return '';
  };

  if (loading) return <div className="admin-page"><p>Chargement...</p></div>;

  const tools: { key: Tool; label: string; info?: string }[] = [
    { key: 'spawn-player', label: 'Spawn Joueur', info: `${playerCount}/8` },
    { key: 'spawn-enemy', label: 'Spawn Ennemi', info: `${enemyCount}/8` },
    { key: 'obstacle-pm', label: 'Obstacle PM' },
    { key: 'obstacle-los', label: 'Obstacle LDV' },
    { key: 'excluded', label: 'Zone exclue' },
    { key: 'portal', label: `Portail${portals.size > 0 ? ` (${portals.size})` : ''}` },
    { key: 'eraser', label: 'Gomme' },
  ];

  return (
    <div className="admin-page">
      <div className="save-bar">
        <button className="btn" onClick={() => navigate('/admin/monde')}>← Retour</button>
        <span className="save-bar-title">Grille de combat — Map #{mapId} ({GRID_WIDTH}×{GRID_HEIGHT})</span>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
      <div className="grid-editor">
        <div className="toolbar">
          {tools.map(t => (
            <button
              key={t.key}
              className={`tool-btn ${tool === t.key ? 'active' : ''}`}
              onClick={() => setTool(t.key)}
            >
              {t.label} {t.info && <span className="grid-info">{t.info}</span>}
            </button>
          ))}
        </div>

        {tool === 'portal' && (
          <div className="portal-config">
            <label>Nom :</label>
            <input
              value={portalNom}
              onChange={e => setPortalNom(e.target.value)}
              placeholder="ex: Portail central..."
            />
            {!portalNom.trim() && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Entrez un nom avant de cliquer sur une case. La destination est choisie en jeu.
              </span>
            )}
          </div>
        )}

        <div
          className="grid-canvas"
          style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, 32px)` }}
          onMouseLeave={() => setPainting(false)}
        >
          {Array.from({ length: GRID_HEIGHT }).map((_, y) =>
            Array.from({ length: GRID_WIDTH }).map((_, x) => {
              const key = `${x},${y}`;
              const cell = cells.get(key);
              const portal = portals.get(key);
              let className = `grid-cell ${getCellClass(cell)}`;
              if (portal) className += ' portal-cell';
              return (
                <div
                  key={key}
                  className={className}
                  onMouseDown={(e) => { e.preventDefault(); handleMouseDown(x, y); }}
                  onMouseEnter={() => handleMouseEnter(x, y)}
                  onMouseUp={handleMouseUp}
                  title={portal ? `Portail réseau : ${portal.nom}` : undefined}
                >
                  {portal ? '\uD83D\uDEAA' : getCellLabel(cell)}
                </div>
              );
            })
          )}
        </div>

        {portals.size > 0 && (
          <div className="portal-list">
            <strong>Portails ({portals.size}) :</strong>
            {[...portals.entries()].map(([key, data]) => (
              <span key={key} className="portal-tag">
                ({key}) — {data.nom}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GridEditorPage;
