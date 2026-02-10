import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { mapsApi, regionsApi } from '../../api/maps';
import { grillesApi } from '../../api/donjons';
import type { GameMap, Region, GrilleCombat } from '../../types';

const MapsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(mapsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GameMap | null>(null);
  const [deleting, setDeleting] = useState<GameMap | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [expandedMapId, setExpandedMapId] = useState<number | null>(null);
  const [mapGrilles, setMapGrilles] = useState<GrilleCombat[]>([]);
  const [loadingGrilles, setLoadingGrilles] = useState(false);

  useEffect(() => {
    regionsApi.getAll().then(setRegions);
  }, []);

  const toggleGrilles = async (mapId: number) => {
    if (expandedMapId === mapId) {
      setExpandedMapId(null);
      setMapGrilles([]);
      return;
    }
    setExpandedMapId(mapId);
    setLoadingGrilles(true);
    try {
      const grilles = await mapsApi.getGrilles(mapId);
      setMapGrilles(grilles);
    } catch {
      setMapGrilles([]);
    }
    setLoadingGrilles(false);
  };

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
    { key: 'tauxRencontre', header: 'Taux rencontre' },
    {
      key: 'grilles',
      header: 'Grilles',
      render: (item) => {
        const count = item._count?.grilles ?? 0;
        return (
          <button
            className="btn btn-sm"
            onClick={(e) => { e.stopPropagation(); toggleGrilles(item.id); }}
          >
            {count} grille{count !== 1 ? 's' : ''} {expandedMapId === item.id ? '▲' : '▼'}
          </button>
        );
      },
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
    { name: 'largeur', label: 'Largeur', type: 'number', required: true, min: 5, defaultValue: 20 },
    { name: 'hauteur', label: 'Hauteur', type: 'number', required: true, min: 5, defaultValue: 20 },
    { name: 'tauxRencontre', label: 'Taux rencontre', type: 'float', defaultValue: 0.2, step: 0.01 },
    { name: 'nordMapId', label: 'Map Nord', type: 'select', options: allMapsOptions },
    { name: 'sudMapId', label: 'Map Sud', type: 'select', options: allMapsOptions },
    { name: 'estMapId', label: 'Map Est', type: 'select', options: allMapsOptions },
    { name: 'ouestMapId', label: 'Map Ouest', type: 'select', options: allMapsOptions },
  ];

  const handleDeleteGrille = async (grilleId: number) => {
    if (!confirm('Supprimer cette grille ?')) return;
    await grillesApi.remove(grilleId);
    if (expandedMapId) {
      const grilles = await mapsApi.getGrilles(expandedMapId);
      setMapGrilles(grilles);
    }
  };

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
      {expandedMapId && (
        <div className="relation-section">
          <h4>Grilles de combat - {items.find(m => m.id === expandedMapId)?.nom}</h4>
          {loadingGrilles ? (
            <div className="loading">Chargement...</div>
          ) : mapGrilles.length === 0 ? (
            <p style={{ fontSize: 13, color: '#aaa' }}>Aucune grille liee a cette map.</p>
          ) : (
            <div className="relation-list">
              {mapGrilles.map(g => (
                <div key={g.id} className="relation-item">
                  <span>
                    <strong>{g.nom}</strong> ({g.largeur}x{g.hauteur})
                    {' '}- {g.cases?.length ?? 0} obstacles, {g.spawns?.length ?? 0} spawns
                  </span>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteGrille(g.id)}>
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
