import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { mapsApi, regionsApi } from '../../api/maps';
import type { GameMap, Region } from '../../types';

const MapsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(mapsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GameMap | null>(null);
  const [deleting, setDeleting] = useState<GameMap | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    regionsApi.getAll().then(setRegions);
  }, []);

  const columns: Column<GameMap>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'combatMode', header: 'Mode combat' },
    {
      key: 'region',
      header: 'Region',
      render: (item) => item.region?.nom ?? String(item.regionId),
    },
    { key: 'largeur', header: 'Largeur' },
    { key: 'hauteur', header: 'Hauteur' },
    {
      key: 'worldX',
      header: 'Pos. monde',
      render: (item) => item.worldX !== null && item.worldY !== null
        ? `(${item.worldX}, ${item.worldY})`
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'id' as any,
      header: 'Grille',
      render: (item) => (
        <button
          className="btn btn-sm"
          onClick={(e) => { e.stopPropagation(); navigate(`/admin/maps/${item.id}/grid`); }}
        >
          Éditer grille
        </button>
      ),
    },
  ];

  const allMapsOptions = items.map(m => ({ value: m.id, label: `${m.id} - ${m.nom}` }));

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    {
      name: 'regionId',
      label: 'Region',
      type: 'select',
      required: true,
      options: regions.map(r => ({ value: r.id, label: r.nom })),
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'WILDERNESS', label: 'Wilderness' },
        { value: 'VILLE', label: 'Ville' },
        { value: 'DONJON', label: 'Donjon' },
        { value: 'BOSS', label: 'Boss' },
        { value: 'SAFE', label: 'Safe' },
      ],
    },
    {
      name: 'combatMode',
      label: 'Mode combat',
      type: 'select',
      required: true,
      options: [
        { value: 'MANUEL', label: 'Manuel' },
        { value: 'AUTO', label: 'Auto' },
      ],
      defaultValue: 'MANUEL',
    },
    { name: 'largeur', label: 'Largeur', type: 'number', required: true, min: 5, defaultValue: 16 },
    { name: 'hauteur', label: 'Hauteur', type: 'number', required: true, min: 5, defaultValue: 18 },
    ...(!editing?.worldX && !editing?.worldY ? [
      { name: 'nordMapId', label: 'Map Nord', type: 'select' as const, options: allMapsOptions },
      { name: 'sudMapId', label: 'Map Sud', type: 'select' as const, options: allMapsOptions },
      { name: 'estMapId', label: 'Map Est', type: 'select' as const, options: allMapsOptions },
      { name: 'ouestMapId', label: 'Map Ouest', type: 'select' as const, options: allMapsOptions },
    ] : []),
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Maps</h1>
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
        title={editing ? 'Modifier une map' : 'Creer une map'}
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

export default MapsPage;
