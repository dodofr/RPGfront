import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type Column } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { equipmentApi } from '../../api/static';
import type { Equipment, SlotType } from '../../types';
import '../../styles/admin.css';

const SLOT_OPTIONS: SlotType[] = ['ARME', 'COIFFE', 'AMULETTE', 'BOUCLIER', 'HAUT', 'BAS', 'ANNEAU1', 'ANNEAU2', 'FAMILIER'];

const CreateModal: React.FC<{
  open: boolean;
  onCancel: () => void;
  onCreate: (nom: string, slot: SlotType) => Promise<void>;
}> = ({ open, onCancel, onCreate }) => {
  const [nom, setNom] = useState('');
  const [slot, setSlot] = useState<SlotType>('ARME');
  const [saving, setSaving] = useState(false);

  const reset = () => { setNom(''); setSlot('ARME'); setSaving(false); };
  const handleCancel = () => { reset(); onCancel(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    await onCreate(nom.trim(), slot);
    reset();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-header">
          <h3>Créer un équipement</h3>
          <button className="modal-close" onClick={handleCancel}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Slot
              </label>
              <select value={slot} onChange={e => setSlot(e.target.value as SlotType)}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 14 }}>
                {SLOT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Nom
              </label>
              <input
                autoFocus
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder={slot === 'ARME' ? 'Ex : Épée en fer' : 'Ex : Casque de guerrier'}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={!nom.trim() || saving}>
                {saving ? 'Création...' : 'Créer et configurer →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EquipementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, create, remove } = useCrud(equipmentApi);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<Equipment | null>(null);

  const handleCreate = async (nom: string, slot: SlotType) => {
    const created = await create({ nom, slot, niveauMinimum: 1, poids: 1 });
    setShowCreate(false);
    navigate(`/admin/equipements/${created.id}`);
  };

  const formatStat = (item: Equipment, stat: string, max: string) => {
    const rec = item as unknown as Record<string, number | null>;
    const val = rec[stat] ?? 0;
    const maxVal = rec[max];
    if (maxVal && maxVal > 0 && maxVal !== val) return `${val}-${maxVal}`;
    return val ? String(val) : '';
  };

  const columns: Column<Equipment>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'slot', header: 'Slot' },
    { key: 'niveauMinimum', header: 'Niv.' },
    { key: 'poids', header: 'Poids' },
    { key: 'bonusForce', header: 'FOR', render: (item) => formatStat(item, 'bonusForce', 'bonusForceMax') },
    { key: 'bonusIntelligence', header: 'INT', render: (item) => formatStat(item, 'bonusIntelligence', 'bonusIntelligenceMax') },
    { key: 'bonusAgilite', header: 'AGI', render: (item) => formatStat(item, 'bonusAgilite', 'bonusAgiliteMax') },
    { key: 'bonusVie', header: 'VIE', render: (item) => formatStat(item, 'bonusVie', 'bonusVieMax') },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Equipements</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Créer</button>
      </div>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onDelete={item => setDeleting(item)}
        onRowClick={item => navigate(`/admin/equipements/${item.id}`)}
      />

      <CreateModal open={showCreate} onCancel={() => setShowCreate(false)} onCreate={handleCreate} />

      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" ?`}
        onConfirm={async () => { if (deleting) { await remove(deleting.id); setDeleting(null); } }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default EquipementsPage;
