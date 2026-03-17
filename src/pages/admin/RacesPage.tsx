import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { racesApi } from '../../api/static';
import type { Race } from '../../types';

// ── Page principale ───────────────────────────────────────────────────────────
const RacesPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, create, update, remove } = useCrud(racesApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [deleting, setDeleting] = useState<Race | null>(null);

  const columns: Column<Race>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'bonusForce', header: 'FOR' },
    { key: 'bonusIntelligence', header: 'INT' },
    { key: 'bonusDexterite', header: 'DEX' },
    { key: 'bonusAgilite', header: 'AGI' },
    { key: 'bonusVie', header: 'VIE' },
    { key: 'bonusChance', header: 'CHA' },
    { key: 'imageUrlHomme', header: 'H', render: (r) => r.imageUrlHomme ? <img src={r.imageUrlHomme} style={{ height: 28 }} alt="H" /> : '–' },
    { key: 'imageUrlFemme', header: 'F', render: (r) => r.imageUrlFemme ? <img src={r.imageUrlFemme} style={{ height: 28 }} alt="F" /> : '–' },
    { key: 'spriteScale', header: 'Scale', render: (r) => (r.spriteScale ?? 1).toFixed(2) },
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
        onRowClick={item => navigate(`/admin/races/${item.id}`)}
        extraActions={item => (
          <button
            className="btn btn-sm btn-secondary"
            onClick={e => { e.stopPropagation(); navigate(`/admin/races/${item.id}`); }}
            title="Editeur sprite"
          >
            🎨
          </button>
        )}
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
