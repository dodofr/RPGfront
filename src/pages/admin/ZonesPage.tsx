import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { zonesApi } from '../../api/static';
import type { Zone } from '../../types';

const ZonesPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(zonesApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);

  const columns: Column<Zone>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'taille', header: 'Taille' },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'CASE', label: 'Case' },
        { value: 'CROIX', label: 'Croix' },
        { value: 'LIGNE', label: 'Ligne' },
        { value: 'CONE', label: 'Cone' },
        { value: 'CERCLE', label: 'Cercle' },
      ],
    },
    { name: 'taille', label: 'Taille', type: 'number', required: true, min: 1, defaultValue: 1 },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Zones</h1>
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
        title={editing ? 'Modifier une zone' : 'Creer une zone'}
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

export default ZonesPage;
