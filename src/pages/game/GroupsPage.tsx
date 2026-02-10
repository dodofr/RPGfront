import React, { useState, useEffect } from 'react';
import { groupsApi } from '../../api/groups';
import { playersApi } from '../../api/players';
import { charactersApi } from '../../api/characters';
import type { Group, Player, Character, Direction } from '../../types';
import FormModal, { type FieldDef } from '../../components/FormModal';
import { useNavigate } from 'react-router-dom';

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
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
      charactersApi.getAll(),
    ]);
    setGroups(grps);
    setPlayers(pls);
    setAllChars(chars);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const selectGroup = async (id: number) => {
    const g = await groupsApi.getById(id);
    setSelected(g);
  };

  const addChar = async (personnageId: number) => {
    if (!selected) return;
    try {
      await groupsApi.addCharacter(selected.id, personnageId);
      selectGroup(selected.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    }
  };

  const removeChar = async (charId: number) => {
    if (!selected) return;
    await groupsApi.removeCharacter(selected.id, charId);
    selectGroup(selected.id);
  };

  const moveDir = async (dir: Direction) => {
    if (!selected) return;
    try {
      const result = await groupsApi.moveDirection(selected.id, dir);
      if (result.combat) {
        navigate(`/game/combat/${result.combat.id}`);
        return;
      }
      selectGroup(selected.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    }
  };

  const enterMap = async (mapId: number) => {
    if (!selected) return;
    try {
      const result = await groupsApi.enterMap(selected.id, mapId);
      if (result.combat) {
        navigate(`/game/combat/${result.combat.id}`);
        return;
      }
      selectGroup(selected.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(msg);
    }
  };

  const createFields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'joueurId', label: 'Joueur', type: 'select', required: true,
      options: players.map(p => ({ value: p.id, label: p.nom })) },
  ];

  if (loading) return <div className="loading">Chargement...</div>;

  const groupChars = selected?.personnages?.map(p => p.personnage) || [];
  const groupCharIds = new Set(groupChars.map(c => c.id));
  const availableChars = allChars.filter(c => !groupCharIds.has(c.id));

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
              Map: {g.mapId ?? 'Aucune'} |
              Pos: ({g.positionX}, {g.positionY})
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 24 }}>
          <h2>Groupe: {selected.nom}</h2>
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

          {/* Navigation */}
          <h3 style={{ marginTop: 16 }}>Navigation</h3>
          {!selected.mapId ? (
            <div style={{ marginTop: 8 }}>
              <p className="meta">Le groupe n'est sur aucune map. Entrer sur une map:</p>
              <div className="inline-form" style={{ marginTop: 8 }}>
                <input id="mapIdInput" type="number" placeholder="Map ID" style={{ width: 100 }} />
                <button className="btn btn-primary" onClick={() => {
                  const input = document.getElementById('mapIdInput') as HTMLInputElement;
                  const mapId = parseInt(input.value);
                  if (!isNaN(mapId)) enterMap(mapId);
                }}>Entrer</button>
              </div>
            </div>
          ) : (
            <>
              <div className="direction-controls">
                <button className="btn btn-info btn-nord" onClick={() => moveDir('NORD')}>N</button>
                <button className="btn btn-info btn-ouest" onClick={() => moveDir('OUEST')}>O</button>
                <button className="btn btn-info btn-est" onClick={() => moveDir('EST')}>E</button>
                <button className="btn btn-info btn-sud" onClick={() => moveDir('SUD')}>S</button>
              </div>
              <button className="btn btn-secondary" onClick={async () => {
                await groupsApi.leaveMap(selected.id);
                selectGroup(selected.id);
              }}>Quitter la map</button>
            </>
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
