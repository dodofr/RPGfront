import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { donjonsApi } from '../../api/donjons';
import { regionsApi, mapsApi, monstresApi } from '../../api/maps';
import type { Donjon, Region, GameMap, MonsterTemplate } from '../../types';

const DonjonsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(donjonsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Donjon | null>(null);
  const [deleting, setDeleting] = useState<Donjon | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [monstres, setMonstres] = useState<MonsterTemplate[]>([]);

  useEffect(() => {
    regionsApi.getAll().then(setRegions);
    mapsApi.getAll().then(setMaps);
    monstresApi.getAll().then(setMonstres);
  }, []);

  const columns: Column<Donjon>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    {
      key: 'region',
      header: 'Region',
      render: (item) => item.region?.nom ?? String(item.regionId),
    },
    { key: 'niveauMin', header: 'Niveau min' },
    { key: 'niveauMax', header: 'Niveau max' },
    {
      key: 'boss',
      header: 'Boss',
      render: (item) => item.boss?.nom ?? String(item.bossId),
    },
  ];

  const baseFields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
    {
      name: 'regionId',
      label: 'Region',
      type: 'select',
      required: true,
      options: regions.map(r => ({ value: r.id, label: r.nom })),
    },
    { name: 'niveauMin', label: 'Niveau min', type: 'number', defaultValue: 1, min: 1 },
    { name: 'niveauMax', label: 'Niveau max', type: 'number', defaultValue: 5, min: 1 },
    {
      name: 'bossId',
      label: 'Boss',
      type: 'select',
      required: true,
      options: monstres.map(m => ({ value: m.id, label: m.nom })),
    },
  ];

  const salleFields: FieldDef[] = [
    {
      name: 'salle1MapId',
      label: 'Salle 1 (Map)',
      type: 'select',
      required: true,
      options: maps.map(m => ({ value: m.id, label: m.nom })),
    },
    {
      name: 'salle2MapId',
      label: 'Salle 2 (Map)',
      type: 'select',
      required: true,
      options: maps.map(m => ({ value: m.id, label: m.nom })),
    },
    {
      name: 'salle3MapId',
      label: 'Salle 3 (Map)',
      type: 'select',
      required: true,
      options: maps.map(m => ({ value: m.id, label: m.nom })),
    },
    {
      name: 'salle4MapId',
      label: 'Salle 4 - Boss (Map)',
      type: 'select',
      required: true,
      options: maps.map(m => ({ value: m.id, label: m.nom })),
    },
  ];

  const fields = editing ? baseFields : [...baseFields, ...salleFields];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Donjons</h1>
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
        title={editing ? 'Modifier un donjon' : 'Creer un donjon'}
        fields={fields}
        initialValues={editing || undefined}
        onSubmit={async (vals) => {
          if (editing) {
            await update(editing.id, vals);
          } else {
            const { salle1MapId, salle2MapId, salle3MapId, salle4MapId, ...donjonData } = vals as Record<string, unknown>;
            const salles = [
              { ordre: 1, mapId: Number(salle1MapId) },
              { ordre: 2, mapId: Number(salle2MapId) },
              { ordre: 3, mapId: Number(salle3MapId) },
              { ordre: 4, mapId: Number(salle4MapId) },
            ];
            await create({ ...donjonData, salles } as Partial<Donjon> & { salles: { ordre: number; mapId: number }[] });
          }
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

export default DonjonsPage;
