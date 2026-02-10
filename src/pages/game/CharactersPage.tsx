import React, { useState, useEffect } from 'react';
import { charactersApi } from '../../api/characters';
import { playersApi } from '../../api/players';
import { racesApi, equipmentApi } from '../../api/static';
import type { Character, Player, Race, Sort, Equipment, SlotType } from '../../types';
import FormModal, { type FieldDef } from '../../components/FormModal';
import '../../styles/admin.css';

// Normalize effect from either flat (combat) or nested (API) format
const getEffetNom = (e: NonNullable<Sort['effets']>[number]) => e.nom || e.effet?.nom || '';
const getEffetType = (e: NonNullable<Sort['effets']>[number]) => e.type || e.effet?.type || '';

const SLOTS: { key: SlotType; label: string }[] = [
  { key: 'ARME', label: 'Arme' },
  { key: 'COIFFE', label: 'Coiffe' },
  { key: 'AMULETTE', label: 'Amulette' },
  { key: 'BOUCLIER', label: 'Bouclier' },
  { key: 'HAUT', label: 'Haut' },
  { key: 'BAS', label: 'Bas' },
  { key: 'ANNEAU1', label: 'Anneau 1' },
  { key: 'ANNEAU2', label: 'Anneau 2' },
  { key: 'FAMILIER', label: 'Familier' },
];

const STAT_KEYS = ['force', 'intelligence', 'dexterite', 'agilite', 'vie', 'chance'] as const;

