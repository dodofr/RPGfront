import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { sortsApi, racesApi, zonesApi, effetsApi } from '../../api/static';
import { monstresApi } from '../../api/maps';
import type { Sort, Race, Zone, Effet, MonsterTemplate } from '../../types';
import '../../styles/admin.css';

// Normalize effect from either flat (combat) or nested (API) format
const getEffetNom = (e: NonNullable<Sort['effets']>[number]) => e.nom || e.effet?.nom || '';
const getEffetType = (e: NonNullable<Sort['effets']>[number]) => e.type || e.effet?.type || '';
const getEffetStat = (e: NonNullable<Sort['effets']>[number]) => e.statCiblee || e.effet?.statCiblee || '';
const getEffetValeur = (e: NonNullable<Sort['effets']>[number]) => e.valeur ?? e.effet?.valeur ?? 0;
const getEffetValeurMin = (e: NonNullable<Sort['effets']>[number]) => e.valeurMin ?? e.effet?.valeurMin ?? null;
const getEffetDuree = (e: NonNullable<Sort['effets']>[number]) => e.duree ?? e.effet?.duree ?? 0;
const getEffetId = (e: NonNullable<Sort['effets']>[number]) => e.effetId || e.effet?.id || 0;

type TabFilter = 'all' | 'race' | 'monstre' | 'invocation';

