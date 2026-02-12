import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { grillesApi } from '../../api/donjons';
import type { GrilleCombat } from '../../types';

type CellData =
  | { type: 'spawn-player'; ordre: number }
  | { type: 'spawn-enemy'; ordre: number }
  | { type: 'obstacle-pm' }
  | { type: 'obstacle-los' };

type Tool = 'spawn-player' | 'spawn-enemy' | 'obstacle-pm' | 'obstacle-los' | 'eraser';

const GridEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [grille, setGrille] = useState<GrilleCombat | null>(null);
  const [cells, setCells] = useState<Map<string, CellData>>(new Map());
  const [tool, setTool] = useState<Tool>('spawn-player');
  const [painting, setPainting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    grillesApi.getById(Number(id)).then((g) => {
      setGrille(g);
      const initial = new Map<string, CellData>();
      if (g.cases) {
        for (const c of g.cases) {
          if (c.bloqueLigneDeVue) {
            initial.set(`${c.x},${c.y}`, { type: 'obstacle-los' });
          } else {
            initial.set(`${c.x},${c.y}`, { type: 'obstacle-pm' });
          }
        }
      }
      if (g.spawns) {
        for (const s of g.spawns) {
          initial.set(`${s.x},${s.y}`, {
            type: s.equipe === 0 ? 'spawn-player' : 'spawn-enemy',
            ordre: s.ordre,
          });
        }
      }
      setCells(initial);
    });
  }, [id]);

  const countSpawns = useCallback((type: 'spawn-player' | 'spawn-enemy') => {
    let count = 0;
    for (const v of cells.values()) {
      if (v.type === type) count++;
    }
    return count;
  }, [cells]);

  const nextOrdre = useCallback((type: 'spawn-player' | 'spawn-enemy') => {
    let max = 0;
    for (const v of cells.values()) {
      if (v.type === type && v.ordre > max) max = v.ordre;
    }
    return max + 1;
  }, [cells]);

  const applyTool = useCallback((x: number, y: number) => {
    setCells(prev => {
      const next = new Map(prev);
      const key = `${x},${y}`;

      if (tool === 'eraser') {
        next.delete(key);
        return next;
      }

      // Don't overwrite existing cell when dragging (except eraser)
      if (prev.has(key) && tool !== 'eraser') return prev;

      if (tool === 'spawn-player' || tool === 'spawn-enemy') {
        // Count current spawns of this type
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
      }

      return next;
    });
  }, [tool]);

  const handleMouseDown = (x: number, y: number) => {
    setPainting(true);
    applyTool(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (painting) applyTool(x, y);
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
    if (!grille || !canSave) return;
    setSaving(true);
    setError('');
    try {
      const obstacles: { x: number; y: number; bloqueDeplacement: boolean; bloqueLigneDeVue: boolean }[] = [];
      const spawns: { x: number; y: number; equipe: number; ordre: number }[] = [];

      for (const [key, data] of cells.entries()) {
        const [xStr, yStr] = key.split(',');
        const x = Number(xStr);
        const y = Number(yStr);

        if (data.type === 'obstacle-pm') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: false });
        } else if (data.type === 'obstacle-los') {
          obstacles.push({ x, y, bloqueDeplacement: true, bloqueLigneDeVue: true });
        } else if (data.type === 'spawn-player') {
          spawns.push({ x, y, equipe: 0, ordre: data.ordre });
        } else if (data.type === 'spawn-enemy') {
          spawns.push({ x, y, equipe: 1, ordre: data.ordre });
        }
      }

      await grillesApi.setCases(grille.id, obstacles);
      await grillesApi.setSpawns(grille.id, spawns);
      navigate('/admin/grilles');
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
      default: return '';
    }
  };

  const getCellLabel = (cell?: CellData) => {
    if (!cell) return '';
    if (cell.type === 'spawn-player' || cell.type === 'spawn-enemy') return String(cell.ordre);
    if (cell.type === 'obstacle-los') return 'LDV';
    return '';
  };

  if (!grille) return <div className="admin-page"><p>Chargement...</p></div>;

  const tools: { key: Tool; label: string; info?: string }[] = [
    { key: 'spawn-player', label: 'Spawn Joueur', info: `${playerCount}/8` },
    { key: 'spawn-enemy', label: 'Spawn Ennemi', info: `${enemyCount}/8` },
    { key: 'obstacle-pm', label: 'Obstacle PM' },
    { key: 'obstacle-los', label: 'Obstacle LDV' },
    { key: 'eraser', label: 'Gomme' },
  ];

  return (
    <div className="admin-page">
      <div className="save-bar">
        <button className="btn" onClick={() => navigate('/admin/grilles')}>← Retour</button>
        <span className="save-bar-title">{grille.nom} ({grille.largeur}x{grille.hauteur})</span>
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
        <div
          className="grid-canvas"
          style={{ gridTemplateColumns: `repeat(${grille.largeur}, 32px)` }}
          onMouseLeave={() => setPainting(false)}
        >
          {Array.from({ length: grille.hauteur }).map((_, y) =>
            Array.from({ length: grille.largeur }).map((_, x) => {
              const cell = cells.get(`${x},${y}`);
              return (
                <div
                  key={`${x},${y}`}
                  className={`grid-cell ${getCellClass(cell)}`}
                  onMouseDown={(e) => { e.preventDefault(); handleMouseDown(x, y); }}
                  onMouseEnter={() => handleMouseEnter(x, y)}
                  onMouseUp={handleMouseUp}
                >
                  {getCellLabel(cell)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GridEditorPage;
