import React, { useState, useEffect, useCallback } from 'react';
import { mapsApi } from '../../api/maps';
import type { GameMap } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  WILDERNESS: '#2e7d32',
  VILLE: '#5c6bc0',
  DONJON: '#8e24aa',
  BOSS: '#c62828',
  SAFE: '#00838f',
};

interface PlacedMap {
  mapId: number;
  worldX: number;
  worldY: number;
}

const WorldMapEditor: React.FC = () => {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [placements, setPlacements] = useState<PlacedMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedUnplacedId, setSelectedUnplacedId] = useState<number | null>(null);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    try {
      const all = await mapsApi.getAll();
      setMaps(all);
      setPlacements(
        all
          .filter(m => m.worldX !== null && m.worldY !== null)
          .map(m => ({ mapId: m.id, worldX: m.worldX!, worldY: m.worldY! }))
      );
    } catch (e) {
      console.error('Failed to load maps', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMaps(); }, [loadMaps]);

  const placedIds = new Set(placements.map(p => p.mapId));
  const unplacedMaps = maps.filter(m => !placedIds.has(m.id));
  const mapById = new Map(maps.map(m => [m.id, m]));

  // Compute grid bounds from placements, +1 border for expansion
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  if (placements.length > 0) {
    minX = Math.min(...placements.map(p => p.worldX));
    maxX = Math.max(...placements.map(p => p.worldX));
    minY = Math.min(...placements.map(p => p.worldY));
    maxY = Math.max(...placements.map(p => p.worldY));
  }
  // Add 1 empty cell border around all placed maps
  const gridMinX = minX - 1;
  const gridMaxX = maxX + 1;
  const gridMinY = minY - 1;
  const gridMaxY = maxY + 1;
  const gridWidth = gridMaxX - gridMinX + 1;
  const gridHeight = gridMaxY - gridMinY + 1;

  // Build position lookup
  const posLookup = new Map<string, number>();
  for (const p of placements) {
    posLookup.set(`${p.worldX},${p.worldY}`, p.mapId);
  }

  const handleCellClick = (x: number, y: number) => {
    const key = `${x},${y}`;
    const existingMapId = posLookup.get(key);

    if (existingMapId) {
      // Remove from grid
      setPlacements(prev => prev.filter(p => p.mapId !== existingMapId));
      setDirty(true);
      setSelectedUnplacedId(null);
    } else if (selectedUnplacedId !== null) {
      // Place selected map
      setPlacements(prev => [...prev, { mapId: selectedUnplacedId, worldX: x, worldY: y }]);
      setDirty(true);
      setSelectedUnplacedId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await mapsApi.updateWorldPositions(placements);
      setMaps(result);
      setPlacements(
        result
          .filter(m => m.worldX !== null && m.worldY !== null)
          .map(m => ({ mapId: m.id, worldX: m.worldX!, worldY: m.worldY! }))
      );
      setDirty(false);
    } catch (e) {
      console.error('Failed to save', e);
      alert('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="world-editor">
      <div className="world-editor-main">
        <div className="save-bar">
          <span className="save-bar-title">Carte du monde</span>
          {dirty && <span style={{ color: 'var(--warning)', fontSize: 12 }}>Modifications non sauvegardees</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {selectedUnplacedId && (
          <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--info)' }}>
            Cliquez sur une case vide pour placer "{mapById.get(selectedUnplacedId)?.nom}"
            <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setSelectedUnplacedId(null)}>Annuler</button>
          </div>
        )}

        <div className="world-editor-grid" style={{
          gridTemplateColumns: `repeat(${gridWidth}, 90px)`,
          gridTemplateRows: `repeat(${gridHeight}, 70px)`,
        }}>
          {Array.from({ length: gridHeight }, (_, row) =>
            Array.from({ length: gridWidth }, (_, col) => {
              const x = gridMinX + col;
              const y = gridMinY + row;
              const mapId = posLookup.get(`${x},${y}`);
              const map = mapId ? mapById.get(mapId) : null;

              if (map) {
                return (
                  <div
                    key={`${x},${y}`}
                    className="world-cell world-cell-placed"
                    style={{ borderColor: TYPE_COLORS[map.type] || 'var(--border)' }}
                    onClick={() => handleCellClick(x, y)}
                    title={`${map.nom} (${x}, ${y}) — Clic pour retirer`}
                  >
                    <div className="world-cell-name">{map.nom}</div>
                    <div className="world-cell-type" style={{ color: TYPE_COLORS[map.type] }}>{map.type}</div>
                    <div className="world-cell-region">{map.region?.nom}</div>
                  </div>
                );
              }

              return (
                <div
                  key={`${x},${y}`}
                  className={`world-cell world-cell-empty ${selectedUnplacedId ? 'world-cell-target' : ''}`}
                  onClick={() => handleCellClick(x, y)}
                  title={`(${x}, ${y})`}
                >
                  <span className="world-cell-plus">+</span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          NORD = haut, SUD = bas, EST = droite, OUEST = gauche. Clic sur map = retirer. Les liens directionnels sont recalcules automatiquement.
        </div>
      </div>

      <div className="world-editor-sidebar">
        <h4>Maps non placees ({unplacedMaps.length})</h4>
        {unplacedMaps.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toutes les maps sont placees.</p>
        ) : (
          <div className="world-unplaced-list">
            {unplacedMaps.map(m => (
              <div
                key={m.id}
                className={`world-unplaced-item ${selectedUnplacedId === m.id ? 'selected' : ''}`}
                onClick={() => setSelectedUnplacedId(selectedUnplacedId === m.id ? null : m.id)}
                style={{ borderLeftColor: TYPE_COLORS[m.type] || 'var(--border)' }}
              >
                <span className="world-unplaced-name">{m.nom}</span>
                <span className="world-unplaced-meta">{m.type} — {m.region?.nom}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMapEditor;
