import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { grillesApi } from '../../api/donjons';
import { mapsApi } from '../../api/maps';
import type { GrilleCombat, GameMap } from '../../types';

const GrillesPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(grillesApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GrilleCombat | null>(null);
  const [deleting, setDeleting] = useState<GrilleCombat | null>(null);
  const [maps, setMaps] = useState<GameMap[]>([]);

  useEffect(() => {
    mapsApi.getAll().then(setMaps);
  }, []);

  const getMapName = (mapId: number) => {
    const map = maps.find(m => m.id === mapId);
    return map ? map.nom : String(mapId);
  };

  const columns: Column<GrilleCombat>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    {
      key: 'map',
      header: 'Map',
      render: (item) => item.map?.nom ?? getMapName(item.mapId),
    },
    { key: 'largeur', header: 'Largeur' },
    { key: 'hauteur', header: 'Hauteur' },
    {
      key: 'cases',
      header: 'Obstacles',
      render: (item) => String(item._count?.cases ?? item.cases?.length ?? 0),
    },
    {
      key: 'spawns',
      header: 'Spawns',
      render: (item) => String(item._count?.spawns ?? item.spawns?.length ?? 0),
    },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'mapId',
      label: 'Map',
      type: 'select',
      required: true,
      options: maps.map(m => ({ value: m.id, label: `${m.id} - ${m.nom}` })),
    },
    { name: 'largeur', label: 'Largeur', type: 'number', required: true, min: 5, max: 30, defaultValue: 15 },
    { name: 'hauteur', label: 'Hauteur', type: 'number', required: true, min: 5, max: 30, defaultValue: 10 },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Grilles de combat</h1>
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
        title={editing ? 'Modifier une grille' : 'Creer une grille'}
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

export default GrillesPage;
