import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { recipesAdminApi, equipmentApi, resourcesApi } from '../../api/static';
import { metiersApi } from '../../api/metiers';
import type { Recette, Equipment, Ressource, Metier } from '../../types';
import '../../styles/admin.css';

const RecettesPage: React.FC = () => {
  const { items, loading, create, update, remove, refresh } = useCrud(recipesAdminApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Recette | null>(null);
  const [deleting, setDeleting] = useState<Recette | null>(null);
  const [selected, setSelected] = useState<Recette | null>(null);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [allResources, setAllResources] = useState<Ressource[]>([]);
  const [allMetiers, setAllMetiers] = useState<Metier[]>([]);
  const [addResId, setAddResId] = useState<number>(0);
  const [addResQty, setAddResQty] = useState<number>(1);

  useEffect(() => {
    Promise.all([equipmentApi.getAll(), resourcesApi.getAll(), metiersApi.getAll()]).then(([eqs, res, mets]) => {
      setAllEquipment(eqs);
      setAllResources(res);
      setAllMetiers(mets);
    });
  }, []);

  const selectRecipe = async (id: number) => {
    const detail = await recipesAdminApi.getById(id);
    setSelected(detail);
  };

  const columns: Column<Recette>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'equipement', header: 'Resultat', render: (item) => item.equipement?.nom ?? `#${item.equipementId}` },
    { key: 'niveauMinimum', header: 'Niveau min' },
    { key: 'coutOr', header: 'Or' },
    {
      key: 'metier',
      header: 'Métier requis',
      render: (item) => item.metier
        ? <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 10, background: 'var(--accent)', color: '#fff' }}>
            {item.metier.nom} niv.{item.niveauMetierRequis ?? 1}
          </span>
        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Libre</span>,
    },
    { key: 'ingredients', header: 'Ingredients', render: (item) =>
      item.ingredients && item.ingredients.length > 0
        ? item.ingredients.map(ing => `${ing.quantite}x ${ing.ressource?.nom ?? `#${ing.ressourceId}`}`).join(', ')
        : 'Aucun'
    },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
    {
      name: 'equipementId',
      label: 'Equipement resultat',
      type: 'select',
      required: true,
      options: allEquipment.map(e => ({ value: e.id, label: `${e.nom} (${e.slot})` })),
    },
    { name: 'niveauMinimum', label: 'Niveau minimum', type: 'number', defaultValue: 1, min: 1 },
    { name: 'coutOr', label: 'Cout en or', type: 'number', defaultValue: 0, min: 0 },
    {
      name: 'metierId',
      label: 'Métier requis',
      type: 'select',
      options: [{ value: '', label: '— Aucun —' }, ...allMetiers.map(m => ({ value: m.id, label: m.nom }))],
    },
    { name: 'niveauMetierRequis', label: 'Niveau métier requis', type: 'number', defaultValue: 1, min: 1 },
    { name: 'xpCraft', label: 'XP craft gagné', type: 'number', defaultValue: 10, min: 0 },
  ];

  const handleAddIngredient = async () => {
    if (!selected || !addResId) return;
    await recipesAdminApi.addIngredient(selected.id, { ressourceId: addResId, quantite: addResQty });
    await selectRecipe(selected.id);
    refresh();
    setAddResId(0);
    setAddResQty(1);
  };

  const handleRemoveIngredient = async (ingredientId: number) => {
    if (!selected) return;
    await recipesAdminApi.removeIngredient(selected.id, ingredientId);
    await selectRecipe(selected.id);
    refresh();
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Recettes</h1>
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
        onRowClick={item => selectRecipe(item.id)}
        selectedId={selected?.id}
      />

      {selected && (
        <div className="detail-panel">
          <h3>
            {selected.nom}
            <button className="btn btn-sm btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
          </h3>
          <div className="detail-sections">
            <div className="detail-section">
              <h4>Informations</h4>
              <div className="stat-grid">
                <div className="stat-row">
                  <span className="stat-label">Resultat</span>
                  <span className="stat-value">{selected.equipement?.nom ?? `#${selected.equipementId}`}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Niveau min</span>
                  <span className="stat-value">{selected.niveauMinimum}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Cout or</span>
                  <span className="stat-value">{selected.coutOr}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Métier requis</span>
                  <span className="stat-value">
                    {selected.metier
                      ? `${selected.metier.nom} niv.${selected.niveauMetierRequis ?? 1}`
                      : 'Aucun (libre)'}
                  </span>
                </div>
                {selected.metier && (
                  <div className="stat-row">
                    <span className="stat-label">XP craft</span>
                    <span className="stat-value">+{selected.xpCraft ?? 10} XP</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>Ingredients ({selected.ingredients?.length ?? 0})</h4>
              {selected.ingredients && selected.ingredients.length > 0 ? (
                <div className="sort-list">
                  {selected.ingredients.map(ing => (
                    <div key={ing.id} className="sort-item">
                      <div>
                        <span className="sort-name">{ing.ressource?.nom ?? `Ressource #${ing.ressourceId}`}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          x{ing.quantite}
                        </span>
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveIngredient(ing.id)}>X</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Aucun ingredient</div>
              )}
              <div className="inline-add">
                <select value={addResId} onChange={e => setAddResId(Number(e.target.value))}>
                  <option value={0}>-- Ressource --</option>
                  {allResources.map(r => (
                    <option key={r.id} value={r.id}>{r.nom}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={addResQty}
                  onChange={e => setAddResQty(Number(e.target.value))}
                  min={1}
                  style={{ width: 60 }}
                  placeholder="Qty"
                />
                <button className="btn btn-sm btn-success" onClick={handleAddIngredient} disabled={!addResId}>+ Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editing ? 'Modifier une recette' : 'Creer une recette'}
        fields={fields}
        initialValues={editing || undefined}
        onSubmit={async (vals) => {
          // Convert empty string metierId to null
          const data = { ...vals, metierId: vals.metierId === '' || vals.metierId === 0 ? null : vals.metierId };
          if (editing) await update(editing.id, data);
          else await create(data);
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

export default RecettesPage;
