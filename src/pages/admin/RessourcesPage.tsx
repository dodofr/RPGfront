import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { resourcesApi } from '../../api/static';
import type { Ressource } from '../../types';
import '../../styles/admin.css';

const RessourcesPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(resourcesApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ressource | null>(null);
  const [deleting, setDeleting] = useState<Ressource | null>(null);

  const columns: Column<Ressource>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'description', header: 'Description', render: (item) => item.description || '-' },
    { key: 'poids', header: 'Poids' },
    {
      key: 'estPremium',
      header: 'Premium',
      render: (item) => (
        <span className={`badge ${item.estPremium ? 'badge-success' : 'badge-muted'}`}>
          {item.estPremium ? 'Oui' : 'Non'}
        </span>
      ),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'poids', label: 'Poids', type: 'number', defaultValue: 1, min: 0 },
    { name: 'estPremium', label: 'Premium (drop global)', type: 'checkbox', defaultValue: false },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Ressources</h1>
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
        title={editing ? 'Modifier une ressource' : 'Creer une ressource'}
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

export default RessourcesPage;
