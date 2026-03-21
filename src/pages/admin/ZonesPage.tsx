import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { zonesApi } from '../../api/static';
import type { Zone } from '../../types';

const zoneDescriptions: Record<string, string> = {
  CASE: 'Case unique ciblée',
  CROIX: 'Croix (N/S/E/O) centrée sur la cible',
  LIGNE: 'Ligne dans la direction lanceur → cible',
  CONE: 'Cône qui s\'élargit en s\'éloignant du lanceur',
  CERCLE: 'Cercle (distance Manhattan) centré sur la cible',
  LIGNE_PERPENDICULAIRE: 'Ligne perpendiculaire à la direction lanceur → cible',
  DIAGONALE: 'Croix diagonale (NE/NO/SE/SO) centrée sur la cible',
  CARRE: 'Carré plein centré sur la cible',
  ANNEAU: 'Anneau creux (bordure du cercle) autour de la cible',
  CONE_INVERSE: 'Cône qui s\'élargit vers le lanceur',
  T_FORME: 'T — ligne perpendiculaire + 1 case dans la direction de lancer',
};

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
    {
      key: 'description',
      header: 'Description',
      render: (item) => zoneDescriptions[item.type] || item.type,
    },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'CASE', label: 'Case — cible unique' },
        { value: 'CROIX', label: 'Croix — N/S/E/O depuis la cible' },
        { value: 'LIGNE', label: 'Ligne — direction lanceur → cible' },
        { value: 'LIGNE_PERPENDICULAIRE', label: 'Ligne perp. — perpendiculaire au lanceur' },
        { value: 'CONE', label: 'Cône — s\'élargit loin du lanceur' },
        { value: 'CONE_INVERSE', label: 'Cône inv. — s\'élargit vers le lanceur' },
        { value: 'CERCLE', label: 'Cercle — rayon Manhattan' },
        { value: 'ANNEAU', label: 'Anneau — bordure du cercle uniquement' },
        { value: 'DIAGONALE', label: 'Diagonale — croix NE/NO/SE/SO' },
        { value: 'CARRE', label: 'Carré — zone pleine carrée' },
        { value: 'T_FORME', label: 'Forme en T — ligne perp. + 1 case avant' },
      ],
    },
    { name: 'taille', label: 'Taille', type: 'number', required: true, min: 0, defaultValue: 1 },
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