const SortsPage: React.FC = () => {
  const { items, loading, create, update, remove, refresh } = useCrud(sortsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sort | null>(null);
  const [deleting, setDeleting] = useState<Sort | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [allEffets, setAllEffets] = useState<Effet[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedSort, setSelectedSort] = useState<Sort | null>(null);
  const [addEffetId, setAddEffetId] = useState<number>(0);
  const [addChance, setAddChance] = useState<number>(100);
  const [addSurCible, setAddSurCible] = useState<boolean>(true);
  const [monstres, setMonstres] = useState<MonsterTemplate[]>([]);

  useEffect(() => {
    racesApi.getAll().then(setRaces);
    zonesApi.getAll().then(setZones);
    effetsApi.getAll().then(setAllEffets);
    monstresApi.getAll().then(setMonstres);
  }, []);

  const filteredItems = items.filter(sort => {
    switch (activeTab) {
      case 'race': return sort.raceId !== null;
      case 'monstre': return sort.raceId === null && !sort.estInvocation;
      case 'invocation': return sort.estInvocation;
      default: return true;
    }
  });

  // Group race sorts by race name for display
  const getRaceGroup = (sort: Sort): string => {
    if (!sort.race) return '';
    return sort.race.nom;
  };

  const sortedItems = activeTab === 'race'
    ? [...filteredItems].sort((a, b) => getRaceGroup(a).localeCompare(getRaceGroup(b)))
    : filteredItems;

  const selectSort = async (id: number) => {
    const detail = await sortsApi.getById(id);
    setSelectedSort(detail);
  };

  const handleAddEffect = async () => {
    if (!selectedSort || !addEffetId) return;
    await sortsApi.addEffect(selectedSort.id, {
      effetId: addEffetId,
      chanceDeclenchement: addChance / 100,
      surCible: addSurCible,
    });
    await selectSort(selectedSort.id);
    refresh();
  };

  const handleRemoveEffect = async (effetId: number) => {
    if (!selectedSort) return;
    await sortsApi.removeEffect(selectedSort.id, effetId);
    await selectSort(selectedSort.id);
    refresh();
  };

  const columns: Column<Sort>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'statUtilisee', header: 'Stat' },
    { key: 'coutPA', header: 'PA' },
    {
      key: 'degats',
      header: 'Degats',
      render: (item) => `${item.degatsMin}-${item.degatsMax}`,
    },
    {
      key: 'portee',
      header: 'Portee',
      render: (item) => `${item.porteeMin}-${item.porteeMax}`,
    },
    {
      key: 'flags',
      header: 'Type',
      render: (item) => {
        const flags: string[] = [];
        if (item.estSoin) flags.push('Soin');
        if (item.estDispel) flags.push('Dispel');
        if (item.estInvocation) flags.push('Invoc.');
        if (item.estVolDeVie) flags.push('Vol de vie');
        if (item.estGlyphe) flags.push('Glyphe');
        if (item.estPiege) flags.push('Piège');
        if (item.porteeModifiable === false) flags.push('PO fixe');
        if (item.tauxEchec > 0) flags.push(`Echec ${Math.round(item.tauxEchec * 100)}%`);
        return flags.join(', ') || '-';
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (item) => item.description || '-',
    },
    {
      key: 'effets',
      header: 'Effets',
      render: (item) => {
        if (!item.effets || item.effets.length === 0) return '-';
        return (
          <div className="effect-badges">
            {item.effets.map((e, i) => {
              const type = getEffetType(e);
              const badgeClass = type === 'DISPEL' ? 'dispel' : type === 'BUFF' ? 'buff' : type === 'POISON' ? 'poison' : (type === 'POUSSEE' || type === 'ATTIRANCE') ? 'movement' : 'debuff';
              const valMin = getEffetValeurMin(e);
              const valDisplay = type === 'POISON' && valMin != null ? `${valMin}-${getEffetValeur(e)} dgts/tour` : `${getEffetValeur(e) > 0 ? '+' : ''}${getEffetValeur(e)} ${getEffetStat(e)}`;
              return (
                <span key={i} className={`effect-badge ${badgeClass}`}>
                  {getEffetNom(e)} ({valDisplay}, {getEffetDuree(e)}t, {Math.round(e.chanceDeclenchement * 100)}%)
                </span>
              );
            })}
          </div>
        );
      },
    },
    { key: 'niveauApprentissage', header: 'Niveau' },
    {
      key: 'race',
      header: 'Race',
      render: (item) => item.race?.nom ?? '-',
    },
    { key: 'cooldown', header: 'CD' },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'ARME', label: 'Arme' },
        { value: 'SORT', label: 'Sort' },
      ],
      defaultValue: 'SORT',
    },
    {
      name: 'statUtilisee',
      label: 'Stat utilisee',
      type: 'select',
      options: [
        { value: 'FORCE', label: 'Force' },
        { value: 'INTELLIGENCE', label: 'Intelligence' },
        { value: 'DEXTERITE', label: 'Dexterite' },
        { value: 'AGILITE', label: 'Agilite' },
        { value: 'VIE', label: 'Vie' },
        { value: 'CHANCE', label: 'Chance' },
      ],
      defaultValue: 'INTELLIGENCE',
    },
    { name: 'coutPA', label: 'Cout PA', type: 'number', defaultValue: 3, min: 0 },
    { name: 'porteeMin', label: 'Portee min', type: 'number', defaultValue: 1, min: 0 },
    { name: 'porteeMax', label: 'Portee max', type: 'number', defaultValue: 5, min: 0 },
    { name: 'ligneDeVue', label: 'Ligne de vue', type: 'checkbox', defaultValue: true },
    { name: 'degatsMin', label: 'Degats min', type: 'number', defaultValue: 0, min: 0 },
    { name: 'degatsMax', label: 'Degats max', type: 'number', defaultValue: 0, min: 0 },
    { name: 'degatsCritMin', label: 'Degats crit min', type: 'number', defaultValue: 0, min: 0 },
    { name: 'degatsCritMax', label: 'Degats crit max', type: 'number', defaultValue: 0, min: 0 },
    { name: 'chanceCritBase', label: 'Chance crit base', type: 'float', defaultValue: 0.01, step: 0.01 },
    { name: 'cooldown', label: 'Cooldown', type: 'number', defaultValue: 0, min: 0 },
    { name: 'estSoin', label: 'Est soin', type: 'checkbox', defaultValue: false },
    { name: 'estDispel', label: 'Est dispel', type: 'checkbox', defaultValue: false },
    { name: 'estInvocation', label: 'Est invocation', type: 'checkbox', defaultValue: false },
    { name: 'estVolDeVie', label: 'Vol de vie', type: 'checkbox', defaultValue: false },
    { name: 'porteeModifiable', label: 'Portée modifiable par buffs/équipement', type: 'checkbox', defaultValue: true },
    { name: 'estGlyphe', label: 'Pose un glyphe (zone visible, déclenche au tour)', type: 'checkbox', defaultValue: false },
    { name: 'estPiege', label: 'Pose un piège (caché, déclenche au passage)', type: 'checkbox', defaultValue: false },
    { name: 'poseDuree', label: 'Durée de la zone (tours)', type: 'number', defaultValue: 3, min: 1, showIf: (v) => v.estGlyphe === true || v.estPiege === true },
    { name: 'tauxEchec', label: 'Taux echec', type: 'float', defaultValue: 0, step: 0.01 },
    { name: 'niveauApprentissage', label: 'Niveau apprentissage', type: 'number', defaultValue: 1, min: 1 },
    {
      name: 'raceId',
      label: 'Race',
      type: 'select',
      options: races.map(r => ({ value: r.id, label: r.nom })),
    },
    {
      name: 'zoneId',
      label: 'Zone',
      type: 'select',
      options: zones.map(z => ({ value: z.id, label: `${z.nom} (${z.type})` })),
    },
    {
      name: 'invocationTemplateId',
      label: 'Template invocation',
      type: 'select',
      options: monstres.map(m => ({ value: m.id, label: `${m.nom} (ID ${m.id})` })),
      showIf: (v) => v.estInvocation === true,
    },
  ];

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: items.length },
    { key: 'race', label: 'Sorts de race', count: items.filter(s => s.raceId !== null).length },
    { key: 'monstre', label: 'Sorts de monstre', count: items.filter(s => s.raceId === null && !s.estInvocation).length },
    { key: 'invocation', label: 'Invocations', count: items.filter(s => s.estInvocation).length },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Sorts</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Creer
        </button>
      </div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setSelectedSort(null); }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={sortedItems}
        loading={loading}
        onEdit={item => { setEditing(item); setShowForm(true); }}
        onDelete={item => setDeleting(item)}
        onRowClick={item => selectSort(item.id)}
        selectedId={selectedSort?.id}
      />

      {selectedSort && (
        <div className="detail-panel">
          <h3>
            {selectedSort.nom}
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedSort(null)}>Fermer</button>
          </h3>
          <div className="detail-sections">
            <div className="detail-section">
              <h4>Proprietes</h4>
              <div className="stat-grid">
                {([
                  ['Type', selectedSort.type],
                  ['Stat', selectedSort.statUtilisee],
                  ['Cout PA', selectedSort.coutPA],
                  ['Portee', `${selectedSort.porteeMin}-${selectedSort.porteeMax}`],
                  ['Degats', `${selectedSort.degatsMin}-${selectedSort.degatsMax}`],
                  ['Crit', `${selectedSort.degatsCritMin}-${selectedSort.degatsCritMax}`],
                  ['Cooldown', selectedSort.cooldown],
                  ['Niveau', selectedSort.niveauApprentissage],
                ] as [string, string | number][]).map(([label, val]) => (
                  <div key={label} className="stat-row">
                    <span className="stat-label">{label}</span>
                    <span className="stat-value">{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedSort.estSoin && <span className="badge badge-success">Soin</span>}
                {selectedSort.estDispel && <span className="badge badge-dispel">Dispel</span>}
                {selectedSort.estInvocation && <span className="badge badge-warning">Invocation</span>}
                {selectedSort.estVolDeVie && <span className="badge badge-poison">Vol de vie</span>}
                {selectedSort.estGlyphe && <span className="badge badge-warning">Glyphe{selectedSort.poseDuree ? ` (${selectedSort.poseDuree}t)` : ''}</span>}
                {selectedSort.estPiege && <span className="badge badge-secondary">Piège{selectedSort.poseDuree ? ` (${selectedSort.poseDuree}t)` : ''}</span>}
                {selectedSort.porteeModifiable === false && <span className="badge badge-danger">PO fixe</span>}
                {selectedSort.tauxEchec > 0 && <span className="badge badge-danger">Echec {Math.round(selectedSort.tauxEchec * 100)}%</span>}
                {selectedSort.race && <span className="badge badge-secondary">{selectedSort.race.nom}</span>}
                {selectedSort.zone && <span className="badge badge-secondary">{selectedSort.zone.nom}</span>}
              </div>
            </div>

            <div className="detail-section">
              <h4>Effets lies ({selectedSort.effets?.length || 0})</h4>
              <div className="sort-list">
                {selectedSort.effets && selectedSort.effets.length > 0 ? (
                  selectedSort.effets.map((e, i) => {
                    const type = getEffetType(e);
                    const badgeClass = type === 'DISPEL' ? 'badge-dispel' : type === 'BUFF' ? 'badge-success' : type === 'POISON' ? 'badge-poison' : (type === 'POUSSEE' || type === 'ATTIRANCE') ? 'badge-movement' : 'badge-danger';
                    return (
                      <div key={i} className="sort-item">
                        <div>
                          <span className="sort-name">{getEffetNom(e)}</span>
                          <span className="sort-meta">
                            <span className={`badge ${badgeClass}`}>{type}</span>
                            <span>{type === 'POISON' && getEffetValeurMin(e) != null ? `${getEffetValeurMin(e)}-${getEffetValeur(e)} dgts/tour` : `${getEffetValeur(e) > 0 ? '+' : ''}${getEffetValeur(e)} ${getEffetStat(e)}`}</span>
                            <span>{getEffetDuree(e)}t</span>
                            <span>{Math.round(e.chanceDeclenchement * 100)}%</span>
                            <span>{e.surCible ? 'Sur cible' : 'Sur lanceur'}</span>
                          </span>
                        </div>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRemoveEffect(getEffetId(e))}>X</button>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun effet lie</div>
                )}
              </div>
              <div className="inline-add">
                <select value={addEffetId} onChange={e => setAddEffetId(Number(e.target.value))}>
                  <option value={0}>-- Effet --</option>
                  {allEffets.map(ef => (
                    <option key={ef.id} value={ef.id}>{ef.nom} ({ef.type})</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={addChance}
                  onChange={e => setAddChance(Number(e.target.value))}
                  min={1}
                  max={100}
                  style={{ width: 60 }}
                  placeholder="%"
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={addSurCible}
                    onChange={e => setAddSurCible(e.target.checked)}
                  />
                  Sur cible
                </label>
                <button className="btn btn-sm btn-success" onClick={handleAddEffect} disabled={!addEffetId}>+ Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editing ? 'Modifier un sort' : 'Creer un sort'}
        fields={fields}
        initialValues={editing || undefined}
        onSubmit={async (vals) => {
          if (editing) await update(editing.id, vals);
          else await create(vals);
          setShowForm(false);
        }}
        onCancel={() => setShowForm(false)}
      />
      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" ?`}
        onConfirm={async () => { if (deleting) await remove(deleting.id); setDeleting(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default SortsPage;
