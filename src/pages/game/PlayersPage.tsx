import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { playersApi } from '../../api/players';
import type { Player } from '../../types';

const PlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    const data = await playersApi.getAll();
    setPlayers(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const createPlayer = async () => {
    if (newName.trim().length < 2) return;
    await playersApi.create({ nom: newName.trim() });
    setNewName('');
    refresh();
  };

  const selectPlayer = (p: Player) => {
    navigate(`/game/dashboard?playerId=${p.id}`);
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Choisir un joueur</h1>
      </div>
      <div className="inline-form">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom du joueur"
          onKeyDown={e => e.key === 'Enter' && createPlayer()} />
        <button className="btn btn-primary" onClick={createPlayer}>+ Creer</button>
      </div>
      <div className="card-grid">
        {players.map(p => (
          <div key={p.id} className="card" onClick={() => selectPlayer(p)}>
            <h4>{p.nom}</h4>
            <div className="meta">ID: {p.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayersPage;
