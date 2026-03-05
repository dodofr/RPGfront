import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pnjApi } from '../../api/pnj';
import { mapsApi } from '../../api/maps';
import { equipmentApi, resourcesApi } from '../../api/static';
import type { PNJ, MarchandLigne, GameMap, Equipment, Ressource } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

const PNJDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pnj, setPnj] = useState<PNJ | null>(null);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [equipements, setEquipements] = useState<Equipment[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs éditables
  const [nom, setNom] = useState('');
  const [mapId, setMapId] = useState<number>(0);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [description, setDescription] = useState('');
  const [estMarchand, setEstMarchand] = useState(false);

  // Confirmations
  const [deletingPnj, setDeletingPnj] = useState(false);
  const [deletingLigne, setDeletingLigne] = useState<MarchandLigne | null>(null);

  // Formulaire ajout ligne
  const [showAddLigne, setShowAddLigne] = useState(false);
  const [ligneType, setLigneType] = useState<'equipement' | 'ressource'>('equipement');
  const [ligneEquipId, setLigneEquipId] = useState<number | ''>('');
  const [ligneResId, setLigneResId] = useState<number | ''>('');
  const [lignePrixVente, setLignePrixVente] = useState<number | ''>('');
  const [lignePrixRachat, setLignePrixRachat] = useState<number | ''>('');

  const loadPnj = useCallback(async () => {
    if (!id) return;
    const p = await pnjApi.getById(Number(id));
    setPnj(p);
    setNom(p.nom);
    setMapId(p.mapId);
    setPositionX(p.positionX);
    setPositionY(p.positionY);
    setDescription(p.description ?? '');
    setEstMarchand(p.estMarchand);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadPnj(),
      mapsApi.getAll().then(setMaps),
      equipmentApi.getAll().then(setEquipements),
      resourcesApi.getAll().then(setRessources),
    ]).finally(() => setLoading(false));
  }, [loadPnj]);

  const handleSave = async () => {
    if (!pnj) return;
    setSaving(true);
    try {
      await pnjApi.update(pnj.id, { nom, mapId, positionX, positionY, description: description || null, estMarchand });
      await loadPnj();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePnj = async () => {
    if (!pnj) return;
    await pnjApi.delete(pnj.id);
    navigate('/admin/pnj');
  };

  const handleAddLigne = async () => {
    if (!pnj) return;
    const data: Partial<MarchandLigne> = {
      prixMarchand: lignePrixVente !== '' ? Number(lignePrixVente) : null,
      prixRachat: lignePrixRachat !== '' ? Number(lignePrixRachat) : null,
    };
    if (ligneType === 'equipement' && ligneEquipId) data.equipementId = Number(ligneEquipId);
    else if (ligneType === 'ressource' && ligneResId) data.ressourceId = Number(ligneResId);
    else { setError('Sélectionnez un équipement ou une ressource'); return; }

    setSaving(true);
    try {
      await pnjApi.addLigne(pnj.id, data);
      await loadPnj();
      setShowAddLigne(false);
      setLigneEquipId('');
      setLigneResId('');
      setLignePrixVente('');
      setLignePrixRachat('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLigne = async (ligne: MarchandLigne, field: 'prixMarchand' | 'prixRachat', val: string) => {
    if (!pnj) return;
    const numVal = val === '' ? null : Number(val);
    try {
      await pnjApi.updateLigne(pnj.id, ligne.id, { [field]: numVal });
      await loadPnj();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  const handleDeleteLigne = async () => {
    if (!pnj || !deletingLigne) return;
    await pnjApi.deleteLigne(pnj.id, deletingLigne.id);
    setDeletingLigne(null);
    await loadPnj();
  };

  if (loading) return <div className="loading">Chargement...</div>;
  if (!pnj) return <div style={{ padding: 32, color: 'var(--danger)' }}>PNJ introuvable.</div>;

  const currentMap = maps.find(m => m.id === mapId);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div className="detail-page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/pnj')}>
          ← Retour
        </button>
        <div className="detail-page-title">
          <input
            className="detail-page-name-input"
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Nom du PNJ"
          />
          <span className="badge badge-muted" style={{ fontSize: 11 }}>PNJ #{pnj.id}</span>
          {estMarchand && <span className="badge badge-info" style={{ fontSize: 11 }}>Marchand</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setDeletingPnj(true)}>Supprimer</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(233,69,96,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 6, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="detail-page-body">

        {/* ── Colonne gauche : infos ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Informations */}
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Informations</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Map</label>
                  <select value={mapId} onChange={e => setMapId(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {maps.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.type})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>X</label>
                  <input type="number" value={positionX} onChange={e => setPositionX(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Y</label>
                  <input type="number" value={positionY} onChange={e => setPositionY(Number(e.target.value))} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {currentMap && (
                <div style={{ padding: '6px 10px', background: 'rgba(100,181,246,0.08)', border: '1px solid rgba(100,181,246,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--info)' }}>
                  Placé sur <strong>{currentMap.nom}</strong> ({currentMap.type}) en ({positionX},{positionY})
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Description / dialogue</label>
                <textarea
                  value={description}
                  rows={3}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Texte affiché quand le joueur interagit avec ce PNJ"
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }}
                />
              </div>

              {/* Checkbox marchand */}
              <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={estMarchand}
                    onChange={e => setEstMarchand(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Inventaire marchand actif</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Si coché, le joueur pourra ouvrir la boutique lors de l'interaction.
                      Un PNJ peut avoir à la fois une boutique et des quêtes.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Quêtes liées (informatif) */}
          {pnj.quetesDepart && pnj.quetesDepart.length > 0 && (
            <div className="detail-page-section">
              <div className="detail-page-section-header">
                <h3>Quêtes données</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pnj.quetesDepart.map((q: any) => (
                  <div
                    key={q.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/quetes/${q.id}`)}
                  >
                    <span style={{ fontSize: 13 }}>{q.nom}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Niv.{q.niveauRequis} →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite : inventaire marchand ── */}
        <div className="detail-page-section" style={{ alignSelf: 'start' }}>
          <div className="detail-page-section-header">
            <h3>
              Inventaire marchand
              {pnj.lignes.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                  ({pnj.lignes.length} article{pnj.lignes.length > 1 ? 's' : ''})
                </span>
              )}
            </h3>
            {estMarchand && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddLigne(v => !v)}>
                {showAddLigne ? 'Annuler' : '+ Ajouter'}
              </button>
            )}
          </div>

          {!estMarchand && (
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              Cochez "Inventaire marchand actif" pour configurer les articles vendus.
            </div>
          )}

          {estMarchand && (
            <>
              {/* Formulaire ajout */}
              {showAddLigne && (
                <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select value={ligneType} onChange={e => { setLigneType(e.target.value as 'equipement' | 'ressource'); setLigneEquipId(''); setLigneResId(''); }} style={{ flex: '0 0 140px' }}>
                      <option value="equipement">Équipement</option>
                      <option value="ressource">Ressource</option>
                    </select>
                    {ligneType === 'equipement' ? (
                      <select value={ligneEquipId} onChange={e => setLigneEquipId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
                        <option value="">-- choisir --</option>
                        {equipements.map(eq => <option key={eq.id} value={eq.id}>{eq.nom} ({eq.slot})</option>)}
                      </select>
                    ) : (
                      <select value={ligneResId} onChange={e => setLigneResId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
                        <option value="">-- choisir --</option>
                        {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <label>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Prix vente (marchand→joueur)</span>
                      <input type="number" min={0} value={lignePrixVente} onChange={e => setLignePrixVente(e.target.value ? Number(e.target.value) : '')} placeholder="—" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </label>
                    <label>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Prix rachat (joueur→marchand)</span>
                      <input type="number" min={0} value={lignePrixRachat} onChange={e => setLignePrixRachat(e.target.value ? Number(e.target.value) : '')} placeholder="—" style={{ width: '100%', boxSizing: 'border-box' }} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddLigne(false)}>Annuler</button>
                    <button className="btn btn-primary btn-sm" onClick={handleAddLigne} disabled={saving}>Ajouter l'article</button>
                  </div>
                </div>
              )}

              {pnj.lignes.length === 0 && !showAddLigne && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                  Aucun article. Cliquez "+ Ajouter" pour commencer.
                </div>
              )}

              {pnj.lignes.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Article</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 110 }}>Vente</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 110 }}>Rachat</th>
                      <th style={{ width: 36, borderBottom: '1px solid var(--border)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnj.lignes.map(ligne => (
                      <tr key={ligne.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          {ligne.equipement ? (
                            <span>{ligne.equipement.nom} <span className="badge badge-muted" style={{ fontSize: 10 }}>{ligne.equipement.slot}</span></span>
                          ) : ligne.ressource ? (
                            <span>{ligne.ressource.nom} <span className="badge badge-secondary" style={{ fontSize: 10 }}>Ressource</span></span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <input
                            type="number" min={0}
                            defaultValue={ligne.prixMarchand ?? ''}
                            style={{ width: 76, textAlign: 'right' }}
                            placeholder="—"
                            onBlur={e => handleUpdateLigne(ligne, 'prixMarchand', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <input
                            type="number" min={0}
                            defaultValue={ligne.prixRachat ?? ''}
                            style={{ width: 76, textAlign: 'right' }}
                            placeholder="—"
                            onBlur={e => handleUpdateLigne(ligne, 'prixRachat', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeletingLigne(ligne)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Confirms ── */}
      <ConfirmDialog
        open={deletingPnj}
        message={`Supprimer "${pnj.nom}" et toutes ses lignes ?`}
        onConfirm={handleDeletePnj}
        onCancel={() => setDeletingPnj(false)}
      />
      <ConfirmDialog
        open={!!deletingLigne}
        message="Supprimer cet article du marchand ?"
        onConfirm={handleDeleteLigne}
        onCancel={() => setDeletingLigne(null)}
      />
    </div>
  );
};

export default PNJDetailPage;
