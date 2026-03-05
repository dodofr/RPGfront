import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pnjApi } from '../../api/pnj';
import { mapsApi } from '../../api/maps';
import type { PNJ, GameMap } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

const PNJPage: React.FC = () => {
  const navigate = useNavigate();
  const [pnjs, setPnjs] = useState<PNJ[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<PNJ | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'tous' | 'marchand' | 'quete'>('tous');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    nom: '', mapId: '', positionX: '0', positionY: '0',
    description: '', estMarchand: false,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, m] = await Promise.all([pnjApi.getAll(), mapsApi.getAll()]);
    setPnjs(p);
    setMaps(m);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!createForm.nom || !createForm.mapId) { setError('Nom et map requis'); return; }
    setSaving(true);
    try {
      const pnj = await pnjApi.create({
        nom: createForm.nom,
        mapId: Number(createForm.mapId),
        positionX: Number(createForm.positionX),
        positionY: Number(createForm.positionY),
        description: createForm.description || null,
        estMarchand: createForm.estMarchand,
      });
      setShowCreate(false);
      setCreateForm({ nom: '', mapId: '', positionX: '0', positionY: '0', description: '', estMarchand: false });
      navigate(`/admin/pnj/${pnj.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await pnjApi.delete(deleting.id);
    setDeleting(null);
    await refresh();
  };

  const mapName = (mapId: number) => maps.find(m => m.id === mapId)?.nom ?? `Map #${mapId}`;

  const marchands = pnjs.filter(p => p.estMarchand);
  const filteredPnjs = pnjs.filter(p => {
    if (filter === 'marchand') return p.estMarchand;
    if (filter === 'quete') return !p.estMarchand;
    return true;
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ margin: 0 }}>PNJ</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {pnjs.length} PNJ · {marchands.length} marchand{marchands.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(v => !v); setError(null); }}>
          {showCreate ? 'Annuler' : '+ Nouveau PNJ'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(233,69,96,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: 16, background: 'var(--bg-light)', border: '1px solid var(--primary)', borderRadius: 8, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Nouveau PNJ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Nom *</label>
              <input value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} autoFocus placeholder="Ex : Chef du village" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Map *</label>
              <select value={createForm.mapId} onChange={e => setCreateForm(f => ({ ...f, mapId: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">-- choisir --</option>
                {maps.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.type})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>X</label>
                <input type="number" value={createForm.positionX} onChange={e => setCreateForm(f => ({ ...f, positionX: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Y</label>
                <input type="number" value={createForm.positionY} onChange={e => setCreateForm(f => ({ ...f, positionY: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Description</label>
              <input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Dialogue d'introduction (optionnel)" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={createForm.estMarchand} onChange={e => setCreateForm(f => ({ ...f, estMarchand: e.target.checked }))} />
                A un inventaire marchand
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(peut aussi donner des quêtes)</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Création...' : 'Créer et éditer →'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['tous', 'marchand', 'quete'] as const).map(f => (
          <button
            key={f}
            className={`tab-btn${filter === f ? ' active' : ''}`}
            style={{ fontSize: 12, padding: '5px 14px' }}
            onClick={() => setFilter(f)}
          >
            {f === 'tous' ? `Tous (${pnjs.length})` : f === 'marchand' ? `Marchands (${pnjs.filter(p => p.estMarchand).length})` : `Sans boutique (${pnjs.filter(p => !p.estMarchand).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? <p>Chargement...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredPnjs.length === 0 && !showCreate && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              Aucun PNJ. Créez-en un pour commencer.
            </div>
          )}
          {filteredPnjs.map(p => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 8,
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onClick={() => navigate(`/admin/pnj/${p.id}`)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* ID */}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', width: 32, flexShrink: 0 }}>#{p.id}</div>

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{p.nom}</span>
                  {p.estMarchand && <span className="badge badge-info" style={{ fontSize: 10 }}>Marchand</span>}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{p.map?.nom ?? mapName(p.mapId)}</span>
                  <span>Position ({p.positionX},{p.positionY})</span>
                  {(p.lignes?.length ?? 0) > 0 && (
                    <span style={{ color: 'var(--info)' }}>{p.lignes!.length} article{p.lignes!.length > 1 ? 's' : ''} en vente</span>
                  )}
                </div>
                {p.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{p.description}"
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/pnj/${p.id}`)}>Éditer</button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleting(p)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" et toutes ses lignes ?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default PNJPage;
