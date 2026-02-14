import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { effetsApi } from '../../api/static';
import type { Effet } from '../../types';
import '../../styles/admin.css';

const EffetsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(effetsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Effet | null>(null);
  const [deleting, setDeleting] = useState<Effet | null>(null);

  const columns: Column<Effet>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    {
      key: 'type',
      header: 'Type',
      render: (item) => {
        const cls = item.type === 'DISPEL' ? 'badge-dispel' : item.type === 'BUFF' ? 'badge-success' : item.type === 'POISON' ? 'badge-poison' : (item.type === 'POUSSEE' || item.type === 'ATTIRANCE') ? 'badge-movement' : 'badge-danger';
        return <span className={`badge ${cls}`}>{item.type}</span>;
      },
    },
    { key: 'statCiblee', header: 'Stat ciblee' },
    {
      key: 'valeur',
      header: 'Valeur',
      render: (item) => item.valeurMin != null ? `${item.valeurMin} - ${item.valeur}` : `${item.valeur}`,
    },
    { key: 'duree', header: 'Duree' },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'BUFF', label: 'Buff' },
        { value: 'DEBUFF', label: 'Debuff' },
        { value: 'DISPEL', label: 'Dispel' },
        { value: 'POUSSEE', label: 'Poussee' },
        { value: 'ATTIRANCE', label: 'Attirance' },
        { value: 'POISON', label: 'Poison' },
      ],
    },
    {
      name: 'statCiblee',
      label: 'Stat ciblee',
      type: 'select',
      required: true,
      options: [
        { value: 'FORCE', label: 'Force' },
        { value: 'INTELLIGENCE', label: 'Intelligence' },
        { value: 'DEXTERITE', label: 'Dexterite' },
        { value: 'AGILITE', label: 'Agilite' },
        { value: 'VIE', label: 'Vie' },
        { value: 'CHANCE', label: 'Chance' },
        { value: 'PA', label: 'PA' },
        { value: 'PM', label: 'PM' },
        { value: 'PO', label: 'PO' },
      ],
    },
    { name: 'valeurMin', label: 'Valeur min (poison)', type: 'number', required: false },
    { name: 'valeur', label: 'Valeur (max)', type: 'number', required: true },
    { name: 'duree', label: 'Duree (tours)', type: 'number', required: true, min: 0, defaultValue: 1 },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Effets</h1>
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
      />
      <FormModal
        open={showForm}
        title={editing ? 'Modifier un effet' : 'Creer un effet'}
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

export default EffetsPage;
