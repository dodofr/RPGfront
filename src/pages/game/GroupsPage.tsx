import React, { useState, useEffect } from 'react';
import { groupsApi } from '../../api/groups';
import { playersApi } from '../../api/players';
import { charactersApi } from '../../api/characters';
import type { Group, Player, Character } from '../../types';
import FormModal, { type FieldDef } from '../../components/FormModal';
import { useNavigate } from 'react-router-dom';

interface GroupsPageProps {
  playerId?: number;
}

const GroupsPage: React.FC<GroupsPageProps> = ({ playerId }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allChars, setAllChars] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    const [grps, pls, chars] = await Promise.all([
      groupsApi.getAll(),
      playersApi.getAll(),
      playerId ? playersApi.getCharacters(playerId) : charactersApi.getAll(),
    ]);
    setAllGroups(grps);
    setGroups(playerId ? grps.filter(g => g.joueurId === playerId) : grps);
    setPlayers(pls);
    setAllChars(chars);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [playerId]);

  const selectGroup = async (id: number) => {
    const g = await groupsApi.getById(id);
    setSelected(g);
  };

  const addChar = async (personnageId: number) => {
    if (!selected) return;
    try {
      await groupsApi.addCharacter(selected.id, personnageId);
      await refresh();
      selectGroup(selected.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    }
  };

  const removeChar = async (charId: number) => {
    if (!selected) return;
    await groupsApi.removeCharacter(selected.id, charId);
    await refresh();
    selectGroup(selected.id);
  };

  const createFields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'joueurId', label: 'Joueur', type: 'select', required: true,
      options: players.map(p => ({ value: p.id, label: p.nom })),
      ...(playerId ? { defaultValue: playerId } : {}) },
  ];

  if (loading) return <div className="loading">Chargement...</div>;

  // Build set of all character IDs already in ANY group
  const charsInGroups = new Set<number>();
  for (const g of allGroups) {
    if (g.personnages) {
      for (const p of g.personnages) {
        charsInGroups.add(p.personnage.id);
      }
    }
  }

  const groupChars = selected?.personnages?.map(p => p.personnage) || [];
  // Exclude chars already in ANY group (not just the selected one)
  const availableChars = allChars.filter(c => !charsInGroups.has(c.id));

  return (
    <div>
      <div className="page-header">
        <h1>Groupes</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Creer</button>
      </div>
      <div className="card-grid">
        {groups.map(g => (
          <div key={g.id} className={`card ${selected?.id === g.id ? 'selected' : ''}`}
            onClick={() => selectGroup(g.id)}>
            <h4>{g.nom}</h4>
            <div className="meta">
              {g.personnages?.length || 0} persos |
              Map: {g.mapId ?? 'Aucune'}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Groupe: {selected.nom}</h2>
            <button className="btn btn-success" onClick={() => navigate(`/game/adventure?groupId=${selected.id}`)}>
              Partir a l'aventure
            </button>
          </div>
          <p className="meta">Map: {selected.map?.nom ?? 'Aucune'} | Position: ({selected.positionX}, {selected.positionY})</p>

          {/* Members */}
          <h3 style={{ marginTop: 16 }}>Membres ({groupChars.length}/6)</h3>
          <div className="card-grid" style={{ marginTop: 8 }}>
            {groupChars.map(c => (
              <div key={c.id} className="card">
                <h4>{c.nom} <span className="meta">Niv. {c.niveau}</span></h4>
                <button className="btn btn-sm btn-danger" onClick={() => removeChar(c.id)}>Retirer</button>
              </div>
            ))}
          </div>

          {/* Add character */}
          {groupChars.length < 6 && availableChars.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4>Ajouter un personnage</h4>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {availableChars.map(c => (
                  <button key={c.id} className="btn btn-sm btn-secondary" onClick={() => addChar(c.id)}>
                    {c.nom} (Niv.{c.niveau})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <FormModal open={showCreate} title="Creer un groupe" fields={createFields}
        onSubmit={async (vals) => {
          await groupsApi.create(vals as { nom: string; joueurId: number });
          setShowCreate(false);
          refresh();
        }}
        onCancel={() => setShowCreate(false)} />
    </div>
  );
};

export default GroupsPage;
