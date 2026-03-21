import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mapsApi, uploadApi } from '../../api/maps';
import { metiersApi } from '../../api/metiers';
import type { GameMap, MapConnection, NoeudRecolte, MapRessource } from '../../types';

type CellData =
  | { type: 'spawn-player'; ordre: number }
  | { type: 'spawn-enemy'; ordre: number }
  | { type: 'obstacle-pm' }
  | { type: 'obstacle-los' }
  | { type: 'excluded' }
  | { type: 'premier-plan' };

type ExitDir = 'nord' | 'sud' | 'est' | 'ouest';

type Tool = 'spawn-player' | 'spawn-enemy' | 'obstacle-pm' | 'obstacle-los' | 'excluded' | 'premier-plan' | 'portal' | 'resource' | 'exit-nord' | 'exit-sud' | 'exit-est' | 'exit-ouest' | 'eraser';

type PortalData = { nom: string };
type ResourceData = { id?: number; noeudId: number; noeudNom: string; respawnMinutes: number };

const GridEditorPage: React.FC = () => {
  const { mapId } = useParams<{ mapId: string }>();
  const navigate = useNavigate();
  const [mapInfo, setMapInfo] = useState<GameMap | null>(null);
  const [cells, setCells] = useState<Map<string, CellData>>(new Map());
  const [portals, setPortals] = useState<Map<string, PortalData>>(new Map());
  const [mapRessources, setMapRessources] = useState<Map<string, ResourceData>>(new Map());
  const [originalRessources, setOriginalRessources] = useState<MapRessource[]>([]);
  const [noeuds, setNoeuds] = useState<NoeudRecolte[]>([]);
  const [selectedNoeudId, setSelectedNoeudId] = useState<number | ''>('');
  const [ressourceRespawn, setRessourceRespawn] = useState(10);
  const [originalConnections, setOriginalConnections] = useState<MapConnection[]>([]);
  const [portalNom, setPortalNom] = useState('');
  const [tool, setTool] = useState<Tool>('spawn-player');
  const [painting, setPainting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Exit positions: { nord: {x,y}|null, ... }
  const [exits, setExits] = useState<Record<ExitDir, { x: number; y: number } | null>>({
    nord: null, sud: null, est: null, ouest: null,
  });
  // Image URL
  const [imageUrl, setImageUrl] = useState('');

  const gridWidth = mapInfo?.largeur ?? 20;
  const gridHeight = mapInfo?.hauteur ?? 14;

  useEffect(() => {
    if (!mapId) return;
    setLoading(true);
    Promise.all([
      mapsApi.getGrid(Number(mapId)),
      mapsApi.getById(Number(mapId)),
      mapsApi.getRessources(Number(mapId)),
      metiersApi.getAll(),
    ]).then(([grid, info, existingRessources, allMetiers]) => {
      // Load noeuds from all métiers
      const allNoeuds: NoeudRecolte[] = [];
      for (const m of allMetiers) {
        if (m.noeuds) allNoeuds.push(...m.noeuds);
      }
      setNoeuds(allNoeuds);

      // Load existing map ressources
      setOriginalRessources(existingRessources);
      const initialRessources = new Map<string, ResourceData>();
      for (const mr of existingRessources) {
        const noeud = allNoeuds.find(n => n.id === mr.noeudId);
        initialRessources.set(`${mr.caseX},${mr.caseY}`, {
          id: mr.id,
          noeudId: mr.noeudId,
          noeudNom: noeud?.nom ?? `Nœud #${mr.noeudId}`,
          respawnMinutes: mr.respawnMinutes,
        });
      }
      setMapRessources(initialRessources);

      setMapInfo(info);
      setImageUrl(info.imageUrl ?? '');
      // Load exits
      setExits({
        nord: info.nordExitX !== null && info.nordExitY !== null ? { x: info.nordExitX, y: info.nordExitY } : null,
        sud: info.sudExitX !== null && info.sudExitY !== null ? { x: info.sudExitX, y: info.sudExitY } : null,
        est: info.estExitX !== null && info.estExitY !== null ? { x: info.estExitX, y: info.estExitY } : null,
        ouest: info.ouestExitX !== null && info.ouestExitY !== null ? { x: info.ouestExitX, y: info.ouestExitY } : null,
      });
      const initial = new Map<string, CellData>();
      if (grid.cases) {
        for (const c of grid.cases) {
          if (c.estPremierPlan) {
            initial.set(`${c.x},${c.y}`, { type: 'premier-plan' });
          } else if (c.estExclue) {
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

      const nonDungeonConns = (info.connectionsFrom ?? []).filter(c => !c.donjonId);
      setOriginalConnections(nonDungeonConns);
      const initialPortals = new Map<string, PortalData>();
      for (const conn of nonDungeonConns) {
        initialPortals.set(`${conn.positionX},${conn.positionY}`, { nom: conn.nom });
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

    // Exit tools: set the exit position for the direction
    if (tool === 'exit-nord' || tool === 'exit-sud' || tool === 'exit-est' || tool === 'exit-ouest') {
      const dir = tool.replace('exit-', '') as ExitDir;
      setExits(prev => ({ ...prev, [dir]: { x, y } }));
      return;
    }

    if (tool === 'eraser') {
      setPortals(prev => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      setMapRessources(prev => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
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

    if (tool === 'resource') {
      if (!selectedNoeudId) return;
      const noeud = noeuds.find(n => n.id === selectedNoeudId);
      if (!noeud) return;
      setMapRessources(prev => {
        const next = new Map(prev);
        next.set(key, { noeudId: noeud.id, noeudNom: noeud.nom, respawnMinutes: ressourceRespawn });
        return next;
      });
      return;
    }

    setCells(prev => {
      const next = new Map(prev);

      if (tool === 'spawn-player' || tool === 'spawn-enemy') {
        let count = 0;
        for (const v of prev.values()) {
          if (v.type === tool) count++;
        }
        // Ne pas compter si la case est déjà un spawn du même type
        if (prev.get(key)?.type === tool) return prev;
        if (count >= 8) return prev;
        next.set(key, { type: tool, ordre: count + 1 });
      } else if (prev.has(key)) {
        return prev;
      } else if (tool === 'obstacle-pm') {
        next.set(key, { type: 'obstacle-pm' });
      } else if (tool === 'obstacle-los') {
        next.set(key, { type: 'obstacle-los' });
      } else if (tool === 'excluded') {
        next.set(key, { type: 'excluded' });
      } else if (tool === 'premier-plan') {
        next.set(key, { type: 'premier-plan' });
      }

      return next;
    });
  }, [tool, portalNom, selectedNoeudId, noeuds, ressourceRespawn]);

  const handleMouseDown = (x: number, y: number) => {
    setPainting(true);
    applyTool(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (painting && tool !== 'portal' && tool !== 'resource') applyTool(x, y);
  };

  const handleMouseUp = () => setPainting(false);

  useEffect(() => {
    const up = () => setPainting(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const playerCount = countSpawns('spawn-player');
  const enemyCount = countSpawns('spawn-enemy');
  const spawnGridComplete = playerCount === 8 && enemyCount === 8;

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadApi.mapImage(file);
      setImageUrl(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!mapId) return;
    setSaving(true);
    setError('');
    try {
      const obstacles: { x: number; y: number; bloqueDeplacement: boolean; bloqueLigneDeVue: boolean; estExclue: boolean; estPremierPlan: boolean }[] = [];
      const spawns: { x: number; y: number; equipe: number; ordre: number }[] = [];

      for (const [key, data] of cells.entries()) {
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr);
        const y = Number(yStr);

        if (data.type === 'obstacle-pm') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: false, estExclue: false, estPremierPlan: false });
        } else if (data.type === 'obstacle-los') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: true, estExclue: false, estPremierPlan: false });
        } else if (data.type === 'excluded') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: true, estExclue: true, estPremierPlan: false });
        } else if (data.type === 'premier-plan') {
          obstacles.push({ x, y, bloqueDeplacement: false, bloqueLigneDeVue: false, estExclue: false, estPremierPlan: true });
        } else if (data.type === 'spawn-player') {
          spawns.push({ x, y, equipe: 0, ordre: data.ordre });
        } else if (data.type === 'spawn-enemy') {
          spawns.push({ x, y, equipe: 1, ordre: data.ordre });
        }
      }

      // Cases (obstacles + premier-plan) : toujours sauvegardées
      await mapsApi.setCases(Number(mapId), obstacles);
      // Spawns : seulement si la grille est complète (8+8)
      if (spawnGridComplete) {
        await mapsApi.setSpawns(Number(mapId), spawns);
      }

      // Save portals
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

      // Save map ressources: delete all originals, then re-create from current state
      await Promise.all(originalRessources.map(mr => mapsApi.removeRessource(Number(mapId), mr.id)));
      await Promise.all([...mapRessources.entries()].map(([key, data]) => {
        const [xStr, yStr] = key.split(',');
        return mapsApi.addRessource(Number(mapId), {
          noeudId: data.noeudId,
          caseX: Number(xStr),
          caseY: Number(yStr),
          respawnMinutes: data.respawnMinutes,
        });
      }));

      // Save exits + imageUrl
      await mapsApi.update(Number(mapId), {
        imageUrl: imageUrl.trim() || null,
        nordExitX: exits.nord?.x ?? null,
        nordExitY: exits.nord?.y ?? null,
        sudExitX: exits.sud?.x ?? null,
        sudExitY: exits.sud?.y ?? null,
        estExitX: exits.est?.x ?? null,
        estExitY: exits.est?.y ?? null,
        ouestExitX: exits.ouest?.x ?? null,
        ouestExitY: exits.ouest?.y ?? null,
      } as any);

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
      case 'premier-plan': return 'premier-plan-edit';
      default: return '';
    }
  };

  const getCellLabel = (cell?: CellData) => {
    if (!cell) return '';
    if (cell.type === 'spawn-player' || cell.type === 'spawn-enemy') return String(cell.ordre);
    if (cell.type === 'obstacle-los') return 'LDV';
    if (cell.type === 'premier-plan') return 'PP';
    return '';
  };

  const getExitLabel = (x: number, y: number) => {
    if (exits.nord?.x === x && exits.nord?.y === y) return '↑N';
    if (exits.sud?.x === x && exits.sud?.y === y) return '↓S';
    if (exits.est?.x === x && exits.est?.y === y) return '→E';
    if (exits.ouest?.x === x && exits.ouest?.y === y) return '←O';
    return null;
  };

  if (loading) return <div className="admin-page"><p>Chargement...</p></div>;

  const tools: { key: Tool; label: string; info?: string }[] = [
    { key: 'spawn-player', label: 'Spawn Joueur', info: `${playerCount}/8` },
    { key: 'spawn-enemy', label: 'Spawn Ennemi', info: `${enemyCount}/8` },
    { key: 'obstacle-pm', label: 'Obstacle PM' },
    { key: 'obstacle-los', label: 'Obstacle LDV' },
    { key: 'excluded', label: 'Zone exclue' },
    { key: 'premier-plan', label: 'Premier-plan' },
    { key: 'portal', label: `Portail${portals.size > 0 ? ` (${portals.size})` : ''}` },
    { key: 'resource', label: `Ressource${mapRessources.size > 0 ? ` (${mapRessources.size})` : ''}` },
    ...(mapInfo?.nordMapId ? [{ key: 'exit-nord' as Tool, label: `Sortie N${exits.nord ? ` (${exits.nord.x},${exits.nord.y})` : ''}` }] : []),
    ...(mapInfo?.sudMapId ? [{ key: 'exit-sud' as Tool, label: `Sortie S${exits.sud ? ` (${exits.sud.x},${exits.sud.y})` : ''}` }] : []),
    ...(mapInfo?.estMapId ? [{ key: 'exit-est' as Tool, label: `Sortie E${exits.est ? ` (${exits.est.x},${exits.est.y})` : ''}` }] : []),
    ...(mapInfo?.ouestMapId ? [{ key: 'exit-ouest' as Tool, label: `Sortie O${exits.ouest ? ` (${exits.ouest.x},${exits.ouest.y})` : ''}` }] : []),
    { key: 'eraser', label: 'Gomme' },
  ];

  return (
    <div className="admin-page">
      <div className="save-bar">
        <button className="btn" onClick={() => navigate('/admin/monde')}>← Retour</button>
        <span className="save-bar-title">Grille de combat — Map #{mapId} ({gridWidth}×{gridHeight})</span>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}

      <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <label>Image de fond :</label>
        <input
          style={{ flex: 1, maxWidth: 340 }}
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="URL de l'image (ex: /assets/maps/foret.jpg)"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleUploadImage}
        />
        <button
          className="btn btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Importer une image depuis votre ordinateur"
        >
          {uploading ? 'Upload...' : '📁 Importer'}
        </button>
        {imageUrl && (
          <img src={imageUrl} alt="preview" style={{ height: 32, borderRadius: 3, border: '1px solid var(--border)' }} />
        )}
      </div>

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

        {tool === 'resource' && (
          <div className="portal-config">
            <label>Nœud :</label>
            <select value={selectedNoeudId} onChange={e => setSelectedNoeudId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Choisir un nœud —</option>
              {noeuds.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
            <label>Respawn (min) :</label>
            <input type="number" min={1} value={ressourceRespawn} onChange={e => setRessourceRespawn(Number(e.target.value))} style={{ width: 60 }} />
            {!selectedNoeudId && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Sélectionnez un nœud avant de cliquer sur une case.
              </span>
            )}
          </div>
        )}

        {(tool === 'exit-nord' || tool === 'exit-sud' || tool === 'exit-est' || tool === 'exit-ouest') && (
          <div className="portal-config">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Cliquez sur la case qui servira de sortie directionnelle pour "{tool.replace('exit-', '').toUpperCase()}".
            </span>
          </div>
        )}

        <div
          className="grid-canvas"
          style={{ gridTemplateColumns: `repeat(${gridWidth}, 32px)` }}
          onMouseLeave={() => setPainting(false)}
        >
          {Array.from({ length: gridHeight }).map((_, y) =>
            Array.from({ length: gridWidth }).map((_, x) => {
              const key = `${x},${y}`;
              const cell = cells.get(key);
              const portal = portals.get(key);
              const resource = mapRessources.get(key);
              const exitLabel = getExitLabel(x, y);
              let className = `grid-cell ${getCellClass(cell)}`;
              if (portal) className += ' portal-cell';
              if (resource) className += ' resource-cell';
              if (exitLabel) className += ' exit-cell';
              return (
                <div
                  key={key}
                  className={className}
                  onMouseDown={(e) => { e.preventDefault(); handleMouseDown(x, y); }}
                  onMouseEnter={() => handleMouseEnter(x, y)}
                  onMouseUp={handleMouseUp}
                  title={portal ? `Portail réseau : ${portal.nom}` : resource ? `${resource.noeudNom} (respawn ${resource.respawnMinutes}min)` : exitLabel ? `Sortie ${exitLabel}` : undefined}
                >
                  {exitLabel ?? (portal ? '\uD83D\uDEAA' : resource ? '\uD83C\uDF3F' : getCellLabel(cell))}
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

        {mapRessources.size > 0 && (
          <div className="portal-list">
            <strong>Ressources ({mapRessources.size}) :</strong>
            {[...mapRessources.entries()].map(([key, data]) => (
              <span key={key} className="portal-tag" style={{ background: 'rgba(139,195,74,0.2)', borderColor: 'rgba(139,195,74,0.5)' }}>
                ({key}) — {data.noeudNom} ({data.respawnMinutes}min)
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GridEditorPage;
