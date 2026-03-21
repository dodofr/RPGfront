import React, { useState, useEffect, useCallback } from 'react';
import { metiersApi } from '../../api/metiers';
import { resourcesApi } from '../../api/static';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Metier, NoeudRecolte, NoeudRessource, Ressource } from '../../types';
import '../../styles/admin.css';

const MetiersPage: React.FC = () => {
  const [metiers, setMetiers] = useState<Metier[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedMetier, setExpandedMetier] = useState<number | null>(null);
  const [expandedNoeud, setExpandedNoeud] = useState<number | null>(null);

  // Metier form
  const [showMetierForm, setShowMetierForm] = useState(false);
  const [editingMetier, setEditingMetier] = useState<Metier | null>(null);
  const [metierNom, setMetierNom] = useState('');
  const [metierDesc, setMetierDesc] = useState('');
  const [metierType, setMetierType] = useState<'RECOLTE' | 'CRAFT'>('RECOLTE');
  const [deletingMetier, setDeletingMetier] = useState<Metier | null>(null);

  // Noeud form (RECOLTE only)
  const [showNoeudForm, setShowNoeudForm] = useState<number | null>(null);
  const [editingNoeud, setEditingNoeud] = useState<NoeudRecolte | null>(null);
  const [noeudNom, setNoeudNom] = useState('');
  const [noeudImageUrl, setNoeudImageUrl] = useState('');
  const [noeudNiveauMin, setNoeudNiveauMin] = useState(1);
  const [noeudXpRecolte, setNoeudXpRecolte] = useState(10);
  const [deletingNoeud, setDeletingNoeud] = useState<NoeudRecolte | null>(null);

  // Loot form
  const [showLootForm, setShowLootForm] = useState<number | null>(null);
  const [editingLoot, setEditingLoot] = useState<NoeudRessource | null>(null);
  const [lootNiveauRequis, setLootNiveauRequis] = useState(1);
  const [lootRessourceId, setLootRessourceId] = useState<number | ''>('');
  const [lootQteMin, setLootQteMin] = useState(1);
  const [lootQteMax, setLootQteMax] = useState(1);
  const [lootTauxDrop, setLootTauxDrop] = useState(1.0);
  const [deletingLoot, setDeletingLoot] = useState<NoeudRessource | null>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, rs] = await Promise.all([metiersApi.getAll(), resourcesApi.getAll()]);
      setMetiers(ms);
      setRessources(rs);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Métier handlers ───────────────────────────────────────────────────────

  const openMetierForm = (m?: Metier, defaultType?: 'RECOLTE' | 'CRAFT') => {
    setEditingMetier(m ?? null);
    setMetierNom(m?.nom ?? '');
    setMetierDesc(m?.description ?? '');
    setMetierType(m?.type ?? defaultType ?? 'RECOLTE');
    setShowMetierForm(true);
  };

  const handleSaveMetier = async () => {
    if (!metierNom.trim()) return;
    setSaving(true);
    try {
      if (editingMetier) {
        await metiersApi.update(editingMetier.id, { nom: metierNom, description: metierDesc || undefined, type: metierType });
      } else {
        await metiersApi.create({ nom: metierNom, description: metierDesc || undefined, type: metierType });
      }
      setShowMetierForm(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMetier = async () => {
    if (!deletingMetier) return;
    try {
      await metiersApi.remove(deletingMetier.id);
      setDeletingMetier(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  // ── Noeud handlers ────────────────────────────────────────────────────────

  const openNoeudForm = (metierId: number, n?: NoeudRecolte) => {
    setEditingNoeud(n ?? null);
    setNoeudNom(n?.nom ?? '');
    setNoeudImageUrl(n?.imageUrl ?? '');
    setNoeudNiveauMin(n?.niveauMinAcces ?? 1);
    setNoeudXpRecolte(n?.xpRecolte ?? 10);
    setShowNoeudForm(metierId);
  };

  const handleSaveNoeud = async () => {
    if (!noeudNom.trim() || showNoeudForm === null) return;
    setSaving(true);
    try {
      if (editingNoeud) {
        await metiersApi.updateNoeud(editingNoeud.id, { nom: noeudNom, imageUrl: noeudImageUrl || null, niveauMinAcces: noeudNiveauMin, xpRecolte: noeudXpRecolte });
      } else {
        await metiersApi.createNoeud(showNoeudForm, { nom: noeudNom, imageUrl: noeudImageUrl || undefined, niveauMinAcces: noeudNiveauMin, xpRecolte: noeudXpRecolte });
      }
      setShowNoeudForm(null);
      setEditingNoeud(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNoeud = async () => {
    if (!deletingNoeud) return;
    try {
      await metiersApi.removeNoeud(deletingNoeud.id);
      setDeletingNoeud(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  // ── Loot handlers ─────────────────────────────────────────────────────────

  const openLootForm = (noeudId: number, l?: NoeudRessource) => {
    setEditingLoot(l ?? null);
    setLootNiveauRequis(l?.niveauRequis ?? 1);
    setLootRessourceId(l?.ressourceId ?? '');
    setLootQteMin(l?.quantiteMin ?? 1);
    setLootQteMax(l?.quantiteMax ?? 1);
    setLootTauxDrop(l?.tauxDrop ?? 1.0);
    setShowLootForm(noeudId);
  };

  const handleSaveLoot = async () => {
    if (!lootRessourceId || showLootForm === null) return;
    setSaving(true);
    try {
      if (editingLoot) {
        await metiersApi.updateNoeudRessource(editingLoot.id, { niveauRequis: lootNiveauRequis, quantiteMin: lootQteMin, quantiteMax: lootQteMax, tauxDrop: lootTauxDrop });
      } else {
        await metiersApi.addNoeudRessource(showLootForm, { niveauRequis: lootNiveauRequis, ressourceId: Number(lootRessourceId), quantiteMin: lootQteMin, quantiteMax: lootQteMax, tauxDrop: lootTauxDrop });
      }
      setShowLootForm(null);
      setEditingLoot(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLoot = async () => {
    if (!deletingLoot) return;
    try {
      await metiersApi.removeNoeudRessource(deletingLoot.id);
      setDeletingLoot(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 };
  const sectionStyle: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 };

  const recolteMetiers = metiers.filter(m => m.type === 'RECOLTE');
  const craftMetiers = metiers.filter(m => m.type === 'CRAFT');

  const renderMetierHeader = (metier: Metier, badge: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setExpandedMetier(prev => prev === metier.id ? null : metier.id)}>
      <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{expandedMetier === metier.id ? '▼' : '▶'}</span>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{metier.nom}</span>
        {metier.description && <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 10 }}>{metier.description}</span>}
        {badge}
      </div>
      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-secondary btn-sm" onClick={() => openMetierForm(metier)}>✎</button>
        <button className="btn btn-danger btn-sm" onClick={() => setDeletingMetier(metier)}>✕</button>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Métiers</h1>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(233,69,96,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* ── Formulaire métier ── */}
      {showMetierForm && (
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 12px' }}>{editingMetier ? 'Modifier le métier' : 'Nouveau métier'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input value={metierNom} onChange={e => setMetierNom(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="ex: Bûcheron" />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={metierDesc} onChange={e => setMetierDesc(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Optionnelle" />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={metierType} onChange={e => setMetierType(e.target.value as 'RECOLTE' | 'CRAFT')} style={{ boxSizing: 'border-box' }}>
                <option value="RECOLTE">Récolte</option>
                <option value="CRAFT">Craft</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowMetierForm(false); setEditingMetier(null); }}>Annuler</button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveMetier} disabled={saving || !metierNom.trim()}>
              {saving ? '...' : editingMetier ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════ SECTION RÉCOLTE ══════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, marginTop: 4 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--success)' }}>🌿 Métiers de récolte</h2>
        <span className="badge badge-success" style={{ fontSize: 11 }}>{recolteMetiers.length}</span>
        <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => openMetierForm(undefined, 'RECOLTE')}>+ Récolte</button>
      </div>

      {recolteMetiers.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, marginBottom: 16 }}>Aucun métier de récolte.</div>
      )}

      {recolteMetiers.map(metier => (
        <div key={metier.id} style={{ ...sectionStyle, marginBottom: 10 }}>
          {renderMetierHeader(metier,
            <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: 11 }}>{metier.noeuds?.length ?? 0} nœud(s)</span>
          )}

          {expandedMetier === metier.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Nœuds de récolte</span>
                <button className="btn btn-sm btn-secondary" onClick={() => openNoeudForm(metier.id)}>+ Nœud</button>
              </div>

              {showNoeudForm === metier.id && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={labelStyle}>Nom *</label>
                      <input value={noeudNom} onChange={e => setNoeudNom(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="ex: Chêne" />
                    </div>
                    <div>
                      <label style={labelStyle}>Image URL</label>
                      <input value={noeudImageUrl} onChange={e => setNoeudImageUrl(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="/assets/..." />
                    </div>
                    <div>
                      <label style={labelStyle}>Niv. min</label>
                      <input type="number" min={1} value={noeudNiveauMin} onChange={e => setNoeudNiveauMin(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>XP récolte</label>
                      <input type="number" min={0} value={noeudXpRecolte} onChange={e => setNoeudXpRecolte(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowNoeudForm(null); setEditingNoeud(null); }}>Annuler</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveNoeud} disabled={saving || !noeudNom.trim()}>
                      {saving ? '...' : editingNoeud ? 'Enregistrer' : 'Ajouter'}
                    </button>
                  </div>
                </div>
              )}

              {(!metier.noeuds || metier.noeuds.length === 0) && showNoeudForm !== metier.id && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>Aucun nœud.</div>
              )}

              {metier.noeuds?.map(noeud => (
                <div key={noeud.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setExpandedNoeud(prev => prev === noeud.id ? null : noeud.id)}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{expandedNoeud === noeud.id ? '▼' : '▶'}</span>
                    <span style={{ fontWeight: 600 }}>{noeud.nom}</span>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>Niv. min {noeud.niveauMinAcces}</span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>+{noeud.xpRecolte} XP</span>
                    <span className="badge badge-secondary" style={{ fontSize: 10 }}>{noeud.ressources?.length ?? 0} ressource(s)</span>
                    {noeud.imageUrl && <img src={noeud.imageUrl} alt="" style={{ height: 20, borderRadius: 2 }} />}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => openNoeudForm(metier.id, noeud)}>✎</button>
                      <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }} onClick={() => setDeletingNoeud(noeud)}>✕</button>
                    </div>
                  </div>

                  {expandedNoeud === noeud.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Table de loot</span>
                        <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }} onClick={() => openLootForm(noeud.id)}>+ Ligne</button>
                      </div>

                      {showLootForm === noeud.id && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: 10, marginBottom: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 55px 55px 70px', gap: 8, marginBottom: 8 }}>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 10 }}>Niv. requis</label>
                              <input type="number" min={1} value={lootNiveauRequis} onChange={e => setLootNiveauRequis(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 10 }}>Ressource *</label>
                              <select value={lootRessourceId} onChange={e => setLootRessourceId(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} disabled={!!editingLoot}>
                                <option value="">— Choisir —</option>
                                {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 10 }}>Qté min</label>
                              <input type="number" min={0} value={lootQteMin} onChange={e => setLootQteMin(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 10 }}>Qté max</label>
                              <input type="number" min={1} value={lootQteMax} onChange={e => setLootQteMax(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ ...labelStyle, fontSize: 10 }}>Chance %</label>
                              <input type="number" min={1} max={100} value={Math.round(lootTauxDrop * 100)} onChange={e => setLootTauxDrop(Math.min(1, Math.max(0.01, Number(e.target.value) / 100)))} style={{ width: '100%', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => { setShowLootForm(null); setEditingLoot(null); }}>Annuler</button>
                            <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={handleSaveLoot} disabled={saving || !lootRessourceId}>
                              {saving ? '...' : editingLoot ? 'Enregistrer' : 'Ajouter'}
                            </button>
                          </div>
                        </div>
                      )}

                      {(!noeud.ressources || noeud.ressources.length === 0) && showLootForm !== noeud.id && (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>Aucune ligne de loot.</div>
                      )}

                      {noeud.ressources && noeud.ressources.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Niv. requis</th>
                              <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Ressource</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Quantité</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Chance</th>
                              <th style={{ width: 60, borderBottom: '1px solid var(--border)' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...noeud.ressources].sort((a, b) => a.niveauRequis - b.niveauRequis || a.ressourceId - b.ressourceId).map(lr => (
                              <tr key={lr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '4px 6px' }}><span className="badge badge-muted" style={{ fontSize: 11 }}>Niv. {lr.niveauRequis}</span></td>
                                <td style={{ padding: '4px 6px' }}>{lr.ressource?.nom ?? `#${lr.ressourceId}`}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>{lr.quantiteMin === lr.quantiteMax ? lr.quantiteMin : `${lr.quantiteMin}–${lr.quantiteMax}`}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                  <span style={{ color: lr.tauxDrop >= 1 ? 'var(--success)' : lr.tauxDrop >= 0.5 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }}>
                                    {Math.round(lr.tauxDrop * 100)}%
                                  </span>
                                </td>
                                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => openLootForm(noeud.id, lr)}>✎</button>
                                    <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => setDeletingLoot(lr)}>✕</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ══════════════════════════ SECTION CRAFT ═══════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, marginTop: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--primary)' }}>⚒️ Métiers de craft</h2>
        <span className="badge badge-primary" style={{ fontSize: 11 }}>{craftMetiers.length}</span>
        <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => openMetierForm(undefined, 'CRAFT')}>+ Craft</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 0, marginBottom: 12 }}>
        Les recettes associées à ces métiers se configurent dans la page Équipements (section Recette) ou Recettes.
      </p>

      {craftMetiers.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13, marginBottom: 16 }}>Aucun métier de craft.</div>
      )}

      {craftMetiers.map(metier => (
        <div key={metier.id} style={{ ...sectionStyle, marginBottom: 10 }}>
          {renderMetierHeader(metier,
            <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: 11 }}>{metier.recettes?.length ?? 0} recette(s)</span>
          )}

          {expandedMetier === metier.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Recettes liées</span>
              {(!metier.recettes || metier.recettes.length === 0) ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
                  Aucune recette. Assignez ce métier depuis la page Équipements ou Recettes.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Recette</th>
                      <th style={{ textAlign: 'center', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>Niv. requis</th>
                      <th style={{ textAlign: 'center', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11 }}>XP craft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...metier.recettes!].sort((a, b) => a.niveauMetierRequis - b.niveauMetierRequis).map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 8px' }}>{r.nom}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <span className="badge badge-muted" style={{ fontSize: 11 }}>Niv. {r.niveauMetierRequis}</span>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ fontSize: 11 }}>+{r.xpCraft} XP</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Confirms */}
      <ConfirmDialog
        open={!!deletingMetier}
        message={`Supprimer le métier "${deletingMetier?.nom}" ?`}
        onConfirm={handleDeleteMetier}
        onCancel={() => setDeletingMetier(null)}
      />
      <ConfirmDialog
        open={!!deletingNoeud}
        message={`Supprimer le nœud "${deletingNoeud?.nom}" ?`}
        onConfirm={handleDeleteNoeud}
        onCancel={() => setDeletingNoeud(null)}
      />
      <ConfirmDialog
        open={!!deletingLoot}
        message={`Supprimer cette ligne de loot ?`}
        onConfirm={handleDeleteLoot}
        onCancel={() => setDeletingLoot(null)}
      />
    </div>
  );
};

export default MetiersPage;
