import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { equipmentApi } from '../../api/static';
import type { Equipment } from '../../types';

const EquipementsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(equipmentApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState<Equipment | null>(null);

  const columns: Column<Equipment>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'slot', header: 'Slot' },
    { key: 'niveauMinimum', header: 'Niveau min' },
    { key: 'bonusForce', header: 'Force' },
    { key: 'bonusIntelligence', header: 'Intelligence' },
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
    { name: 'bonusForce', label: 'Bonus Force', type: 'number', defaultValue: 0 },
    { name: 'bonusIntelligence', label: 'Bonus Intelligence', type: 'number', defaultValue: 0 },
    { name: 'bonusDexterite', label: 'Bonus Dexterite', type: 'number', defaultValue: 0 },
    { name: 'bonusAgilite', label: 'Bonus Agilite', type: 'number', defaultValue: 0 },
    { name: 'bonusVie', label: 'Bonus Vie', type: 'number', defaultValue: 0 },
    { name: 'bonusChance', label: 'Bonus Chance', type: 'number', defaultValue: 0 },
    { name: 'bonusPA', label: 'Bonus PA', type: 'number', defaultValue: 0 },
    { name: 'bonusPM', label: 'Bonus PM', type: 'number', defaultValue: 0 },
    { name: 'bonusPO', label: 'Bonus PO', type: 'number', defaultValue: 0 },
    // Weapon-specific fields (shown only when slot is ARME)
    {
      name: 'degatsMin',
      label: 'Degats min',
      type: 'number',
      defaultValue: 0,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'degatsMax',
      label: 'Degats max',
      type: 'number',
      defaultValue: 0,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'degatsCritMin',
      label: 'Degats crit min',
      type: 'number',
      defaultValue: 0,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'degatsCritMax',
      label: 'Degats crit max',
      type: 'number',
      defaultValue: 0,
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'chanceCritBase',
      label: 'Chance crit base',
      type: 'float',
      defaultValue: 0.05,
      step: 0.01,
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
      label: 'Zone ID',
      type: 'number',
      showIf: (v) => v.slot === 'ARME',
    },
    {
      name: 'statUtilisee',
      label: 'Stat utilisee',
      type: 'select',
      options: [
        { value: 'FORCE', label: 'Force' },
        { value: 'INTELLIGENCE', label: 'Intelligence' },
        { value: 'DEXTERITE', label: 'Dexterite' },
        { value: 'AGILITE', label: 'Agilite' },
        { value: 'VIE', label: 'Vie' },
        { value: 'CHANCE', label: 'Chance' },
      ],
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
      />
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
