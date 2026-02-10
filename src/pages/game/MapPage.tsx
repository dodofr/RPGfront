import React, { useState, useEffect } from 'react';
import { groupsApi } from '../../api/groups';
import { mapsApi } from '../../api/maps';
import type { Group, GameMap } from '../../types';
import { useNavigate } from 'react-router-dom';

const MapPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [mapData, setMapData] = useState<GameMap | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    const grps = await groupsApi.getAll();
    setGroups(grps.filter(g => g.mapId !== null));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const selectGroup = async (g: Group) => {
    setSelectedGroup(g);
    if (g.mapId) {
      const map = await mapsApi.getById(g.mapId);
      setMapData(map);
    }
  };

  const engage = async (groupeEnnemiId: number) => {
    if (!selectedGroup || !mapData) return;
    try {
      const result = await mapsApi.engage(mapData.id, {
        groupeId: selectedGroup.id,
        groupeEnnemiId,
      });
      navigate(`/game/combat/${result.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    }
  };

  const spawnEnemies = async () => {
    if (!mapData) return;
    await mapsApi.spawnEnemies(mapData.id);
    if (selectedGroup) selectGroup(selectedGroup);
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Exploration</h1>
      </div>

      {groups.length === 0 ? (
        <p className="meta">Aucun groupe n'est actuellement sur une map. Allez dans Groupes pour entrer sur une map.</p>
      ) : (
        <div className="card-grid">
          {groups.map(g => (
            <div key={g.id} className={`card ${selectedGroup?.id === g.id ? 'selected' : ''}`}
              onClick={() => selectGroup(g)}>
              <h4>{g.nom}</h4>
              <div className="meta">Map #{g.mapId} | Pos: ({g.positionX}, {g.positionY})</div>
            </div>
          ))}
        </div>
      )}

      {mapData && selectedGroup && (
        <div style={{ marginTop: 24 }}>
          <h2>{mapData.nom}</h2>
          <p className="meta">
            {mapData.type} | {mapData.combatMode} | {mapData.largeur}x{mapData.hauteur} |
            Region: {mapData.region?.nom}
          </p>

          {/* Connections */}
          {mapData.connectionsFrom && mapData.connectionsFrom.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Connexions</h3>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {mapData.connectionsFrom.map(conn => (
                  <button key={conn.id} className="btn btn-info"
                    onClick={async () => {
                      try {
                        const result = await groupsApi.useConnection(selectedGroup.id, conn.id);
                        if (result.combat) {
                          navigate(`/game/combat/${result.combat.id}`);
                          return;
                        }
                        selectGroup(selectedGroup);
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Error';
                        alert(msg);
                      }
                    }}>
                    {conn.nom} → {conn.toMap?.nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enemy groups */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Groupes ennemis</h3>
              {mapData.combatMode === 'MANUEL' && (
                <button className="btn btn-sm btn-secondary" onClick={spawnEnemies}>Spawn ennemis</button>
              )}
            </div>
            {mapData.groupesEnnemis && mapData.groupesEnnemis.length > 0 ? (
              <div className="card-grid" style={{ marginTop: 8 }}>
                {mapData.groupesEnnemis.filter(ge => !ge.vaincu).map(ge => (
                  <div key={ge.id} className="card">
                    <h4>Groupe ennemi #{ge.id}</h4>
                    <div className="meta">Pos: ({ge.positionX}, {ge.positionY})</div>
                    <div className="meta">
                      {ge.membres?.map(m => `${m.monstre?.nom} x${m.quantite} Niv.${m.niveau}`).join(', ')}
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ marginTop: 8 }}
                      onClick={() => engage(ge.id)}>Engager</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="meta" style={{ marginTop: 8 }}>Aucun ennemi visible</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
