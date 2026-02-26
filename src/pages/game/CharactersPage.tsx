import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { charactersApi, recipesApi } from '../../api/characters';
import { playersApi } from '../../api/players';
import { groupsApi } from '../../api/groups';
import { racesApi, equipmentApi } from '../../api/static';
import type { Character, Player, Race, Sort, Equipment, SlotType, InventoryState, Recette, MapType } from '../../types';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

// Normalize effect from either flat (combat) or nested (API) format
type EffetEntry = NonNullable<Sort['effets']>[number];
const getEffetType = (e: EffetEntry) => e.type || e.effet?.type || '';
function normalizeEffet(e: EffetEntry) {
  return {
    type: (e.type || e.effet?.type || '') as string,
    statCiblee: (e.statCiblee || e.effet?.statCiblee || '') as string,
    valeur: (e.valeur ?? e.effet?.valeur ?? 0) as number,
    valeurMin: (e.valeurMin ?? e.effet?.valeurMin ?? null) as number | null,
    duree: (e.duree ?? e.effet?.duree ?? 0) as number,
    chanceDeclenchement: (e.chanceDeclenchement ?? 1) as number,
  };
}
function formatEffetBadge(e: EffetEntry): string {
  const { type, statCiblee, valeur, valeurMin, duree, chanceDeclenchement } = normalizeEffet(e);
  const stat = STAT_ABBR[statCiblee] ?? statCiblee;
  const chance = chanceDeclenchement < 1 ? `${Math.round(chanceDeclenchement * 100)}% ` : '';
  switch (type) {
    case 'BUFF':     return `${chance}+${valeur} ${stat} (${duree}t)`;
    case 'DEBUFF':   return `${chance}${valeur} ${stat} (${duree}t)`;
    case 'POISON':   return `${chance}${valeurMin ?? 0}-${valeur}/t (${duree}t)`;
    case 'POUSSEE':  return `${chance}Pousse ${valeur}c`;
    case 'ATTIRANCE':return `${chance}Attire ${valeur}c`;
    case 'BOUCLIER':   return `${chance}Bouclier ${valeur} (${duree}t)`;
    case 'RESISTANCE': return `${chance}r${stat} ${valeur > 0 ? '+' : ''}${valeur}% (${duree}t)`;
    case 'DISPEL':     return 'Dispel';
    default:           return type;
  }
}

const STAT_COLORS: Record<string, string> = {
  FORCE: '#ef5350',
  INTELLIGENCE: '#42a5f5',
  DEXTERITE: '#ffca28',
  AGILITE: '#66bb6a',
  VIE: '#ec407a',
  CHANCE: '#ab47bc',
};
const STAT_ABBR: Record<string, string> = {
  FORCE: 'FOR', INTELLIGENCE: 'INT', DEXTERITE: 'DEX',
  AGILITE: 'AGI', VIE: 'VIE', CHANCE: 'CHA',
};
const ZONE_ABBR: Record<string, string> = {
  CASE: 'Case', CROIX: 'Croix', LIGNE: 'Ligne', CONE: 'Cône',
  CERCLE: 'Cercle', LIGNE_PERPENDICULAIRE: 'L.Perp', DIAGONALE: 'Diag',
  CARRE: 'Carré', ANNEAU: 'Anneau', CONE_INVERSE: 'Cône inv.',
};

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

interface CharactersPageProps {
  playerId?: number;
}

