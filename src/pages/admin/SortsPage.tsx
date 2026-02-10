import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { sortsApi, racesApi, zonesApi } from '../../api/static';
import type { Sort, Race, Zone } from '../../types';
import '../../styles/admin.css';

// Normalize effect from either flat (combat) or nested (API) format
const getEffetNom = (e: NonNullable<Sort['effets']>[number]) => e.nom || e.effet?.nom || '';
const getEffetType = (e: NonNullable<Sort['effets']>[number]) => e.type || e.effet?.type || '';
const getEffetStat = (e: NonNullable<Sort['effets']>[number]) => e.statCiblee || e.effet?.statCiblee || '';
const getEffetValeur = (e: NonNullable<Sort['effets']>[number]) => e.valeur ?? e.effet?.valeur ?? 0;
const getEffetDuree = (e: NonNullable<Sort['effets']>[number]) => e.duree ?? e.effet?.duree ?? 0;

type TabFilter = 'all' | 'race' | 'monstre' | 'invocation';

const SortsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(sortsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sort | null>(null);
  const [deleting, setDeleting] = useState<Sort | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  useEffect(() => {
    racesApi.getAll().then(setRaces);
    zonesApi.getAll().then(setZones);
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
            {item.effets.map((e, i) => (
              <span key={i} className={`effect-badge ${getEffetType(e) === 'BUFF' ? 'buff' : 'debuff'}`}>
                {getEffetNom(e)} ({getEffetValeur(e) > 0 ? '+' : ''}{getEffetValeur(e)} {getEffetStat(e)}, {getEffetDuree(e)}t, {Math.round(e.chanceDeclenchement * 100)}%)
              </span>
            ))}
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
      label: 'Template invocation ID',
      type: 'number',
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
            onClick={() => setActiveTab(tab.key)}
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
      />
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
