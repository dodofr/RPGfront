import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { passivesApi } from '../../api/static';
import type { CompetencePassive } from '../../types';

const bonusSummary = (p: CompetencePassive): string => {
  const parts: string[] = [];
  if (p.bonusForce) parts.push(`FOR +${p.bonusForce}`);
  if (p.bonusIntelligence) parts.push(`INT +${p.bonusIntelligence}`);
  if (p.bonusDexterite) parts.push(`DEX +${p.bonusDexterite}`);
  if (p.bonusAgilite) parts.push(`AGI +${p.bonusAgilite}`);
  if (p.bonusVie) parts.push(`VIE +${p.bonusVie}`);
  if (p.bonusChance) parts.push(`CHA +${p.bonusChance}`);
  if (p.bonusPa) parts.push(`PA +${p.bonusPa}`);
  if (p.bonusPm) parts.push(`PM +${p.bonusPm}`);
  if (p.bonusPo) parts.push(`PO +${p.bonusPo}`);
  if (p.bonusCritique) parts.push(`CRI +${p.bonusCritique}%`);
  if (p.bonusDommages) parts.push(`DMG +${p.bonusDommages}`);
  if (p.bonusSoins) parts.push(`SOIN +${p.bonusSoins}`);
  return parts.length > 0 ? parts.join(', ') : '—';
};

const PassivesPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(passivesApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompetencePassive | null>(null);
  const [deleting, setDeleting] = useState<CompetencePassive | null>(null);

  const columns: Column<CompetencePassive>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'niveauDeblocage', header: 'Niveau requis' },
    { key: 'description', header: 'Description' },
    {
      key: 'bonusForce',
      header: 'Bonus',
      render: (item) => bonusSummary(item),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'niveauDeblocage', label: 'Niveau de déblocage', type: 'number', required: true, defaultValue: 1 },
    { name: 'bonusForce', label: 'Bonus Force', type: 'number', defaultValue: 0 },
    { name: 'bonusIntelligence', label: 'Bonus Intelligence', type: 'number', defaultValue: 0 },
    { name: 'bonusDexterite', label: 'Bonus Dextérité', type: 'number', defaultValue: 0 },
    { name: 'bonusAgilite', label: 'Bonus Agilité', type: 'number', defaultValue: 0 },
    { name: 'bonusVie', label: 'Bonus Vie', type: 'number', defaultValue: 0 },
    { name: 'bonusChance', label: 'Bonus Chance', type: 'number', defaultValue: 0 },
    { name: 'bonusPa', label: 'Bonus PA', type: 'number', defaultValue: 0 },
    { name: 'bonusPm', label: 'Bonus PM', type: 'number', defaultValue: 0 },
    { name: 'bonusPo', label: 'Bonus PO', type: 'number', defaultValue: 0 },
    { name: 'bonusCritique', label: 'Bonus Critique (%)', type: 'number', defaultValue: 0 },
    { name: 'bonusDommages', label: 'Bonus Dommages', type: 'number', defaultValue: 0 },
    { name: 'bonusSoins', label: 'Bonus Soins', type: 'number', defaultValue: 0 },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Compétences Passives</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Créer
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
        title={editing ? 'Modifier une passive' : 'Créer une passive'}
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

export default PassivesPage;
