import React, { useState } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { setsApi } from '../../api/static';
import type { Panoplie, PanoplieBonus } from '../../types';
import '../../styles/admin.css';

const BONUS_STATS = [
  'bonusForce', 'bonusIntelligence', 'bonusDexterite', 'bonusAgilite',
  'bonusVie', 'bonusChance', 'bonusPA', 'bonusPM', 'bonusPO', 'bonusCritique',
] as const;

const STAT_LABELS: Record<string, string> = {
  bonusForce: 'Force', bonusIntelligence: 'Intelligence', bonusDexterite: 'Dexterite',
  bonusAgilite: 'Agilite', bonusVie: 'Vie', bonusChance: 'Chance',
  bonusPA: 'PA', bonusPM: 'PM', bonusPO: 'PO', bonusCritique: 'Critique',
};

const PanopliesPage: React.FC = () => {
  const { items, loading, create, update, remove, refresh } = useCrud(setsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Panoplie | null>(null);
  const [deleting, setDeleting] = useState<Panoplie | null>(null);
  const [selected, setSelected] = useState<Panoplie | null>(null);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [editingBonus, setEditingBonus] = useState<PanoplieBonus | null>(null);

  const selectSet = async (id: number) => {
    const detail = await setsApi.getById(id);
    setSelected(detail);
  };

  const columns: Column<Panoplie>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'description', header: 'Description', render: (item) => item.description || '-' },
    { key: 'equipements', header: 'Equipements', render: (item) => String(item.equipements?.length ?? 0) },
    { key: 'bonus', header: 'Bonus', render: (item) => String(item.bonus?.length ?? 0) },
  ];

  const fields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
  ];

  const bonusFields: FieldDef[] = [
    { name: 'nombrePieces', label: 'Nombre de pieces', type: 'number', required: true, min: 2 },
    ...BONUS_STATS.map(stat => ({
      name: stat,
      label: STAT_LABELS[stat],
      type: 'number' as const,
      defaultValue: 0,
    })),
  ];

  const handleAddBonus = async (vals: Record<string, unknown>) => {
    if (!selected) return;
    if (editingBonus) {
      await setsApi.updateBonus(selected.id, editingBonus.id, vals as Partial<PanoplieBonus>);
    } else {
      await setsApi.addBonus(selected.id, vals as Partial<PanoplieBonus>);
    }
    setShowBonusForm(false);
    setEditingBonus(null);
    await selectSet(selected.id);
    refresh();
  };

  const handleRemoveBonus = async (bonusId: number) => {
    if (!selected) return;
    await setsApi.removeBonus(selected.id, bonusId);
    await selectSet(selected.id);
    refresh();
  };

  const formatBonusStats = (b: PanoplieBonus) => {
    const rec = b as unknown as Record<string, number>;
    return BONUS_STATS
      .filter(stat => rec[stat] !== 0)
      .map(stat => `${STAT_LABELS[stat]} +${rec[stat]}`)
      .join(', ') || 'Aucun';
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Panoplies</h1>
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
        onRowClick={item => selectSet(item.id)}
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
              <h4>Equipements ({selected.equipements?.length ?? 0})</h4>
              {selected.equipements && selected.equipements.length > 0 ? (
                <div className="sort-list">
                  {selected.equipements.map(eq => (
                    <div key={eq.id} className="sort-item">
                      <span className="sort-name">{eq.nom}</span>
                      <span className="sort-meta"><span>{eq.slot}</span><span>Niv. {eq.niveauMinimum}</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Aucun equipement lie. Utilisez le champ panoplieId sur les equipements.
                </div>
              )}
            </div>

            <div className="detail-section">
              <h4>Bonus par palier ({selected.bonus?.length ?? 0})</h4>
              {selected.bonus && selected.bonus.length > 0 ? (
                <div className="sort-list">
                  {selected.bonus.map(b => (
                    <div key={b.id} className="sort-item">
                      <div>
                        <span className="sort-name">{b.nombrePieces} pieces</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatBonusStats(b)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setEditingBonus(b); setShowBonusForm(true); }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRemoveBonus(b.id)}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Aucun bonus</div>
              )}
              <button className="btn btn-sm btn-success" style={{ marginTop: 8 }} onClick={() => { setEditingBonus(null); setShowBonusForm(true); }}>
                + Ajouter bonus
              </button>
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editing ? 'Modifier une panoplie' : 'Creer une panoplie'}
        fields={fields}
        initialValues={editing || undefined}
        onSubmit={async (vals) => {
          if (editing) await update(editing.id, vals);
          else await create(vals);
          setShowForm(false);
        }}
        onCancel={() => setShowForm(false)}
      />
      <FormModal
        open={showBonusForm}
        title={editingBonus ? 'Modifier le bonus' : 'Ajouter un bonus'}
        fields={bonusFields}
        initialValues={editingBonus || undefined}
        onSubmit={handleAddBonus}
        onCancel={() => { setShowBonusForm(false); setEditingBonus(null); }}
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

export default PanopliesPage;
