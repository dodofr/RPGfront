import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type Column } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { monstresApi } from '../../api/maps';
import type { MonsterTemplate, IAType } from '../../types';
import '../../styles/admin.css';

type MonsterTab = 'ennemis' | 'invocations';

// Modal de création minimal : type + nom
const CreateModal: React.FC<{
  open: boolean;
  onCancel: () => void;
  onCreate: (nom: string, isInvoc: boolean) => Promise<void>;
}> = ({ open, onCancel, onCreate }) => {
  const [step, setStep] = useState<'type' | 'name'>('type');
  const [isInvoc, setIsInvoc] = useState(false);
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setStep('type'); setIsInvoc(false); setNom(''); setSaving(false); };

  const handleCancel = () => { reset(); onCancel(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    await onCreate(nom.trim(), isInvoc);
    reset();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-header">
          <h3>Créer un monstre</h3>
          <button className="modal-close" onClick={handleCancel}>✕</button>
        </div>
        <div className="modal-body">
          {step === 'type' ? (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '16px 0' }}>
              <button
                className="btn btn-danger"
                style={{ flex: 1, padding: '20px 12px', fontSize: 15 }}
                onClick={() => { setIsInvoc(false); setStep('name'); }}
              >
                👹 Ennemi
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Drops, régions, XP</div>
              </button>
              <button
                className="btn btn-warning"
                style={{ flex: 1, padding: '20px 12px', fontSize: 15 }}
                onClick={() => { setIsInvoc(true); setStep('name'); }}
              >
                ✨ Invocation
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Sorts d'invocation</div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Nom du {isInvoc ? 'familier / invocation' : 'monstre'}
              </label>
              <input
                autoFocus
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder={isInvoc ? 'Ex : Golem de pierre' : 'Ex : Gobelin des bois'}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep('type')}>← Retour</button>
                <button type="submit" className="btn btn-primary" disabled={!nom.trim() || saving}>
                  {saving ? 'Création...' : 'Créer et configurer →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const MonstresPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, create, remove } = useCrud(monstresApi);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<MonsterTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<MonsterTab>('ennemis');

  const isInvocation = (m: MonsterTemplate) => m.xpRecompense === 0 || m.pvScalingInvocation !== null;

  const filteredItems = items.filter(m =>
    activeTab === 'ennemis' ? !isInvocation(m) : isInvocation(m)
  );

  const handleCreate = async (nom: string, isInvoc: boolean) => {
    const payload: Partial<MonsterTemplate> & { pvScalingInvocation?: number | null } = {
      nom,
      force: 10, intelligence: 10, dexterite: 10, agilite: 10,
      vie: 10, chance: 10, pvBase: 50, paBase: 6, pmBase: 3,
      niveauBase: 1, xpRecompense: isInvoc ? 0 : 10,
      orMin: 0, orMax: 0, iaType: 'EQUILIBRE' as IAType,
      pvScalingInvocation: isInvoc ? 0.5 : null,
    };
    const created = await create(payload);
    setShowCreate(false);
    navigate(`/admin/monstres/${created.id}`);
  };

  const columns: Column<MonsterTemplate>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'force', header: 'FOR' },
    { key: 'intelligence', header: 'INT' },
    { key: 'agilite', header: 'AGI' },
    { key: 'vie', header: 'VIE' },
    { key: 'niveauBase', header: 'Niv.' },
    { key: 'xpRecompense', header: 'XP' },
    {
      key: 'iaType',
      header: 'IA',
      render: (item) => <span className="badge badge-muted">{item.iaType}</span>,
    },
    ...(activeTab === 'invocations' ? [{
      key: 'pvScalingInvocation' as keyof MonsterTemplate,
      header: 'PV Scaling',
      render: (item: MonsterTemplate) => item.pvScalingInvocation !== null ? `${item.pvScalingInvocation}` : '-',
    }] : []),
  ];

  const tabs = [
    { key: 'ennemis' as MonsterTab, label: 'Ennemis', count: items.filter(m => !isInvocation(m)).length },
    { key: 'invocations' as MonsterTab, label: 'Invocations', count: items.filter(m => isInvocation(m)).length },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Monstres</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Créer</button>
      </div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={filteredItems}
        loading={loading}
        onDelete={item => setDeleting(item)}
        onRowClick={item => navigate(`/admin/monstres/${item.id}`)}
      />

      <CreateModal
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" ?`}
        onConfirm={async () => { if (deleting) { await remove(deleting.id); setDeleting(null); } }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default MonstresPage;
