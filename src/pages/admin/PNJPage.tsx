import React, { useState, useEffect, useCallback } from 'react';
import { pnjApi } from '../../api/pnj';
import { mapsApi } from '../../api/maps';
import { equipmentApi, resourcesApi } from '../../api/static';
import type { PNJ, MarchandLigne, GameMap, Equipment, Ressource } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

const PNJPage: React.FC = () => {
  const [pnjs, setPnjs] = useState<PNJ[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [equipements, setEquipements] = useState<Equipment[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PNJ | null>(null);
  const [deleting, setDeleting] = useState<PNJ | null>(null);
  const [deletingLigne, setDeletingLigne] = useState<MarchandLigne | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating/editing PNJ
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nom: '', mapId: '', positionX: '0', positionY: '0', description: '' });

  // Form for adding ligne
  const [showAddLigne, setShowAddLigne] = useState(false);
  const [ligneType, setLigneType] = useState<'equipement' | 'ressource'>('equipement');
  const [ligneEquipId, setLigneEquipId] = useState<number | ''>('');
  const [ligneResId, setLigneResId] = useState<number | ''>('');
  const [lignePrixVente, setLignePrixVente] = useState<number | ''>('');
  const [lignePrixRachat, setLignePrixRachat] = useState<number | ''>('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const [p, m, e, r] = await Promise.all([
      pnjApi.getAll(),
      mapsApi.getAll(),
      equipmentApi.getAll(),
      resourcesApi.getAll(),
    ]);
    setPnjs(p);
    setMaps(m);
    setEquipements(e);
    setRessources(r);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSelectPNJ = async (pnj: PNJ) => {
    const full = await pnjApi.getById(pnj.id);
    setSelected(full);
  };

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
      });
      setShowCreate(false);
      setCreateForm({ nom: '', mapId: '', positionX: '0', positionY: '0', description: '' });
      await refresh();
      const full = await pnjApi.getById(pnj.id);
      setSelected(full);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await pnjApi.update(selected.id, {
        nom: selected.nom,
        mapId: selected.mapId,
        positionX: selected.positionX,
        positionY: selected.positionY,
        description: selected.description,
      });
      setSelected(updated);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await pnjApi.delete(deleting.id);
    if (selected?.id === deleting.id) setSelected(null);
    setDeleting(null);
    await refresh();
  };

  const handleAddLigne = async () => {
    if (!selected) return;
    const data: Partial<MarchandLigne> = {
      prixMarchand: lignePrixVente !== '' ? Number(lignePrixVente) : null,
      prixRachat: lignePrixRachat !== '' ? Number(lignePrixRachat) : null,
    };
    if (ligneType === 'equipement' && ligneEquipId) data.equipementId = Number(ligneEquipId);
    else if (ligneType === 'ressource' && ligneResId) data.ressourceId = Number(ligneResId);
    else { setError('Sélectionnez un équipement ou une ressource'); return; }

    setSaving(true);
    try {
      await pnjApi.addLigne(selected.id, data);
      const full = await pnjApi.getById(selected.id);
      setSelected(full);
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
    if (!selected) return;
    const numVal = val === '' ? null : Number(val);
    try {
      await pnjApi.updateLigne(selected.id, ligne.id, { [field]: numVal });
      const full = await pnjApi.getById(selected.id);
      setSelected(full);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  const handleDeleteLigne = async () => {
    if (!selected || !deletingLigne) return;
    await pnjApi.deleteLigne(selected.id, deletingLigne.id);
    const full = await pnjApi.getById(selected.id);
    setSelected(full);
    setDeletingLigne(null);
  };

  const cityMaps = maps.filter(m => m.type === 'VILLE' || m.type === 'SAFE');

  return (
    <div className="admin-page" style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Left: list */}
      <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>PNJ Marchands</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Créer</button>
        </div>
        {loading ? <p>Chargement...</p> : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {pnjs.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucun PNJ.</p>}
            {pnjs.map(p => (
              <div key={p.id}
                className={`sort-item${selected?.id === p.id ? ' selected' : ''}`}
                style={{ cursor: 'pointer', padding: '6px 10px', justifyContent: 'space-between' }}
                onClick={() => handleSelectPNJ(p)}
              >
                <div>
                  <strong>{p.nom}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.map?.nom} ({p.positionX},{p.positionY})</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setDeleting(p); }}>Suppr.</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selected ? (
          <p style={{ color: 'var(--text-muted)' }}>Sélectionnez un PNJ pour l'éditer.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{selected.nom}</h3>
              <button className="btn btn-primary btn-sm" onClick={handleSaveSelected} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>

            {error && (
              <div style={{ padding: '6px 10px', background: 'var(--danger)', color: '#fff', borderRadius: 4, marginBottom: 8 }}>
                {error} <button style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setError(null)}>×</button>
              </div>
            )}

            {/* Infos */}
            <div className="detail-section">
              <h4>Informations</h4>
              <div className="detail-fields">
                <div className="detail-field">
                  <label>Nom</label>
                  <input value={selected.nom} onChange={e => setSelected(s => s ? { ...s, nom: e.target.value } : s)} />
                </div>
                <div className="detail-field">
                  <label>Map</label>
                  <select value={selected.mapId} onChange={e => setSelected(s => s ? { ...s, mapId: Number(e.target.value) } : s)}>
                    {maps.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.type})</option>)}
                  </select>
                </div>
                <div className="detail-field">
                  <label>Position X</label>
                  <input type="number" value={selected.positionX} onChange={e => setSelected(s => s ? { ...s, positionX: Number(e.target.value) } : s)} />
                </div>
                <div className="detail-field">
                  <label>Position Y</label>
                  <input type="number" value={selected.positionY} onChange={e => setSelected(s => s ? { ...s, positionY: Number(e.target.value) } : s)} />
                </div>
                <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <input value={selected.description || ''} onChange={e => setSelected(s => s ? { ...s, description: e.target.value || null } : s)} />
                </div>
              </div>
            </div>

            {/* Lignes marchand */}
            <div className="detail-section" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>Lignes marchand ({selected.lignes.length})</h4>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddLigne(v => !v)}>
                  {showAddLigne ? 'Annuler' : '+ Ajouter'}
                </button>
              </div>

              {showAddLigne && (
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={ligneType} onChange={e => setLigneType(e.target.value as 'equipement' | 'ressource')}>
                      <option value="equipement">Équipement</option>
                      <option value="ressource">Ressource</option>
                    </select>
                    {ligneType === 'equipement' ? (
                      <select value={ligneEquipId} onChange={e => setLigneEquipId(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">-- choisir --</option>
                        {equipements.map(eq => <option key={eq.id} value={eq.id}>{eq.nom} ({eq.slot})</option>)}
                      </select>
                    ) : (
                      <select value={ligneResId} onChange={e => setLigneResId(e.target.value ? Number(e.target.value) : '')}>
                        <option value="">-- choisir --</option>
                        {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                      Prix vente (marchand → joueur) :
                      <input type="number" min={0} value={lignePrixVente} onChange={e => setLignePrixVente(e.target.value ? Number(e.target.value) : '')} style={{ width: 80 }} placeholder="—" />
                    </label>
                    <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                      Prix rachat (joueur → marchand) :
                      <input type="number" min={0} value={lignePrixRachat} onChange={e => setLignePrixRachat(e.target.value ? Number(e.target.value) : '')} style={{ width: 80 }} placeholder="—" />
                    </label>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleAddLigne} disabled={saving}>Ajouter la ligne</button>
                </div>
              )}

              {selected.lignes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune ligne configurée.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>Article</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>Prix vente</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>Prix rachat</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lignes.map(ligne => (
                      <tr key={ligne.id}>
                        <td style={{ padding: '4px 8px' }}>
                          {ligne.equipement ? (
                            <span>{ligne.equipement.nom} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({ligne.equipement.slot})</span></span>
                          ) : ligne.ressource ? (
                            <span>{ligne.ressource.nom} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>×1</span></span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          <input
                            type="number" min={0}
                            defaultValue={ligne.prixMarchand ?? ''}
                            style={{ width: 70, textAlign: 'right' }}
                            placeholder="—"
                            onBlur={e => handleUpdateLigne(ligne, 'prixMarchand', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          <input
                            type="number" min={0}
                            defaultValue={ligne.prixRachat ?? ''}
                            style={{ width: 70, textAlign: 'right' }}
                            placeholder="—"
                            onBlur={e => handleUpdateLigne(ligne, 'prixRachat', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeletingLigne(ligne)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>Créer un PNJ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label>
                Nom *<br />
                <input value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} style={{ width: '100%' }} />
              </label>
              <label>
                Map *<br />
                <select value={createForm.mapId} onChange={e => setCreateForm(f => ({ ...f, mapId: e.target.value }))} style={{ width: '100%' }}>
                  <option value="">-- choisir --</option>
                  {cityMaps.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.type})</option>)}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ flex: 1 }}>
                  Position X<br />
                  <input type="number" value={createForm.positionX} onChange={e => setCreateForm(f => ({ ...f, positionX: e.target.value }))} style={{ width: '100%' }} />
                </label>
                <label style={{ flex: 1 }}>
                  Position Y<br />
                  <input type="number" value={createForm.positionY} onChange={e => setCreateForm(f => ({ ...f, positionY: e.target.value }))} style={{ width: '100%' }} />
                </label>
              </div>
              <label>
                Description<br />
                <input value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%' }} />
              </label>
              {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setError(null); }}>Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Création...' : 'Créer'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" et toutes ses lignes ?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={!!deletingLigne}
        message="Supprimer cette ligne ?"
        onConfirm={handleDeleteLigne}
        onCancel={() => setDeletingLigne(null)}
      />
    </div>
  );
};

export default PNJPage;