const CharactersPage: React.FC<CharactersPageProps> = ({ playerId: playerIdProp }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Support standalone route: playerId can come from prop (DashboardPage) or URL param
  const playerIdParam = searchParams.get('playerId');
  const playerId = playerIdProp ?? (playerIdParam ? Number(playerIdParam) : undefined);

  // When arriving from adventure, these params are set
  const groupId = searchParams.get('groupId');
  const charIdParam = searchParams.get('charId');
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
  const [recipes, setRecipes] = useState<Recette[]>([]);
  const [mapType, setMapType] = useState<MapType | null>(null);
  const [craftingId, setCraftingId] = useState<number | null>(null);
  const [craftMessage, setCraftMessage] = useState<string | null>(null);
  const [deleteResourceModal, setDeleteResourceModal] = useState<{
    ressourceId: number;
    nom: string;
    quantiteMax: number;
    quantite: number;
  } | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [chars, pls, rcs, eqs] = await Promise.all([
      playerId ? playersApi.getCharacters(playerId) : charactersApi.getAll(),
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

  useEffect(() => { refresh(); }, [playerId]);

  // Auto-select character from URL param (when coming from adventure)
  useEffect(() => {
    if (charIdParam && !loading) {
      selectChar(Number(charIdParam));
    }
  }, [charIdParam, loading]);

  // Fetch group map type for context display
  useEffect(() => {
    if (!groupId) { setMapType(null); return; }
    groupsApi.getById(Number(groupId)).then(g => {
      setMapType(g.map?.type ?? null);
    }).catch(() => setMapType(null));
  }, [groupId]);

  // Always load recipes (craft accessible depuis la fiche, hors aventure aussi)
  useEffect(() => {
    recipesApi.getAll().then(setRecipes).catch(() => setRecipes([]));
  }, []);

  // Craft always available from character sheet; in adventure it's restricted to VILLE/SAFE
  const canCraftInTown = !groupId || mapType === 'VILLE' || mapType === 'SAFE';

  const handleCraft = async (recetteId: number) => {
    if (!selected) return;
    setCraftingId(recetteId);
    setCraftMessage(null);
    try {
      await charactersApi.craft(selected.id, recetteId);
      setCraftMessage('Craft reussi !');
      await selectChar(selected.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du craft';
      setCraftMessage(msg);
    } finally {
      setCraftingId(null);
    }
  };

  const checkRecipeCanCraft = (recipe: Recette): boolean => {
    if (!selected || !inventory) return false;
    if (selected.niveau < recipe.niveauMinimum) return false;
    if (inventory.or < recipe.coutOr) return false;
    // Check ingredients
    if (recipe.ingredients) {
      for (const ing of recipe.ingredients) {
        const owned = inventory.ressources.find(r => r.ressourceId === ing.ressourceId);
        if (!owned || owned.quantite < ing.quantite) return false;
      }
    }
    // Check weight (approximate: equipment poids)
    if (recipe.equipement) {
      const newWeight = inventory.poidsActuel + recipe.equipement.poids;
      if (newWeight > inventory.poidsMax) return false;
    }
    return true;
  };

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
      options: players.map(p => ({ value: p.id, label: p.nom })),
      ...(playerId ? { defaultValue: playerId } : {}) },
    { name: 'raceId', label: 'Race', type: 'select', required: true,
      options: races.map(r => ({ value: r.id, label: r.nom })) },
  ];

  const allocateStat = async (stat: string) => {
    if (!selected || selected.pointsStatsDisponibles <= 0) return;
    await charactersApi.allocateStats(selected.id, { [stat]: 1 });
    selectChar(selected.id);
  };

  // Template data (weapon damage, portée, etc.)
  const getEquippedTemplate = (slot: SlotType): Equipment | undefined => {
    if (!selected) return undefined;
    const eqId = selected.equipements[slot];
    if (!eqId) return undefined;
    return allEquipment.find(e => e.id === eqId);
  };

  // Rolled instance (bonus stats effectifs depuis l'inventaire)
  const getEquippedInstance = (slot: SlotType) =>
    inventory?.items.find(i => i.estEquipe && i.slot === slot);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Personnages</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {groupId && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/game/adventure?groupId=${groupId}`)}
            >
              ← Retour à l'aventure
            </button>
          )}
          {!groupId && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Creer</button>
          )}
        </div>
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
            Race: {selected.race?.nom} | XP: {selected.experience} / {selected.niveau * selected.niveau * 50} | Points disponibles: {selected.pointsStatsDisponibles}
          </p>

          {/* Stats Section */}
          <h3 className="section-title">Stats</h3>
          <div className="detail-sections">
            <div className="detail-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h4 style={{ margin: 0 }}>Stats de base</h4>
                {(selected.force > 10 || selected.intelligence > 10 || selected.dexterite > 10 ||
                  selected.agilite > 10 || selected.vie > 10 || selected.chance > 10) && (
                  <button
                    className="btn btn-sm btn-warning"
                    style={{ fontSize: 11 }}
                    onClick={async () => {
                      if (!confirm('Réinitialiser toutes les stats à 10 et récupérer les points ?')) return;
                      await charactersApi.resetStats(selected.id);
                      selectChar(selected.id);
                    }}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
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
                  {(selected.totalStats.resistanceForce > 0 || selected.totalStats.resistanceIntelligence > 0 ||
                    selected.totalStats.resistanceDexterite > 0 || selected.totalStats.resistanceAgilite > 0) && (
                    <>
                      <div className="stat-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                        <span className="stat-label" style={{ fontStyle: 'italic', gridColumn: '1/-1' }}>Résistances</span>
                      </div>
                      {([
                        ['rFOR', selected.totalStats.resistanceForce],
                        ['rINT', selected.totalStats.resistanceIntelligence],
                        ['rDEX', selected.totalStats.resistanceDexterite],
                        ['rAGI', selected.totalStats.resistanceAgilite],
                      ] as [string, number][])
                        .filter(([, v]) => v > 0)
                        .map(([label, val]) => (
                          <div key={label} className="stat-row">
                            <span className="stat-label">{label}</span>
                            <span className="stat-value">
                              {val}%
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
                                réd.
                              </span>
                            </span>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Spells Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Sorts appris ({spells.length})</h3>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={async () => {
                if (!selected) return;
                const res = await charactersApi.syncSpells(selected.id);
                if (res.sorts.length > 0) {
                  const names = res.sorts.map(s => s.nom).join(', ');
                  setCraftMessage(`Sorts appris : ${names}`);
                } else {
                  setCraftMessage('Aucun nouveau sort.');
                }
                const updatedSpells = await charactersApi.getSpells(selected.id);
                setSpells(updatedSpells);
              }}
            >
              Sync sorts
            </button>
          </div>
          {spells.length > 0 ? (
            <div className="sort-list">
              {spells.map(s => {
                const statColor = STAT_COLORS[s.statUtilisee] ?? 'var(--text-muted)';
                const statAbbr = STAT_ABBR[s.statUtilisee] ?? s.statUtilisee;
                const zoneLabel = s.zone ? `${ZONE_ABBR[s.zone.type] ?? s.zone.type}${s.zone.taille > 1 ? ` ${s.zone.taille}` : ''}` : null;
                const showCrit = !s.estSoin && !s.estInvocation && s.chanceCritBase > 0;
                return (
                  <div key={s.id} className="sort-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="sort-name">{s.nom}</span>
                      <span style={{ background: statColor, color: '#000', fontSize: 11, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>
                        {statAbbr}
                      </span>
                      {s.estGlyphe && <span style={{ background: '#7e57c2', color: '#fff', fontSize: 11, padding: '1px 5px', borderRadius: 3 }}>Glyphe</span>}
                      {s.estPiege && <span style={{ background: '#8d6e63', color: '#fff', fontSize: 11, padding: '1px 5px', borderRadius: 3 }}>Piège</span>}
                      {s.estTeleportation && <span style={{ background: '#00acc1', color: '#fff', fontSize: 11, padding: '1px 5px', borderRadius: 3 }}>Téléport</span>}
                      {s.ligneDirecte && <span style={{ background: 'var(--border)', color: 'var(--text)', fontSize: 11, padding: '1px 5px', borderRadius: 3 }}>Ligne</span>}
                      {s.description && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.description}</span>
                      )}
                    </div>
                    <div className="sort-meta">
                      <span>{s.coutPA} PA</span>
                      {!s.estInvocation && <span>{s.degatsMin}-{s.degatsMax} {s.estSoin ? 'soin' : 'dmg'}</span>}
                      {showCrit && <span style={{ color: '#ffca28' }}>crit {Math.round(s.chanceCritBase * 100)}% ({s.degatsCritMin}-{s.degatsCritMax})</span>}
                      <span>{s.porteeMin}-{s.porteeMax} po</span>
                      {zoneLabel && zoneLabel !== 'Case' && <span style={{ color: 'var(--info)' }}>{zoneLabel}</span>}
                      {s.cooldown > 0 && <span>{s.cooldown} CD</span>}
                      {s.estSoin && <span style={{ color: 'var(--success)' }}>Soin</span>}
                      {s.estInvocation && <span style={{ color: 'var(--warning)' }}>Invoc.</span>}
                      {s.estVolDeVie && <span style={{ color: '#00c853' }}>Vol de vie</span>}
                      {s.tauxEchec > 0 && <span style={{ color: 'var(--danger)' }}>Echec {Math.round(s.tauxEchec * 100)}%</span>}
                      {s.effets && s.effets.length > 0 && (
                        <span className="effect-badges">
                          {s.effets.map((e, i) => (
                            <span key={i} className={`effect-badge ${getEffetType(e) === 'BUFF' ? 'buff' : getEffetType(e) === 'POISON' ? 'poison' : (getEffetType(e) === 'POUSSEE' || getEffetType(e) === 'ATTIRANCE') ? 'movement' : getEffetType(e) === 'DISPEL' ? 'dispel' : (getEffetType(e) === 'BOUCLIER' || (getEffetType(e) === 'RESISTANCE' && (normalizeEffet(e).valeur ?? 0) > 0)) ? 'buff' : 'debuff'}`}>
                              {formatEffetBadge(e)}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun sort appris</div>
          )}

          {/* Equipment Section (legacy slots) */}
          <h3 className="section-title">Equipement (slots)</h3>
          <div className="equipment-grid">
            {SLOTS.map(({ key: slot, label }) => {
              const tmpl = getEquippedTemplate(slot);   // template : dégâts, portée
              const inst = getEquippedInstance(slot);   // instance : stats rollées
              const itemName = inst?.nom ?? tmpl?.nom;
              return (
                <div key={slot} className="equip-slot">
                  <div className="slot-label">{label}</div>
                  {itemName ? (
                    <>
                      <div className="slot-item">{itemName}</div>
                      {/* Stats rollées de l'instance */}
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {inst ? [
                          inst.bonusForce > 0 && `FOR +${inst.bonusForce}`,
                          inst.bonusIntelligence > 0 && `INT +${inst.bonusIntelligence}`,
                          inst.bonusDexterite > 0 && `DEX +${inst.bonusDexterite}`,
                          inst.bonusAgilite > 0 && `AGI +${inst.bonusAgilite}`,
                          inst.bonusVie > 0 && `VIE +${inst.bonusVie}`,
                          inst.bonusChance > 0 && `CHA +${inst.bonusChance}`,
                          inst.bonusPA > 0 && `PA +${inst.bonusPA}`,
                          inst.bonusPM > 0 && `PM +${inst.bonusPM}`,
                          inst.bonusPO > 0 && `PO +${inst.bonusPO}`,
                          inst.bonusCritique > 0 && `CRI +${inst.bonusCritique}%`,
                          inst.resistanceForce > 0 && `rFOR +${inst.resistanceForce}`,
                          inst.resistanceIntelligence > 0 && `rINT +${inst.resistanceIntelligence}`,
                          inst.resistanceDexterite > 0 && `rDEX +${inst.resistanceDexterite}`,
                          inst.resistanceAgilite > 0 && `rAGI +${inst.resistanceAgilite}`,
                        ].filter(Boolean).join(', ') || 'Aucun bonus stats'
                        : 'Aucun bonus stats'}
                      </div>
                      {/* Dégâts et caractéristiques d'arme (depuis le template) */}
                      {tmpl && slot === 'ARME' && (
                        <div style={{ fontSize: 10, color: 'var(--accent, #90caf9)', marginTop: 2 }}>
                          {tmpl.degatsMin != null && tmpl.degatsMax != null && (
                            <span>{tmpl.degatsMin}-{tmpl.degatsMax} dmg</span>
                          )}
                          {tmpl.degatsCritMin != null && tmpl.degatsCritMax != null && (
                            <span style={{ marginLeft: 6 }}>({tmpl.degatsCritMin}-{tmpl.degatsCritMax} crit)</span>
                          )}
                          {tmpl.coutPA != null && <span style={{ marginLeft: 6 }}>{tmpl.coutPA} PA</span>}
                          {tmpl.porteeMin != null && tmpl.porteeMax != null && (
                            <span style={{ marginLeft: 6 }}>{tmpl.porteeMin}-{tmpl.porteeMax} po</span>
                          )}
                          {tmpl.statUtilisee && <span style={{ marginLeft: 6 }}>{tmpl.statUtilisee}</span>}
                          {tmpl.cooldown != null && tmpl.cooldown > 0 && <span style={{ marginLeft: 6 }}>CD {tmpl.cooldown}</span>}
                        </div>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => handleUnequipItem(slot)}>Retirer</button>
                    </>
                  ) : (
                    <div className="slot-empty">Vide</div>
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
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteResourceModal({
                          ressourceId: res.ressourceId,
                          nom: res.nom,
                          quantiteMax: res.quantite,
                          quantite: res.quantite,
                        })}>Suppr.</button>
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

          {/* Craft Section — only in VILLE/SAFE */}
          {canCraftInTown && inventory && recipes.length > 0 && (
            <>
              <h3 className="section-title">Craft</h3>
              {craftMessage && (
                <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 4, fontSize: 13,
                  background: craftMessage === 'Craft reussi !' ? 'var(--success)' : 'var(--danger)',
                  color: '#fff' }}>
                  {craftMessage}
                </div>
              )}
              <div className="sort-list">
                {recipes.map(recipe => {
                  const canCraft = checkRecipeCanCraft(recipe);
                  const levelOk = selected ? selected.niveau >= recipe.niveauMinimum : false;
                  const orOk = inventory.or >= recipe.coutOr;
                  return (
                    <div key={recipe.id} className="sort-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span className="sort-name">{recipe.nom}</span>
                          {recipe.equipement && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                              ({recipe.equipement.nom} - {recipe.equipement.slot})
                            </span>
                          )}
                        </div>
                        <div className="sort-meta">
                          <span style={{ color: levelOk ? 'var(--success)' : 'var(--danger)' }}>
                            Niv. {recipe.niveauMinimum}
                          </span>
                          <span style={{ color: orOk ? 'var(--success)' : 'var(--danger)' }}>
                            {recipe.coutOr} or
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {recipe.ingredients?.map(ing => {
                            const owned = inventory.ressources.find(r => r.ressourceId === ing.ressourceId);
                            const ownedQty = owned?.quantite ?? 0;
                            const hasEnough = ownedQty >= ing.quantite;
                            return (
                              <span key={ing.id} style={{ fontSize: 12, color: hasEnough ? 'var(--success)' : 'var(--danger)' }}>
                                {ing.quantite}x {ing.ressource?.nom ?? `Res#${ing.ressourceId}`}
                                {!hasEnough && ` (${ownedQty}/${ing.quantite})`}
                              </span>
                            );
                          })}
                        </div>
                        <button
                          className={`btn btn-sm ${canCraft ? 'btn-primary' : 'btn-secondary'}`}
                          disabled={!canCraft || craftingId === recipe.id}
                          onClick={() => handleCraft(recipe.id)}
                        >
                          {craftingId === recipe.id ? 'Craft...' : 'Crafter'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete resource modal */}
      {deleteResourceModal && (
        <div className="modal-overlay" onClick={() => setDeleteResourceModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Supprimer {deleteResourceModal.nom}</h3>
              <button className="modal-close" onClick={() => setDeleteResourceModal(null)}>X</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 8 }}>Quantite disponible : {deleteResourceModal.quantiteMax}</p>
              <label>Quantite a supprimer</label>
              <input
                type="number"
                min={1}
                max={deleteResourceModal.quantiteMax}
                value={deleteResourceModal.quantite}
                onChange={e => setDeleteResourceModal({
                  ...deleteResourceModal,
                  quantite: Math.min(deleteResourceModal.quantiteMax, Math.max(1, parseInt(e.target.value) || 1)),
                })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteResourceModal(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={async () => {
                await handleDestroyResource(deleteResourceModal.ressourceId, deleteResourceModal.quantite);
                setDeleteResourceModal(null);
              }}>Supprimer</button>
            </div>
          </div>
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
