import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { monstresApi } from '../../api/maps';
import { sortsApi } from '../../api/static';
import type { MonsterTemplate, Sort } from '../../types';
import '../../styles/admin.css';

type MonsterTab = 'ennemis' | 'invocations';

const MonstresPage: React.FC = () => {
  const { items, loading, create, update, remove, refresh } = useCrud(monstresApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MonsterTemplate | null>(null);
  const [deleting, setDeleting] = useState<MonsterTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<MonsterTab>('ennemis');
  const [selectedMonster, setSelectedMonster] = useState<MonsterTemplate | null>(null);
  const [allSorts, setAllSorts] = useState<Sort[]>([]);
  const [addSortId, setAddSortId] = useState<number>(0);
  const [addSortPrio, setAddSortPrio] = useState<number>(1);

  useEffect(() => {
    sortsApi.getAll().then(setAllSorts);
  }, []);

  const isInvocation = (m: MonsterTemplate) => m.xpRecompense === 0 || m.pvScalingInvocation !== null;

  const filteredItems = items.filter(m =>
    activeTab === 'ennemis' ? !isInvocation(m) : isInvocation(m)
  );

  const selectMonster = async (id: number) => {
    const detail = await monstresApi.getById(id);
    setSelectedMonster(detail);
  };

  const handleAddSort = async () => {
    if (!selectedMonster || !addSortId) return;
    await monstresApi.addSort(selectedMonster.id, { sortId: addSortId, priorite: addSortPrio });
    await selectMonster(selectedMonster.id);
    refresh();
  };

  const handleRemoveSort = async (sortId: number) => {
    if (!selectedMonster) return;
    await monstresApi.removeSort(selectedMonster.id, sortId);
    await selectMonster(selectedMonster.id);
    refresh();
  };

  const columns: Column<MonsterTemplate>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'force', header: 'Force' },
    { key: 'intelligence', header: 'Intel.' },
    { key: 'agilite', header: 'Agilite' },
    { key: 'vie', header: 'Vie' },
    { key: 'pvBase', header: 'PV base' },
    { key: 'niveauBase', header: 'Niveau' },
    { key: 'xpRecompense', header: 'XP' },
    { key: 'iaType', header: 'IA' },
    ...(activeTab === 'invocations' ? [{
      key: 'pvScalingInvocation' as keyof MonsterTemplate,
      header: 'PV Scaling',
      render: (item: MonsterTemplate) => item.pvScalingInvocation !== null ? `${item.pvScalingInvocation}` : '-',
    }] : []),
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'force', label: 'Force', type: 'number', required: true, min: 1, defaultValue: 10 },
    { name: 'intelligence', label: 'Intelligence', type: 'number', required: true, min: 1, defaultValue: 10 },
    { name: 'dexterite', label: 'Dexterite', type: 'number', required: true, min: 1, defaultValue: 10 },
    { name: 'agilite', label: 'Agilite', type: 'number', required: true, min: 1, defaultValue: 10 },
    { name: 'vie', label: 'Vie', type: 'number', required: true, min: 1, defaultValue: 10 },
    { name: 'chance', label: 'Chance', type: 'number', required: true, min: 1, defaultValue: 10 },
    { name: 'pvBase', label: 'PV base', type: 'number', required: true, min: 1, defaultValue: 50 },
    { name: 'paBase', label: 'PA base', type: 'number', defaultValue: 6, min: 1 },
    { name: 'pmBase', label: 'PM base', type: 'number', defaultValue: 3, min: 1 },
    { name: 'niveauBase', label: 'Niveau base', type: 'number', defaultValue: 1, min: 1 },
    { name: 'xpRecompense', label: 'XP recompense', type: 'number', defaultValue: 10, min: 0 },
    {
      name: 'iaType',
      label: 'Type IA',
      type: 'select',
      options: [
        { value: 'EQUILIBRE', label: 'Equilibre' },
        { value: 'AGGRESSIF', label: 'Aggressif' },
        { value: 'SOUTIEN', label: 'Soutien' },
        { value: 'DISTANCE', label: 'Distance' },
      ],
      defaultValue: 'EQUILIBRE',
    },
    { name: 'pvScalingInvocation', label: 'PV scaling invocation', type: 'float', step: 0.01 },
  ];

  const tabs: { key: MonsterTab; label: string; count: number }[] = [
    { key: 'ennemis', label: 'Ennemis', count: items.filter(m => !isInvocation(m)).length },
    { key: 'invocations', label: 'Invocations', count: items.filter(m => isInvocation(m)).length },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Monstres</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Creer
        </button>
      </div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setSelectedMonster(null); }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={filteredItems}
        loading={loading}
        onEdit={item => { setEditing(item); setShowForm(true); }}
        onDelete={item => setDeleting(item)}
        onRowClick={item => selectMonster(item.id)}
        selectedId={selectedMonster?.id}
      />

      {selectedMonster && (
        <div className="detail-panel">
          <h3>
            {selectedMonster.nom}
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedMonster(null)}>Fermer</button>
          </h3>
          <div className="detail-sections">
            <div className="detail-section">
              <h4>Stats</h4>
              <div className="stat-grid">
                {([
                  ['Force', selectedMonster.force],
                  ['Intelligence', selectedMonster.intelligence],
                  ['Dexterite', selectedMonster.dexterite],
                  ['Agilite', selectedMonster.agilite],
                  ['Vie', selectedMonster.vie],
                  ['Chance', selectedMonster.chance],
                  ['PV base', selectedMonster.pvBase],
                  ['PA', selectedMonster.paBase],
                  ['PM', selectedMonster.pmBase],
                  ['Niveau', selectedMonster.niveauBase],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="stat-row">
                    <span className="stat-label">{label}</span>
                    <span className="stat-value">{val}</span>
                  </div>
                ))}
              </div>
              {selectedMonster.pvScalingInvocation !== null && (
                <div className="stat-row" style={{ marginTop: 8 }}>
                  <span className="stat-label">PV Scaling</span>
                  <span className="stat-value">{selectedMonster.pvScalingInvocation}</span>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>Sorts ({selectedMonster.sorts?.length || 0})</h4>
              <div className="sort-list">
                {selectedMonster.sorts && selectedMonster.sorts.length > 0 ? (
                  selectedMonster.sorts
                    .sort((a, b) => a.priorite - b.priorite)
                    .map(ms => (
                      <div key={ms.id} className="sort-item">
                        <div>
                          <span className="sort-name">{ms.sort?.nom || `Sort #${ms.sortId}`}</span>
                          {ms.sort && (
                            <span className="sort-meta">
                              <span>{ms.sort.coutPA} PA</span>
                              <span>{ms.sort.degatsMin}-{ms.sort.degatsMax} dmg</span>
                              <span>{ms.sort.porteeMin}-{ms.sort.porteeMax} po</span>
                              {ms.sort.estSoin && <span style={{ color: 'var(--success)' }}>Soin</span>}
                              {ms.sort.estDispel && <span style={{ color: 'var(--info)' }}>Dispel</span>}
                              {ms.sort.estInvocation && <span style={{ color: 'var(--warning)' }}>Invoc.</span>}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge badge-info">P{ms.priorite}</span>
                          <button className="btn btn-sm btn-danger" onClick={() => handleRemoveSort(ms.sortId)}>X</button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun sort</div>
                )}
              </div>
              <div className="inline-add">
                <select value={addSortId} onChange={e => setAddSortId(Number(e.target.value))}>
                  <option value={0}>-- Sort --</option>
                  {allSorts.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={addSortPrio}
                  onChange={e => setAddSortPrio(Number(e.target.value))}
                  min={1}
                  style={{ width: 60 }}
                  placeholder="Prio"
                />
                <button className="btn btn-sm btn-success" onClick={handleAddSort} disabled={!addSortId}>+ Ajouter</button>
              </div>
            </div>

            {selectedMonster.regions && selectedMonster.regions.length > 0 && (
              <div className="detail-section">
                <h4>Regions</h4>
                <div className="sort-list">
                  {selectedMonster.regions.map((r, i) => (
                    <div key={i} className="sort-item">
                      <span>{r.region.nom}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editing ? 'Modifier un monstre' : 'Creer un monstre'}
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

export default MonstresPage;
