import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { effetsApi } from '../../api/static';
import type { Effet } from '../../types';

const EffetsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(effetsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Effet | null>(null);
  const [deleting, setDeleting] = useState<Effet | null>(null);

  const columns: Column<Effet>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'statCiblee', header: 'Stat ciblee' },
    { key: 'valeur', header: 'Valeur' },
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
      ],
    },
    { name: 'valeur', label: 'Valeur', type: 'number', required: true },
    { name: 'duree', label: 'Duree (tours)', type: 'number', required: true, min: 1, defaultValue: 1 },
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
