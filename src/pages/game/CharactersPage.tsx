import React, { useState, useEffect } from 'react';
import { charactersApi } from '../../api/characters';
import { playersApi } from '../../api/players';
import { racesApi, equipmentApi } from '../../api/static';
import type { Character, Player, Race, Sort, Equipment, SlotType, InventoryState } from '../../types';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
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
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [deletingItem, setDeletingItem] = useState<number | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTarget, setSendTarget] = useState<number>(0);
  const [sendOr, setSendOr] = useState<number>(0);
  const [sendItems, setSendItems] = useState<number[]>([]);
  const [sendResources, setSendResources] = useState<Record<number, number>>({});
  const [sendError, setSendError] = useState<string | null>(null);

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
    const [c, s, inv] = await Promise.all([
      charactersApi.getById(id),
      charactersApi.getSpells(id),
      charactersApi.getInventory(id).catch(() => null),
    ]);
    setSelected(c);
    setSpells(s as Sort[]);
    setInventory(inv);
  };

  const handleEquipItem = async (itemId: number) => {
    if (!selected) return;
    await charactersApi.equipItem(selected.id, itemId);
    selectChar(selected.id);
  };

  const handleUnequipItem = async (slot: SlotType) => {
    if (!selected) return;
    await charactersApi.unequipItem(selected.id, slot);
    selectChar(selected.id);
  };

  const handleDestroyItem = async (itemId: number) => {
    if (!selected) return;
    await charactersApi.destroyItem(selected.id, itemId);
    selectChar(selected.id);
  };

  const handleDestroyResource = async (resId: number, qty: number) => {
    if (!selected) return;
    await charactersApi.destroyResource(selected.id, resId, qty);
    selectChar(selected.id);
  };

  const handleSend = async () => {
    if (!selected || !sendTarget) return;
    setSendError(null);
    try {
      const body: { destinataireId: number; or?: number; ressources?: { ressourceId: number; quantite: number }[]; items?: number[] } = {
        destinataireId: sendTarget,
      };
      if (sendOr > 0) body.or = sendOr;
      const resList = Object.entries(sendResources)
        .filter(([, qty]) => qty > 0)
        .map(([resId, qty]) => ({ ressourceId: Number(resId), quantite: qty }));
      if (resList.length > 0) body.ressources = resList;
      if (sendItems.length > 0) body.items = sendItems;
      await charactersApi.sendToCharacter(selected.id, body);
      setShowSendModal(false);
      setSendOr(0);
      setSendItems([]);
      setSendResources({});
      selectChar(selected.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
      setSendError(msg);
    }
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
                  <div className="stat-row">
                    <span className="stat-label">Critique</span>
                    <span className="stat-value">{selected.totalStats.bonusCritique}%</span>
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
                    {s.estVolDeVie && <span style={{ color: '#00c853' }}>Vol de vie</span>}
                    {s.tauxEchec > 0 && <span style={{ color: 'var(--danger)' }}>Echec {Math.round(s.tauxEchec * 100)}%</span>}
                    {s.effets && s.effets.length > 0 && (
                      <span className="effect-badges">
                        {s.effets.map((e, i) => (
                          <span key={i} className={`effect-badge ${getEffetType(e) === 'BUFF' ? 'buff' : getEffetType(e) === 'POISON' ? 'poison' : (getEffetType(e) === 'POUSSEE' || getEffetType(e) === 'ATTIRANCE') ? 'movement' : getEffetType(e) === 'DISPEL' ? 'dispel' : 'debuff'}`}>
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

          {/* Equipment Section (legacy slots) */}
          <h3 className="section-title">Equipement (slots)</h3>
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
                          equipped.bonusCritique && `CRI +${equipped.bonusCritique}%`,
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

          {/* Inventory Section */}
          {inventory && (
            <>
              <h3 className="section-title">Inventaire</h3>
              <div className="inventory-header">
                <span className="inventory-or">Or: {inventory.or}</span>
                <span className="inventory-weight">
                  Poids: {inventory.poidsActuel}/{inventory.poidsMax}
                </span>
                <div className="weight-bar">
                  <div className="weight-bar-fill" style={{ width: `${Math.min(100, (inventory.poidsActuel / inventory.poidsMax) * 100)}%` }} />
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => { setShowSendModal(true); setSendError(null); setSendOr(0); setSendItems([]); setSendResources({}); setSendTarget(0); }}>
                  Envoyer
                </button>
              </div>

              {/* Items */}
              {inventory.items.length > 0 && (
                <div className="detail-section" style={{ marginTop: 12 }}>
                  <h4>Items ({inventory.items.length})</h4>
                  <div className="sort-list">
                    {inventory.items.map(item => (
                      <div key={item.id} className="sort-item">
                        <div>
                          <span className="sort-name" style={item.estEquipe ? { color: 'var(--info)' } : undefined}>
                            {item.nom} {item.estEquipe && '(equipe)'}
                          </span>
                          <span className="sort-meta">
                            <span>{item.slot}</span>
                            <span>{item.poids}kg</span>
                            {item.bonusForce > 0 && <span>FOR +{item.bonusForce}</span>}
                            {item.bonusIntelligence > 0 && <span>INT +{item.bonusIntelligence}</span>}
                            {item.bonusDexterite > 0 && <span>DEX +{item.bonusDexterite}</span>}
                            {item.bonusAgilite > 0 && <span>AGI +{item.bonusAgilite}</span>}
                            {item.bonusVie > 0 && <span>VIE +{item.bonusVie}</span>}
                            {item.bonusChance > 0 && <span>CHA +{item.bonusChance}</span>}
                            {item.bonusPA > 0 && <span>PA +{item.bonusPA}</span>}
                            {item.bonusPM > 0 && <span>PM +{item.bonusPM}</span>}
                            {item.bonusPO > 0 && <span>PO +{item.bonusPO}</span>}
                            {item.bonusCritique > 0 && <span>CRI +{item.bonusCritique}%</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!item.estEquipe && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleEquipItem(item.id)}>Equiper</button>
                          )}
                          {item.estEquipe && (
                            <button className="btn btn-sm btn-warning" onClick={() => handleUnequipItem(item.slot as SlotType)}>Retirer</button>
                          )}
                          {!item.estEquipe && (
                            <button className="btn btn-sm btn-danger" onClick={() => setDeletingItem(item.id)}>Suppr.</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              {inventory.ressources.length > 0 && (
                <div className="detail-section" style={{ marginTop: 12 }}>
                  <h4>Ressources ({inventory.ressources.length})</h4>
                  <div className="sort-list">
                    {inventory.ressources.map(res => (
                      <div key={res.ressourceId} className="sort-item">
                        <div>
                          <span className="sort-name">{res.nom}</span>
                          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                            x{res.quantite} ({res.poids * res.quantite}kg)
                          </span>
                        </div>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDestroyResource(res.ressourceId, res.quantite)}>Suppr.</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Set Bonuses */}
              {inventory.setBonuses && inventory.setBonuses.length > 0 && (
                <div className="detail-section" style={{ marginTop: 12 }}>
                  <h4>Bonus de panoplie</h4>
                  <div className="sort-list">
                    {inventory.setBonuses.map(sb => (
                      <div key={sb.panoplieId} className="sort-item">
                        <div>
                          <span className="sort-name">{sb.nom} ({sb.piecesEquipees} pieces)</span>
                          <span className="sort-meta">
                            {sb.bonusForce > 0 && <span>FOR +{sb.bonusForce}</span>}
                            {sb.bonusIntelligence > 0 && <span>INT +{sb.bonusIntelligence}</span>}
                            {sb.bonusDexterite > 0 && <span>DEX +{sb.bonusDexterite}</span>}
                            {sb.bonusAgilite > 0 && <span>AGI +{sb.bonusAgilite}</span>}
                            {sb.bonusVie > 0 && <span>VIE +{sb.bonusVie}</span>}
                            {sb.bonusChance > 0 && <span>CHA +{sb.bonusChance}</span>}
                            {sb.bonusPA > 0 && <span>PA +{sb.bonusPA}</span>}
                            {sb.bonusPM > 0 && <span>PM +{sb.bonusPM}</span>}
                            {sb.bonusPO > 0 && <span>PO +{sb.bonusPO}</span>}
                            {sb.bonusCritique > 0 && <span>CRI +{sb.bonusCritique}%</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete item confirm */}
      <ConfirmDialog
        open={!!deletingItem}
        message="Supprimer cet item ?"
        onConfirm={async () => { if (deletingItem) await handleDestroyItem(deletingItem); setDeletingItem(null); }}
        onCancel={() => setDeletingItem(null)}
      />

      {/* Send Modal */}
      {showSendModal && selected && inventory && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Envoyer depuis {selected.nom}</h3>
              <button className="modal-close" onClick={() => setShowSendModal(false)}>X</button>
            </div>
            <div className="modal-body">
              {sendError && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{sendError}</div>}

              <label>Destinataire</label>
              <select value={sendTarget} onChange={e => setSendTarget(Number(e.target.value))} style={{ width: '100%', marginBottom: 12 }}>
                <option value={0}>-- Choisir --</option>
                {characters.filter(c => c.id !== selected.id).map(c => (
                  <option key={c.id} value={c.id}>{c.nom} (Niv. {c.niveau})</option>
                ))}
              </select>

              <label>Or (disponible: {inventory.or})</label>
              <input type="number" value={sendOr} onChange={e => setSendOr(Number(e.target.value))} min={0} max={inventory.or} style={{ width: '100%', marginBottom: 12 }} />

              {inventory.items.filter(i => !i.estEquipe).length > 0 && (
                <>
                  <label>Items</label>
                  <div style={{ marginBottom: 12, maxHeight: 120, overflowY: 'auto' }}>
                    {inventory.items.filter(i => !i.estEquipe).map(item => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
                        <input type="checkbox" checked={sendItems.includes(item.id)}
                          onChange={e => setSendItems(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id))} />
                        {item.nom} ({item.slot})
                      </label>
                    ))}
                  </div>
                </>
              )}

              {inventory.ressources.length > 0 && (
                <>
                  <label>Ressources</label>
                  <div style={{ marginBottom: 12 }}>
                    {inventory.ressources.map(res => (
                      <div key={res.ressourceId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, flex: 1 }}>{res.nom} (x{res.quantite})</span>
                        <input type="number" min={0} max={res.quantite}
                          value={sendResources[res.ressourceId] || 0}
                          onChange={e => setSendResources(prev => ({ ...prev, [res.ressourceId]: Number(e.target.value) }))}
                          style={{ width: 60 }} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSendModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSend} disabled={!sendTarget}>Envoyer</button>
            </div>
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
