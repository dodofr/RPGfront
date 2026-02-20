import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { equipmentApi, zonesApi, setsApi } from '../../api/static';
import type { Equipment, Zone, StatType, Panoplie } from '../../types';
import '../../styles/admin.css';

const STAT_OPTIONS: { value: StatType; label: string }[] = [
  { value: 'FORCE', label: 'Force' },
  { value: 'INTELLIGENCE', label: 'Intelligence' },
  { value: 'DEXTERITE', label: 'Dexterite' },
  { value: 'AGILITE', label: 'Agilite' },
  { value: 'VIE', label: 'Vie' },
  { value: 'CHANCE', label: 'Chance' },
];

const EquipementsPage: React.FC = () => {
  const { items, loading, create, update, remove, refresh } = useCrud(equipmentApi);
  const [zones, setZones] = useState<Zone[]>([]);
  const [panoplies, setPanoplies] = useState<Panoplie[]>([]);
  const [selected, setSelected] = useState<Equipment | null>(null);

  // Ligne add form
  const [newLigne, setNewLigne] = useState({ degatsMin: 0, degatsMax: 0, statUtilisee: 'FORCE' as StatType, estVolDeVie: false, estSoin: false });

  useEffect(() => {
    zonesApi.getAll().then(setZones);
    setsApi.getAll().then(setPanoplies);
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState<Equipment | null>(null);

  const selectEquip = async (id: number) => {
    const eq = await equipmentApi.getById(id);
    setSelected(eq);
  };

  const formatStat = (item: Equipment, stat: string, max: string) => {
    const rec = item as unknown as Record<string, number | null>;
    const val = rec[stat] ?? 0;
    const maxVal = rec[max];
    if (maxVal && maxVal > 0 && maxVal !== val) return `${val}-${maxVal}`;
    return val ? String(val) : '';
  };

  const columns: Column<Equipment>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'slot', header: 'Slot' },
    { key: 'niveauMinimum', header: 'Niv.' },
    { key: 'poids', header: 'Poids' },
    { key: 'bonusForce', header: 'FOR', render: (item) => formatStat(item, 'bonusForce', 'bonusForceMax') },
    { key: 'bonusIntelligence', header: 'INT', render: (item) => formatStat(item, 'bonusIntelligence', 'bonusIntelligenceMax') },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'slot',
      label: 'Slot',
      type: 'select',
      required: true,
      options: [
        { value: 'ARME', label: 'Arme' },
        { value: 'COIFFE', label: 'Coiffe' },
        { value: 'AMULETTE', label: 'Amulette' },
        { value: 'BOUCLIER', label: 'Bouclier' },
        { value: 'HAUT', label: 'Haut' },
        { value: 'BAS', label: 'Bas' },
        { value: 'ANNEAU1', label: 'Anneau 1' },
        { value: 'ANNEAU2', label: 'Anneau 2' },
        { value: 'FAMILIER', label: 'Familier' },
      ],
    },
    { name: 'niveauMinimum', label: 'Niveau minimum', type: 'number', defaultValue: 1, min: 1 },
    { name: 'poids', label: 'Poids', type: 'number', defaultValue: 1, min: 0 },
    {
      name: 'panoplieId',
      label: 'Panoplie',
      type: 'select',
      options: [{ value: '', label: '-- Aucune --' }, ...panoplies.map(p => ({ value: p.id, label: p.nom }))],
    },
    { name: 'bonusForce', label: 'Bonus Force (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusForceMax', label: 'Bonus Force (max)', type: 'number' },
    { name: 'bonusIntelligence', label: 'Bonus Intelligence (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusIntelligenceMax', label: 'Bonus Intelligence (max)', type: 'number' },
    { name: 'bonusDexterite', label: 'Bonus Dexterite (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusDexteriteMax', label: 'Bonus Dexterite (max)', type: 'number' },
    { name: 'bonusAgilite', label: 'Bonus Agilite (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusAgiliteMax', label: 'Bonus Agilite (max)', type: 'number' },
    { name: 'bonusVie', label: 'Bonus Vie (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusVieMax', label: 'Bonus Vie (max)', type: 'number' },
    { name: 'bonusChance', label: 'Bonus Chance (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusChanceMax', label: 'Bonus Chance (max)', type: 'number' },
    { name: 'bonusPA', label: 'Bonus PA (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusPAMax', label: 'Bonus PA (max)', type: 'number' },
    { name: 'bonusPM', label: 'Bonus PM (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusPMMax', label: 'Bonus PM (max)', type: 'number' },
    { name: 'bonusPO', label: 'Bonus PO (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusPOMax', label: 'Bonus PO (max)', type: 'number' },
    { name: 'bonusCritique', label: 'Bonus Critique % (min)', type: 'number', defaultValue: 0 },
    { name: 'bonusCritiqueMax', label: 'Bonus Critique % (max)', type: 'number' },
    // Weapon-specific fields (shown only when slot is ARME)
    {
      name: 'chanceCritBase',
      label: 'Chance crit base',
      type: 'float',
      defaultValue: 0.05,
      step: 0.01,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'bonusCrit',
      label: 'Bonus crit (+X sur min/max)',
      type: 'number',
      defaultValue: 0,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'coutPA',
      label: 'Cout PA',
      type: 'number',
      defaultValue: 4,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'porteeMin',
      label: 'Portee min',
      type: 'number',
      defaultValue: 1,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'porteeMax',
      label: 'Portee max',
      type: 'number',
      defaultValue: 1,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'ligneDeVue',
      label: 'Ligne de vue',
      type: 'checkbox',
      defaultValue: true,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'zoneId',
      label: 'Zone',
      type: 'select',
      options: zones.map(z => ({ value: z.id, label: `${z.nom} (${z.type})` })),
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'cooldown',
      label: 'Cooldown',
      type: 'number',
      defaultValue: 0,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'tauxEchec',
      label: 'Taux echec',
      type: 'float',
      defaultValue: 0,
      step: 0.01,
      showIf: (v) => v.slot === 'ARME',
    },
  ];

  const handleAddLigne = async () => {
    if (!selected) return;
    const nextOrdre = (selected.lignesDegats?.length ?? 0) + 1;
    await equipmentApi.addLigne(selected.id, { ...newLigne, ordre: nextOrdre });
    await selectEquip(selected.id);
    await refresh();
    setNewLigne({ degatsMin: 0, degatsMax: 0, statUtilisee: 'FORCE', estVolDeVie: false, estSoin: false });
  };

  const handleRemoveLigne = async (ligneId: number) => {
    if (!selected) return;
    await equipmentApi.removeLigne(selected.id, ligneId);
    await selectEquip(selected.id);
    await refresh();
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Equipements</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Creer
        </button>
      </div>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onEdit={item => { setEditing(item); setShowForm(true); }}
        onDelete={item => setDeleting(item)}
        onRowClick={item => selectEquip(item.id)}
        selectedId={selected?.id}
      />

      {/* Detail panel for weapons */}
      {selected && selected.slot === 'ARME' && (
        <div className="detail-panel">
          <h3>{selected.nom} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Niv. {selected.niveauMinimum}</span></h3>
          <div className="detail-sections">
            <div className="detail-section">
              <h4>Attaque</h4>
              <div className="stat-grid">
                <div className="stat-row">
                  <span className="stat-label">% Crit</span>
                  <span className="stat-value">{Math.round((selected.chanceCritBase ?? 0) * 100)}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Bonus crit</span>
                  <span className="stat-value">+{selected.bonusCrit ?? 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">PA</span>
                  <span className="stat-value">{selected.coutPA}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Portee</span>
                  <span className="stat-value">{selected.porteeMin}-{selected.porteeMax}</span>
                </div>
                {selected.tauxEchec != null && selected.tauxEchec > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">Echec</span>
                    <span className="stat-value" style={{ color: 'var(--danger)' }}>{Math.round(selected.tauxEchec * 100)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>Lignes de degats ({selected.lignesDegats?.length ?? 0})</h4>
              {selected.lignesDegats && selected.lignesDegats.length > 0 ? (
                <div className="sort-list">
                  {selected.lignesDegats.map(l => (
                    <div key={l.id} className="sort-item">
                      <div>
                        <span className="sort-name">Ligne {l.ordre}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          {l.degatsMin}-{l.degatsMax} {l.statUtilisee}
                          {l.estVolDeVie && <span style={{ color: '#00c853', marginLeft: 4 }}>Vol de vie</span>}
                          {l.estSoin && <span style={{ color: 'var(--success)', marginLeft: 4 }}>Soin</span>}
                        </span>
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveLigne(l.id)}>X</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>
                  Aucune ligne — arme inutilisable en combat
                </div>
              )}

              <div className="inline-add" style={{ flexWrap: 'wrap' }}>
                <input type="number" placeholder="Min" value={newLigne.degatsMin} onChange={e => setNewLigne(p => ({ ...p, degatsMin: +e.target.value }))} style={{ width: 50 }} />
                <input type="number" placeholder="Max" value={newLigne.degatsMax} onChange={e => setNewLigne(p => ({ ...p, degatsMax: +e.target.value }))} style={{ width: 50 }} />
                <select value={newLigne.statUtilisee} onChange={e => setNewLigne(p => ({ ...p, statUtilisee: e.target.value as StatType }))}>
                  {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input type="checkbox" checked={newLigne.estVolDeVie} onChange={e => setNewLigne(p => ({ ...p, estVolDeVie: e.target.checked }))} /> VdV
                </label>
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input type="checkbox" checked={newLigne.estSoin} onChange={e => setNewLigne(p => ({ ...p, estSoin: e.target.checked }))} /> Soin
                </label>
                <button className="btn btn-sm btn-primary" onClick={handleAddLigne}>+ Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editing ? 'Modifier un equipement' : 'Creer un equipement'}
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

export default EquipementsPage;
