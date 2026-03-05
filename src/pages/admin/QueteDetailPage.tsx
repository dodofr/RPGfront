import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { queteApi } from '../../api/quetes';
import { pnjApi } from '../../api/pnj';
import { equipmentApi, resourcesApi } from '../../api/static';
import type { Quete, QueteEtape, QueteRecompense, QueteEtapeType, PNJ, Equipment, Ressource } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

const TYPE_LABELS: Record<QueteEtapeType, string> = {
  PARLER_PNJ: 'Parler à un PNJ',
  TUER_MONSTRE: 'Tuer des monstres',
  APPORTER_RESSOURCE: 'Apporter une ressource',
  APPORTER_EQUIPEMENT: 'Apporter un équipement',
};

// ─── Étape row (affichage + édition inline) ─────────────────────────────────

const EtapeRow: React.FC<{
  etape: QueteEtape;
  pnjs: PNJ[];
  monstres: { id: number; nom: string }[];
  ressources: Ressource[];
  equipements: Equipment[];
  queteId: number;
  isLast: boolean;
  onRefresh: () => Promise<void>;
  onDelete: (e: QueteEtape) => void;
}> = ({ etape, pnjs, monstres, ressources, equipements, queteId, isLast, onRefresh, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: etape.description,
    type: etape.type,
    pnjId: etape.pnjId?.toString() ?? '',
    monstreTemplateId: etape.monstreTemplateId?.toString() ?? '',
    quantite: etape.quantite?.toString() ?? '',
    ressourceId: etape.ressourceId?.toString() ?? '',
    equipementId: etape.equipementId?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await queteApi.updateEtape(queteId, etape.id, {
        description: form.description,
        type: form.type,
        pnjId: form.pnjId ? Number(form.pnjId) : null,
        monstreTemplateId: form.monstreTemplateId ? Number(form.monstreTemplateId) : null,
        quantite: form.quantite ? Number(form.quantite) : null,
        ressourceId: form.ressourceId ? Number(form.ressourceId) : null,
        equipementId: form.equipementId ? Number(form.equipementId) : null,
      });
      await onRefresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const dotColor =
    etape.type === 'PARLER_PNJ' ? 'var(--info)' :
    etape.type === 'TUER_MONSTRE' ? 'var(--primary)' :
    etape.type === 'APPORTER_RESSOURCE' ? 'var(--warning)' :
    '#66bb6a';
  const isBlue = etape.type === 'PARLER_PNJ';
  const pnjName = etape.pnj?.nom ?? pnjs.find(p => p.id === etape.pnjId)?.nom ?? `PNJ #${etape.pnjId}`;
  const monstreName = etape.monstreTemplate?.nom ?? monstres.find(m => m.id === etape.monstreTemplateId)?.nom ?? `Monstre #${etape.monstreTemplateId}`;
  const ressourceName = etape.ressource?.nom ?? ressources.find(r => r.id === etape.ressourceId)?.nom ?? `Ressource #${etape.ressourceId}`;
  const equipementName = etape.equipement?.nom ?? equipements.find(e => e.id === etape.equipementId)?.nom ?? `Équipement #${etape.equipementId}`;

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 36, flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: `${dotColor}33`,
          border: `2px solid ${dotColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          color: dotColor,
        }}>
          {etape.ordre}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 12, background: 'var(--border)', margin: '3px 0' }} />
        )}
      </div>

      {/* Card */}
      <div style={{ flex: 1, marginLeft: 12, marginBottom: isLast ? 0 : 16 }}>
        {editing ? (
          <div style={{ padding: 14, background: 'var(--bg)', border: `1px solid ${isBlue ? 'var(--info)' : 'var(--primary)'}`, borderRadius: 8 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Type d'étape</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as QueteEtapeType, pnjId: '', monstreTemplateId: '', quantite: '', ressourceId: '', equipementId: '' }))} style={{ width: '100%' }}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {form.type === 'PARLER_PNJ' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>PNJ cible</label>
                <select value={form.pnjId} onChange={e => setForm(f => ({ ...f, pnjId: e.target.value }))} style={{ width: '100%' }}>
                  <option value="">-- Sélectionner un PNJ --</option>
                  {pnjs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
            )}
            {form.type === 'TUER_MONSTRE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Monstre cible</label>
                  <select value={form.monstreTemplateId} onChange={e => setForm(f => ({ ...f, monstreTemplateId: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">-- Sélectionner un monstre --</option>
                    {monstres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Quantité</label>
                  <input type="number" min={1} value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
            )}
            {(form.type === 'APPORTER_RESSOURCE' || form.type === 'APPORTER_EQUIPEMENT') && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>PNJ destinataire</label>
                <select value={form.pnjId} onChange={e => setForm(f => ({ ...f, pnjId: e.target.value }))} style={{ width: '100%' }}>
                  <option value="">-- Sélectionner un PNJ --</option>
                  {pnjs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              </div>
            )}
            {form.type === 'APPORTER_RESSOURCE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Ressource requise</label>
                  <select value={form.ressourceId} onChange={e => setForm(f => ({ ...f, ressourceId: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">-- Sélectionner --</option>
                    {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Quantité</label>
                  <input type="number" min={1} value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
            )}
            {form.type === 'APPORTER_EQUIPEMENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Équipement requis</label>
                  <select value={form.equipementId} onChange={e => setForm(f => ({ ...f, equipementId: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">-- Sélectionner --</option>
                    {equipements.map(eq => <option key={eq.id} value={eq.id}>{eq.nom} ({eq.slot})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Quantité</label>
                  <input type="number" min={1} value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Description (affichée au joueur)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex : Va voir le garde du village" />
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                  background: `${dotColor}22`, color: dotColor, border: `1px solid ${dotColor}55`,
                }}>
                  {etape.type === 'PARLER_PNJ' ? '💬' : etape.type === 'TUER_MONSTRE' ? '⚔' : etape.type === 'APPORTER_RESSOURCE' ? '📦' : '🛡'} {TYPE_LABELS[etape.type]}
                </span>
                {etape.type === 'PARLER_PNJ' && etape.pnjId && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{pnjName}</span>
                )}
                {etape.type === 'TUER_MONSTRE' && etape.monstreTemplateId && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{etape.quantite}× {monstreName}</span>
                )}
                {etape.type === 'APPORTER_RESSOURCE' && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {etape.quantite ?? 1}× {ressourceName}{etape.pnjId ? ` → ${pnjName}` : ''}
                  </span>
                )}
                {etape.type === 'APPORTER_EQUIPEMENT' && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {etape.quantite ?? 1}× {equipementName}{etape.pnjId ? ` → ${pnjName}` : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{etape.description}"</div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Éditer</button>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(etape)}>✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page principale ─────────────────────────────────────────────────────────

const QueteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quete, setQuete] = useState<Quete | null>(null);
  const [pnjs, setPnjs] = useState<PNJ[]>([]);
  const [equipements, setEquipements] = useState<Equipment[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [monstres, setMonstres] = useState<{ id: number; nom: string }[]>([]);
  const [allQuetes, setAllQuetes] = useState<{ id: number; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingPrerequisId, setAddingPrerequisId] = useState('');

  // Confirmation suppression
  const [deletingQuete, setDeletingQuete] = useState(false);
  const [deletingEtape, setDeletingEtape] = useState<QueteEtape | null>(null);
  const [deletingRecompense, setDeletingRecompense] = useState<QueteRecompense | null>(null);

  // Champs éditables quête
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [niveauRequis, setNiveauRequis] = useState(1);
  const [pnjDepartId, setPnjDepartId] = useState<number | ''>('');

  // Formulaire ajout étape
  const [showAddEtape, setShowAddEtape] = useState(false);
  const [etapeForm, setEtapeForm] = useState<{ description: string; type: QueteEtapeType; pnjId: string; monstreTemplateId: string; quantite: string; ressourceId: string; equipementId: string }>({
    description: '', type: 'PARLER_PNJ', pnjId: '', monstreTemplateId: '', quantite: '', ressourceId: '', equipementId: '',
  });

  // Formulaire ajout récompense
  const [showAddRecompense, setShowAddRecompense] = useState(false);
  const [recompenseForm, setRecompenseForm] = useState({ xp: '0', or: '0', ressourceId: '', quantiteRessource: '1', equipementId: '' });

  const loadQuete = useCallback(async () => {
    if (!id) return;
    const q = await queteApi.getById(Number(id));
    setQuete(q);
    setNom(q.nom);
    setDescription(q.description ?? '');
    setNiveauRequis(q.niveauRequis);
    setPnjDepartId(q.pnjDepartId ?? '');
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadQuete(),
      pnjApi.getAll().then(setPnjs),
      equipmentApi.getAll().then(setEquipements),
      resourcesApi.getAll().then(setRessources),
      fetch('/api/monstres').then(r => r.json()).then(setMonstres).catch(() => {}),
      queteApi.getAll().then(list => setAllQuetes(list.map(q => ({ id: q.id, nom: q.nom })))),
    ]).finally(() => setLoading(false));
  }, [loadQuete]);

  const handleSave = async () => {
    if (!quete) return;
    setSaving(true);
    try {
      await queteApi.update(quete.id, {
        nom, description: description || null,
        niveauRequis,
        pnjDepartId: pnjDepartId !== '' ? pnjDepartId : null,
      });
      await loadQuete();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrerequisite = async () => {
    if (!quete || !addingPrerequisId) return;
    try {
      await queteApi.addPrerequisite(quete.id, Number(addingPrerequisId));
      setAddingPrerequisId('');
      await loadQuete();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  const handleRemovePrerequisite = async (prerequisId: number) => {
    if (!quete) return;
    await queteApi.removePrerequisite(quete.id, prerequisId);
    await loadQuete();
  };

  const handleDeleteQuete = async () => {
    if (!quete) return;
    await queteApi.delete(quete.id);
    navigate('/admin/quetes');
  };

  const nextOrdre = quete ? (quete.etapes.length > 0 ? Math.max(...quete.etapes.map(e => e.ordre)) + 1 : 1) : 1;

  const handleAddEtape = async () => {
    if (!quete || !etapeForm.description) { setError('Description requise'); return; }
    setSaving(true);
    try {
      await queteApi.addEtape(quete.id, {
        ordre: nextOrdre,
        description: etapeForm.description,
        type: etapeForm.type,
        pnjId: etapeForm.pnjId ? Number(etapeForm.pnjId) : undefined,
        monstreTemplateId: etapeForm.monstreTemplateId ? Number(etapeForm.monstreTemplateId) : undefined,
        quantite: etapeForm.quantite ? Number(etapeForm.quantite) : undefined,
        ressourceId: etapeForm.ressourceId ? Number(etapeForm.ressourceId) : undefined,
        equipementId: etapeForm.equipementId ? Number(etapeForm.equipementId) : undefined,
      });
      setEtapeForm({ description: '', type: 'PARLER_PNJ', pnjId: '', monstreTemplateId: '', quantite: '', ressourceId: '', equipementId: '' });
      setShowAddEtape(false);
      await loadQuete();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEtape = async () => {
    if (!deletingEtape || !quete) return;
    await queteApi.deleteEtape(quete.id, deletingEtape.id);
    setDeletingEtape(null);
    await loadQuete();
  };

  const handleAddRecompense = async () => {
    if (!quete) return;
    setSaving(true);
    try {
      await queteApi.addRecompense(quete.id, {
        xp: Number(recompenseForm.xp) || 0,
        or: Number(recompenseForm.or) || 0,
        ressourceId: recompenseForm.ressourceId ? Number(recompenseForm.ressourceId) : undefined,
        quantiteRessource: recompenseForm.quantiteRessource ? Number(recompenseForm.quantiteRessource) : undefined,
        equipementId: recompenseForm.equipementId ? Number(recompenseForm.equipementId) : undefined,
      });
      setRecompenseForm({ xp: '0', or: '0', ressourceId: '', quantiteRessource: '1', equipementId: '' });
      setShowAddRecompense(false);
      await loadQuete();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecompense = async () => {
    if (!deletingRecompense || !quete) return;
    await queteApi.deleteRecompense(quete.id, deletingRecompense.id);
    setDeletingRecompense(null);
    await loadQuete();
  };

  if (loading) return <div className="loading">Chargement...</div>;
  if (!quete) return <div style={{ padding: 32, color: 'var(--danger)' }}>Quête introuvable.</div>;

  const sortedEtapes = [...quete.etapes].sort((a, b) => a.ordre - b.ordre);
  const pnjDepart = pnjs.find(p => p.id === pnjDepartId);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div className="detail-page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/quetes')}>
          ← Retour
        </button>
        <div className="detail-page-title">
          <input
            className="detail-page-name-input"
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Nom de la quête"
          />
          <span className="badge badge-muted" style={{ fontSize: 11 }}>Quête #{quete.id}</span>
          <span className="badge badge-muted" style={{ fontSize: 11 }}>Niv.{niveauRequis}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setDeletingQuete(true)}>Supprimer</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(233,69,96,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="detail-page-body">

        {/* ── Colonne gauche : infos + récompenses ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Informations générales */}
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Informations</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea
                  value={description}
                  rows={3}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Résumé affiché dans le journal de quête"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Niv. requis</label>
                  <input type="number" min={1} value={niveauRequis} onChange={e => setNiveauRequis(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>PNJ de départ</label>
                  <select value={pnjDepartId} onChange={e => setPnjDepartId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', boxSizing: 'border-box' }}>
                    <option value="">-- Aucun --</option>
                    {pnjs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              </div>
              {pnjDepart && (
                <div style={{ padding: '6px 10px', background: 'rgba(100,181,246,0.1)', border: '1px solid rgba(100,181,246,0.3)', borderRadius: 6, fontSize: 12, color: 'var(--info)' }}>
                  La quête est donnée par <strong>{pnjDepart.nom}</strong> sur la map {pnjDepart.map?.nom ?? `#${pnjDepart.mapId}`} en ({pnjDepart.positionX},{pnjDepart.positionY})
                </div>
              )}
            </div>
          </div>

          {/* Prérequis */}
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Prérequis</h3>
            </div>

            {(quete.prerequis ?? []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '4px 0 8px' }}>
                Aucun prérequis — accessible à tous.
              </div>
            )}
            {(quete.prerequis ?? []).map(p => (
              <div key={p.prerequisId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(100,181,246,0.08)', border: '1px solid rgba(100,181,246,0.25)', borderRadius: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>🔒 <strong>{p.prerequis.nom}</strong> (#{p.prerequisId})</span>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemovePrerequisite(p.prerequisId)}>✕</button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <select value={addingPrerequisId} onChange={e => setAddingPrerequisId(e.target.value)} style={{ flex: 1 }}>
                <option value="">-- Ajouter un prérequis --</option>
                {allQuetes
                  .filter(q => q.id !== quete.id && !(quete.prerequis ?? []).some(p => p.prerequisId === q.id))
                  .map(q => <option key={q.id} value={q.id}>{q.nom}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" disabled={!addingPrerequisId} onClick={handleAddPrerequisite}>
                Ajouter
              </button>
            </div>
          </div>

          {/* Récompenses */}
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Récompenses</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowAddRecompense(v => !v); setError(null); }}>
                {showAddRecompense ? 'Annuler' : '+ Ajouter'}
              </button>
            </div>

            {showAddRecompense && (
              <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>XP</span>
                    <input type="number" min={0} value={recompenseForm.xp} onChange={e => setRecompenseForm(p => ({ ...p, xp: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Or</span>
                    <input type="number" min={0} value={recompenseForm.or} onChange={e => setRecompenseForm(p => ({ ...p, or: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select value={recompenseForm.ressourceId} onChange={e => setRecompenseForm(p => ({ ...p, ressourceId: e.target.value }))} style={{ flex: 1 }}>
                    <option value="">-- Ressource (optionnel) --</option>
                    {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                  {recompenseForm.ressourceId && (
                    <input type="number" min={1} placeholder="Qté" value={recompenseForm.quantiteRessource} onChange={e => setRecompenseForm(p => ({ ...p, quantiteRessource: e.target.value }))} style={{ width: 70 }} />
                  )}
                </div>
                <select value={recompenseForm.equipementId} onChange={e => setRecompenseForm(p => ({ ...p, equipementId: e.target.value }))} style={{ width: '100%', marginBottom: 10 }}>
                  <option value="">-- Équipement (optionnel) --</option>
                  {equipements.map(e => <option key={e.id} value={e.id}>{e.nom} ({e.slot})</option>)}
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRecompense(false)}>Annuler</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddRecompense} disabled={saving}>Ajouter</button>
                </div>
              </div>
            )}

            {quete.recompenses.length === 0 && !showAddRecompense && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                Aucune récompense.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quete.recompenses.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {r.xp > 0 && <span className="badge badge-success">+{r.xp} XP</span>}
                    {r.or > 0 && <span style={{ fontSize: 13, color: '#ffd54f', fontWeight: 600 }}>+{r.or} or</span>}
                    {r.ressource && <span style={{ fontSize: 13 }}>{r.quantiteRessource}× <strong>{r.ressource.nom}</strong></span>}
                    {r.equipement && <span style={{ fontSize: 13 }}>Équip: <strong>{r.equipement.nom}</strong></span>}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeletingRecompense(r)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Colonne droite : étapes ── */}
        <div className="detail-page-section" style={{ alignSelf: 'start' }}>
          <div className="detail-page-section-header">
            <h3>Étapes ({sortedEtapes.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddEtape(v => !v); setError(null); }}>
              {showAddEtape ? 'Annuler' : `+ Étape ${nextOrdre}`}
            </button>
          </div>

          {/* Légende */}
          {sortedEtapes.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--info)', display: 'inline-block' }} />
                Parler à un PNJ
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                Tuer des monstres
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                Apporter une ressource
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#66bb6a', display: 'inline-block' }} />
                Apporter un équipement
              </span>
            </div>
          )}

          {/* Formulaire ajout */}
          {showAddEtape && (
            <div style={{ padding: 14, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 10 }}>Nouvelle étape #{nextOrdre}</div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Type</label>
                <select value={etapeForm.type} onChange={e => setEtapeForm(f => ({ ...f, type: e.target.value as QueteEtapeType, pnjId: '', monstreTemplateId: '', quantite: '', ressourceId: '', equipementId: '' }))} style={{ width: '100%' }}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {etapeForm.type === 'PARLER_PNJ' && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>PNJ cible</label>
                  <select value={etapeForm.pnjId} onChange={e => setEtapeForm(f => ({ ...f, pnjId: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">-- Sélectionner --</option>
                    {pnjs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              )}
              {etapeForm.type === 'TUER_MONSTRE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Monstre cible</label>
                    <select value={etapeForm.monstreTemplateId} onChange={e => setEtapeForm(f => ({ ...f, monstreTemplateId: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">-- Sélectionner --</option>
                      {monstres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Quantité</label>
                    <input type="number" min={1} value={etapeForm.quantite} onChange={e => setEtapeForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
              {(etapeForm.type === 'APPORTER_RESSOURCE' || etapeForm.type === 'APPORTER_EQUIPEMENT') && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>PNJ destinataire</label>
                  <select value={etapeForm.pnjId} onChange={e => setEtapeForm(f => ({ ...f, pnjId: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">-- Sélectionner --</option>
                    {pnjs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
              )}
              {etapeForm.type === 'APPORTER_RESSOURCE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Ressource requise</label>
                    <select value={etapeForm.ressourceId} onChange={e => setEtapeForm(f => ({ ...f, ressourceId: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">-- Sélectionner --</option>
                      {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Quantité</label>
                    <input type="number" min={1} value={etapeForm.quantite} onChange={e => setEtapeForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
              {etapeForm.type === 'APPORTER_EQUIPEMENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Équipement requis</label>
                    <select value={etapeForm.equipementId} onChange={e => setEtapeForm(f => ({ ...f, equipementId: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">-- Sélectionner --</option>
                      {equipements.map(eq => <option key={eq.id} value={eq.id}>{eq.nom} ({eq.slot})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Quantité</label>
                    <input type="number" min={1} value={etapeForm.quantite} onChange={e => setEtapeForm(f => ({ ...f, quantite: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Description *</label>
                <input value={etapeForm.description} onChange={e => setEtapeForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Texte affiché au joueur dans son journal" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddEtape(false)}>Annuler</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddEtape} disabled={saving}>Ajouter</button>
              </div>
            </div>
          )}

          {sortedEtapes.length === 0 && !showAddEtape && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucune étape. Utilisez "+ Étape 1" pour commencer.
            </div>
          )}

          <div>
            {sortedEtapes.map((etape, idx) => (
              <EtapeRow
                key={etape.id}
                etape={etape}
                pnjs={pnjs}
                monstres={monstres}
                ressources={ressources}
                equipements={equipements}
                queteId={quete.id}
                isLast={idx === sortedEtapes.length - 1}
                onRefresh={loadQuete}
                onDelete={setDeletingEtape}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Confirms ── */}
      <ConfirmDialog
        open={deletingQuete}
        message={`Supprimer la quête "${quete.nom}" et toutes ses étapes ?`}
        onConfirm={handleDeleteQuete}
        onCancel={() => setDeletingQuete(false)}
      />
      <ConfirmDialog
        open={!!deletingEtape}
        message={deletingEtape ? `Supprimer l'étape #${deletingEtape.ordre} — "${deletingEtape.description}" ?` : ''}
        onConfirm={handleDeleteEtape}
        onCancel={() => setDeletingEtape(null)}
      />
      <ConfirmDialog
        open={!!deletingRecompense}
        message="Supprimer cette récompense ?"
        onConfirm={handleDeleteRecompense}
        onCancel={() => setDeletingRecompense(null)}
      />
    </div>
  );
};

export default QueteDetailPage;