const CharactersPage: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [spells, setSpells] = useState<Sort[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [chars, pls, rcs, eqs] = await Promise.all([
      charactersApi.getAll(),
      playersApi.getAll(),
      racesApi.getAll(),
      equipmentApi.getAll(),
    ]);
    setCharacters(chars);
    setPlayers(pls);
    setRaces(rcs);
    setAllEquipment(eqs);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const selectChar = async (id: number) => {
    const [c, s] = await Promise.all([
      charactersApi.getById(id),
      charactersApi.getSpells(id),
    ]);
    setSelected(c);
    setSpells(s as Sort[]);
  };

  const createFields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'joueurId', label: 'Joueur', type: 'select', required: true,
      options: players.map(p => ({ value: p.id, label: p.nom })) },
    { name: 'raceId', label: 'Race', type: 'select', required: true,
      options: races.map(r => ({ value: r.id, label: r.nom })) },
  ];

  const allocateStat = async (stat: string) => {
    if (!selected || selected.pointsStatsDisponibles <= 0) return;
    await charactersApi.allocateStats(selected.id, { [stat]: 1 });
    selectChar(selected.id);
  };

  const handleEquip = async (slot: SlotType, equipmentId: number | null) => {
    if (!selected) return;
    await charactersApi.equip(selected.id, slot, equipmentId);
    selectChar(selected.id);
  };

  const getEquipmentForSlot = (slot: SlotType) =>
    allEquipment.filter(e => e.slot === slot);

  const getEquippedItem = (slot: SlotType): Equipment | undefined => {
    if (!selected) return undefined;
    const eqId = selected.equipements[slot];
    if (!eqId) return undefined;
    return allEquipment.find(e => e.id === eqId);
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Personnages</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Creer</button>
      </div>
      <div className="card-grid">
        {characters.map(c => (
          <div key={c.id} className={`card ${selected?.id === c.id ? 'selected' : ''}`}
            onClick={() => selectChar(c.id)}>
            <h4>{c.nom}</h4>
            <div className="meta">Niv. {c.niveau} - {c.race?.nom} - Joueur #{c.joueurId}</div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="char-detail">
          <h2>{selected.nom} - Niveau {selected.niveau}</h2>
          <p className="char-meta">
            Race: {selected.race?.nom} | XP: {selected.experience} | Points disponibles: {selected.pointsStatsDisponibles}
          </p>

          {/* Stats Section */}
          <h3 className="section-title">Stats</h3>
          <div className="detail-sections">
            <div className="detail-section">
              <h4>Stats de base</h4>
              <div className="stat-grid">
                {STAT_KEYS.map(stat => (
                  <div key={stat} className="stat-row">
                    <span className="stat-label">{stat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="stat-value">{selected[stat]}</span>
                      {selected.pointsStatsDisponibles > 0 && (
                        <button className="btn btn-sm btn-primary" onClick={() => allocateStat(stat)}
                          style={{ padding: '1px 6px', fontSize: 11 }}>+1</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selected.totalStats && (
              <div className="detail-section">
                <h4>Stats totales (base + race + equip)</h4>
                <div className="stat-grid">
                  {STAT_KEYS.map(stat => {
                    const base = selected[stat];
                    const total = selected.totalStats![stat];
                    const bonus = total - base;
                    return (
                      <div key={stat} className="stat-row">
                        <span className="stat-label">{stat}</span>
                        <span className="stat-value">
                          {total}
                          {bonus > 0 && <span className="stat-bonus">+{bonus}</span>}
                        </span>
                      </div>
                    );
                  })}
                  <div className="stat-row">
                    <span className="stat-label">PV Max</span>
                    <span className="stat-value">{selected.totalStats.pvMax}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">PA</span>
                    <span className="stat-value">{selected.totalStats.pa}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">PM</span>
                    <span className="stat-value">{selected.totalStats.pm}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">PO</span>
                    <span className="stat-value">{selected.totalStats.po}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Spells Section */}
          <h3 className="section-title">Sorts appris ({spells.length})</h3>
          {spells.length > 0 ? (
            <div className="sort-list">
              {spells.map(s => (
                <div key={s.id} className="sort-item">
                  <div>
                    <span className="sort-name">{s.nom}</span>
                    {s.description && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>{s.description}</span>
                    )}
                  </div>
                  <div className="sort-meta">
                    <span>{s.coutPA} PA</span>
                    <span>{s.degatsMin}-{s.degatsMax} dmg</span>
                    <span>{s.porteeMin}-{s.porteeMax} po</span>
                    {s.cooldown > 0 && <span>{s.cooldown} CD</span>}
                    {s.estSoin && <span style={{ color: 'var(--success)' }}>Soin</span>}
                    {s.estDispel && <span style={{ color: 'var(--info)' }}>Dispel</span>}
                    {s.estInvocation && <span style={{ color: 'var(--warning)' }}>Invoc.</span>}
                    {s.tauxEchec > 0 && <span style={{ color: 'var(--danger)' }}>Echec {Math.round(s.tauxEchec * 100)}%</span>}
                    {s.effets && s.effets.length > 0 && (
                      <span className="effect-badges">
                        {s.effets.map((e, i) => (
                          <span key={i} className={`effect-badge ${getEffetType(e) === 'BUFF' ? 'buff' : 'debuff'}`}>
                            {getEffetNom(e)}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun sort appris</div>
          )}

          {/* Equipment Section */}
          <h3 className="section-title">Equipement</h3>
          <div className="equipment-grid">
            {SLOTS.map(({ key: slot, label }) => {
              const equipped = getEquippedItem(slot);
              const available = getEquipmentForSlot(slot);
              return (
                <div key={slot} className="equip-slot">
                  <div className="slot-label">{label}</div>
                  {equipped ? (
                    <>
                      <div className="slot-item">{equipped.nom}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {[
                          equipped.bonusForce && `FOR +${equipped.bonusForce}`,
                          equipped.bonusIntelligence && `INT +${equipped.bonusIntelligence}`,
                          equipped.bonusDexterite && `DEX +${equipped.bonusDexterite}`,
                          equipped.bonusAgilite && `AGI +${equipped.bonusAgilite}`,
                          equipped.bonusVie && `VIE +${equipped.bonusVie}`,
                          equipped.bonusChance && `CHA +${equipped.bonusChance}`,
                          equipped.bonusPA && `PA +${equipped.bonusPA}`,
                          equipped.bonusPM && `PM +${equipped.bonusPM}`,
                          equipped.bonusPO && `PO +${equipped.bonusPO}`,
                        ].filter(Boolean).join(', ') || 'Aucun bonus'}
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleEquip(slot, null)}>Retirer</button>
                    </>
                  ) : (
                    <>
                      <div className="slot-empty">Vide</div>
                      {available.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={e => {
                            const eqId = Number(e.target.value);
                            if (eqId) handleEquip(slot, eqId);
                          }}
                        >
                          <option value="">-- Equiper --</option>
                          {available.map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.nom} (Niv. {eq.niveauMinimum})</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FormModal open={showCreate} title="Creer un personnage" fields={createFields}
        onSubmit={async (vals) => {
          await charactersApi.create(vals as { nom: string; joueurId: number; raceId: number });
          setShowCreate(false);
          refresh();
        }}
        onCancel={() => setShowCreate(false)} />
    </div>
  );
};

export default CharactersPage;
