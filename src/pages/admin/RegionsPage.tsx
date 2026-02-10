import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { regionsApi } from '../../api/maps';
import type { Region } from '../../types';

const RegionsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(regionsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [deleting, setDeleting] = useState<Region | null>(null);

  const columns: Column<Region>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'niveauMin', header: 'Niveau min' },
    { key: 'niveauMax', header: 'Niveau max' },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'FORET', label: 'Foret' },
        { value: 'PLAINE', label: 'Plaine' },
        { value: 'DESERT', label: 'Desert' },
        { value: 'MONTAGNE', label: 'Montagne' },
        { value: 'MARAIS', label: 'Marais' },
        { value: 'CAVERNE', label: 'Caverne' },
        { value: 'CITE', label: 'Cite' },
      ],
    },
    { name: 'niveauMin', label: 'Niveau min', type: 'number', defaultValue: 1, min: 1 },
    { name: 'niveauMax', label: 'Niveau max', type: 'number', defaultValue: 10, min: 1 },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Regions</h1>
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
        title={editing ? 'Modifier une region' : 'Creer une region'}
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

export default RegionsPage;
