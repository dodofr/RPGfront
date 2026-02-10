import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { racesApi } from '../../api/static';
import type { Race } from '../../types';

const RacesPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(racesApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [deleting, setDeleting] = useState<Race | null>(null);

  const columns: Column<Race>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'bonusForce', header: 'Force' },
    { key: 'bonusIntelligence', header: 'Intelligence' },
    { key: 'bonusDexterite', header: 'Dexterite' },
    { key: 'bonusAgilite', header: 'Agilite' },
    { key: 'bonusVie', header: 'Vie' },
    { key: 'bonusChance', header: 'Chance' },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'bonusForce', label: 'Bonus Force', type: 'number', defaultValue: 0 },
    { name: 'bonusIntelligence', label: 'Bonus Intelligence', type: 'number', defaultValue: 0 },
    { name: 'bonusDexterite', label: 'Bonus Dexterite', type: 'number', defaultValue: 0 },
    { name: 'bonusAgilite', label: 'Bonus Agilite', type: 'number', defaultValue: 0 },
    { name: 'bonusVie', label: 'Bonus Vie', type: 'number', defaultValue: 0 },
    { name: 'bonusChance', label: 'Bonus Chance', type: 'number', defaultValue: 0 },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Races</h1>
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
        title={editing ? 'Modifier une race' : 'Creer une race'}
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

export default RacesPage;
