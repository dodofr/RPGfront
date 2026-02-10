import React, { useState, useEffect } from 'react';
import { playersApi } from '../../api/players';
import type { Player, Character, Group } from '../../types';

const PlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const data = await playersApi.getAll();
    setPlayers(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const selectPlayer = async (p: Player) => {
    setSelected(p);
    const [chars, grps] = await Promise.all([
      playersApi.getCharacters(p.id),
      playersApi.getGroups(p.id),
    ]);
    setCharacters(chars);
    setGroups(grps);
  };

  const createPlayer = async () => {
    if (newName.trim().length < 2) return;
    await playersApi.create({ nom: newName.trim() });
    setNewName('');
    refresh();
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Joueurs</h1>
      </div>
      <div className="inline-form">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom du joueur"
          onKeyDown={e => e.key === 'Enter' && createPlayer()} />
        <button className="btn btn-primary" onClick={createPlayer}>+ Creer</button>
      </div>
      <div className="card-grid">
        {players.map(p => (
          <div key={p.id} className={`card ${selected?.id === p.id ? 'selected' : ''}`} onClick={() => selectPlayer(p)}>
            <h4>{p.nom}</h4>
            <div className="meta">ID: {p.id}</div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 24 }}>
          <h2>Personnages de {selected.nom}</h2>
          {characters.length === 0 ? <p className="meta">Aucun personnage</p> : (
            <div className="card-grid" style={{ marginTop: 8 }}>
              {characters.map(c => (
                <div key={c.id} className="card">
                  <h4>{c.nom}</h4>
                  <div className="meta">Niv. {c.niveau} - {c.race?.nom} - XP: {c.experience}</div>
                </div>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 16 }}>Groupes</h2>
          {groups.length === 0 ? <p className="meta">Aucun groupe</p> : (
            <div className="card-grid" style={{ marginTop: 8 }}>
              {groups.map(g => (
                <div key={g.id} className="card">
                  <h4>{g.nom}</h4>
                  <div className="meta">{g.personnages?.length || 0} personnages - Map: {g.mapId ?? 'aucune'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayersPage;
