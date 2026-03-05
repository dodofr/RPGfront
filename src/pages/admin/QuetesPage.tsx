import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { queteApi } from '../../api/quetes';
import { pnjApi } from '../../api/pnj';
import type { Quete, PNJ, QueteEtapeType } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

const TYPE_LABELS: Record<QueteEtapeType, string> = {
  PARLER_PNJ: 'Parler à un PNJ',
  TUER_MONSTRE: 'Tuer des monstres',
  APPORTER_RESSOURCE: 'Apporter une ressource',
  APPORTER_EQUIPEMENT: 'Apporter un équipement',
};

const QuetesPage: React.FC = () => {
  const navigate = useNavigate();
  const [quetes, setQuetes] = useState<Quete[]>([]);
  const [pnjs, setPnjs] = useState<PNJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Quete | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nom: '', description: '', niveauRequis: '1', pnjDepartId: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [q, p] = await Promise.all([queteApi.getAll(), pnjApi.getAll()]);
      setQuetes(q);
      setPnjs(p);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!createForm.nom) { setError('Nom requis'); return; }
    setSaving(true);
    try {
      const q = await queteApi.create({
        nom: createForm.nom,
        description: createForm.description || undefined,
        niveauRequis: Number(createForm.niveauRequis) || 1,
        pnjDepartId: createForm.pnjDepartId ? Number(createForm.pnjDepartId) : undefined,
      });
      setShowCreate(false);
      setCreateForm({ nom: '', description: '', niveauRequis: '1', pnjDepartId: '' });
      navigate(`/admin/quetes/${q.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await queteApi.delete(deleting.id);
    setDeleting(null);
    await refresh();
  };

  const pnjName = (id: number | null | undefined) => id ? (pnjs.find(p => p.id === id)?.nom ?? `PNJ #${id}`) : null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ margin: 0 }}>Quêtes</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{quetes.length} quête{quetes.length !== 1 ? 's' : ''} configurée{quetes.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(v => !v); setError(null); }}>
          {showCreate ? 'Annuler' : '+ Nouvelle quête'}
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
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Nouvelle quête</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Nom *</label>
              <input value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} autoFocus placeholder="Ex : La menace des loups" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea value={createForm.description} rows={2} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} placeholder="Résumé de la quête (optionnel)" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Niveau requis</label>
              <input type="number" min={1} value={createForm.niveauRequis} onChange={e => setCreateForm(f => ({ ...f, niveauRequis: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>PNJ de départ</label>
              <select value={createForm.pnjDepartId} onChange={e => setCreateForm(f => ({ ...f, pnjDepartId: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">-- Aucun --</option>
                {pnjs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
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

      {/* List */}
      {loading ? <p>Chargement...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quetes.length === 0 && !showCreate && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              Aucune quête. Créez-en une pour commencer.
            </div>
          )}
          {quetes.map(q => {
            const depart = pnjName(q.pnjDepartId);
            const etapesPNJ = q.etapes.filter(e => e.type === 'PARLER_PNJ').length;
            const etapesMonstre = q.etapes.filter(e => e.type === 'TUER_MONSTRE').length;
            return (
              <div
                key={q.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 8,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onClick={() => navigate(`/admin/quetes/${q.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* ID badge */}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', width: 32, flexShrink: 0 }}>#{q.id}</div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{q.nom}</span>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>Niv.{q.niveauRequis}</span>
                  </div>
                  {q.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {depart && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Départ : <strong>{depart}</strong></span>}
                    {etapesPNJ > 0 && <span style={{ fontSize: 11, color: 'var(--info)' }}>💬 {etapesPNJ} dialogue{etapesPNJ > 1 ? 's' : ''}</span>}
                    {etapesMonstre > 0 && <span style={{ fontSize: 11, color: 'var(--primary)' }}>⚔ {etapesMonstre} combat{etapesMonstre > 1 ? 's' : ''}</span>}
                    {q.etapes.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune étape</span>}
                    {(q.recompenses?.length ?? 0) > 0 && <span style={{ fontSize: 11, color: 'var(--success)' }}>✓ {q.recompenses.length} récompense{q.recompenses.length > 1 ? 's' : ''}</span>}
                  </div>
                </div>

                {/* Étapes preview */}
                {q.etapes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    {[...q.etapes].sort((a, b) => a.ordre - b.ordre).map(e => (
                      <div
                        key={e.id}
                        title={`Étape ${e.ordre} : ${TYPE_LABELS[e.type as QueteEtapeType]}`}
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: e.type === 'PARLER_PNJ' ? 'var(--info)' : e.type === 'TUER_MONSTRE' ? 'var(--primary)' : e.type === 'APPORTER_RESSOURCE' ? 'var(--warning)' : '#66bb6a',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{q.etapes.length} étape{q.etapes.length > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/quetes/${q.id}`)}>Éditer</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleting(q)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        message={deleting ? `Supprimer la quête "${deleting.nom}" et toutes ses étapes ?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default QuetesPage;
