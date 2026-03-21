import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pnjApi } from '../../api/pnj';
import { mapsApi, uploadApi } from '../../api/maps';
import { equipmentApi, resourcesApi } from '../../api/static';
import { queteApi } from '../../api/quetes';
import { metiersApi } from '../../api/metiers';
import { familiersApi } from '../../api/familiers';
import type { PNJ, MarchandLigne, GameMap, Equipment, Ressource, PNJDialogue, DialogueType, Quete, Metier, FamilierRace } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import '../../styles/admin.css';

const PNJDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pnj, setPnj] = useState<PNJ | null>(null);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [equipements, setEquipements] = useState<Equipment[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [quetes, setQuetes] = useState<Quete[]>([]);
  const [allMetiers, setAllMetiers] = useState<Metier[]>([]);
  const [showAddMetier, setShowAddMetier] = useState(false);
  const [newMetierId, setNewMetierId] = useState<number | ''>('');
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
  const [estGardienEnclos, setEstGardienEnclos] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [spriteScale, setSpriteScale] = useState(1.0);
  const [spriteOffsetX, setSpriteOffsetX] = useState(0);
  const [spriteOffsetY, setSpriteOffsetY] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmations
  const [deletingPnj, setDeletingPnj] = useState(false);
  const [deletingLigne, setDeletingLigne] = useState<MarchandLigne | null>(null);
  const [deletingDialogue, setDeletingDialogue] = useState<PNJDialogue | null>(null);

  // Formulaire ajout dialogue
  const [showAddDialogue, setShowAddDialogue] = useState(false);
  const [dialogueType, setDialogueType] = useState<DialogueType>('ACCUEIL');
  const [dialogueTexte, setDialogueTexte] = useState('');
  const [dialogueOrdre, setDialogueOrdre] = useState<number>(0);
  const [dialogueQueteId, setDialogueQueteId] = useState<number | ''>('');
  const [dialogueEtapeOrdre, setDialogueEtapeOrdre] = useState<number | ''>('');
  const [editingDialogue, setEditingDialogue] = useState<{ id: number; texte: string; type: DialogueType; ordre: number; queteId: number | null; etapeOrdre: number | null } | null>(null);

  // Formulaire ajout ligne
  const [showAddLigne, setShowAddLigne] = useState(false);
  const [ligneType, setLigneType] = useState<'equipement' | 'ressource' | 'familier'>('equipement');
  const [ligneEquipId, setLigneEquipId] = useState<number | ''>('');
  const [ligneResId, setLigneResId] = useState<number | ''>('');
  const [ligneFamilierRaceId, setLigneFamilierRaceId] = useState<number | ''>('');
  const [lignePrixVente, setLignePrixVente] = useState<number | ''>('');
  const [lignePrixRachat, setLignePrixRachat] = useState<number | ''>('');
  const [allFamilierRaces, setAllFamilierRaces] = useState<FamilierRace[]>([]);

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
    setEstGardienEnclos(p.estGardienEnclos ?? false);
    setImageUrl(p.imageUrl ?? '');
    setSpriteScale(p.spriteScale ?? 1.0);
    setSpriteOffsetX(p.spriteOffsetX ?? 0);
    setSpriteOffsetY(p.spriteOffsetY ?? 0);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadPnj(),
      mapsApi.getAll().then(setMaps),
      equipmentApi.getAll().then(setEquipements),
      resourcesApi.getAll().then(setRessources),
      queteApi.getAll().then(setQuetes),
      metiersApi.getAll().then(setAllMetiers),
      familiersApi.getAllRaces().then(setAllFamilierRaces).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [loadPnj]);

  const handleSave = async () => {
    if (!pnj) return;
    setSaving(true);
    try {
      await pnjApi.update(pnj.id, { nom, mapId, positionX, positionY, description: description || null, estMarchand, estGardienEnclos, imageUrl: imageUrl || null, spriteScale, spriteOffsetX, spriteOffsetY });
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
    else if (ligneType === 'familier' && ligneFamilierRaceId) (data as any).familierRaceId = Number(ligneFamilierRaceId);
    else { setError('Sélectionnez un équipement, une ressource ou une race de familier'); return; }

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

  const handleAddDialogue = async () => {
    if (!pnj || !dialogueTexte.trim()) return;
    setSaving(true);
    try {
      await pnjApi.addDialogue(pnj.id, {
        type: dialogueType,
        texte: dialogueTexte,
        ordre: dialogueOrdre,
        queteId: dialogueQueteId !== '' ? Number(dialogueQueteId) : null,
        etapeOrdre: dialogueEtapeOrdre !== '' ? Number(dialogueEtapeOrdre) : null,
      });
      await loadPnj();
      setShowAddDialogue(false);
      setDialogueTexte('');
      setDialogueOrdre(0);
      setDialogueQueteId('');
      setDialogueEtapeOrdre('');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDialogue = async () => {
    if (!pnj || !editingDialogue) return;
    try {
      await pnjApi.updateDialogue(pnj.id, editingDialogue.id, {
        type: editingDialogue.type,
        texte: editingDialogue.texte,
        ordre: editingDialogue.ordre,
        queteId: editingDialogue.queteId,
        etapeOrdre: editingDialogue.etapeOrdre,
      });
      await loadPnj();
      setEditingDialogue(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  const handleDeleteDialogue = async () => {
    if (!pnj || !deletingDialogue) return;
    await pnjApi.deleteDialogue(pnj.id, deletingDialogue.id);
    setDeletingDialogue(null);
    await loadPnj();
  };

  const handleAddMetier = async () => {
    if (!pnj || !newMetierId) return;
    setSaving(true);
    try {
      await metiersApi.addPnjMetier(pnj.id, Number(newMetierId));
      setShowAddMetier(false);
      setNewMetierId('');
      await loadPnj();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMetier = async (metierId: number) => {
    if (!pnj) return;
    try {
      await metiersApi.removePnjMetier(pnj.id, metierId);
      await loadPnj();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
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

              {/* Checkbox gardien enclos */}
              <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={estGardienEnclos}
                    onChange={e => setEstGardienEnclos(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Gardien d'enclos</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Si coché, les joueurs pourront gérer leurs familiers en enclos via ce PNJ.
                    </div>
                  </div>
                </label>
              </div>

              {/* Image + Sprite */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Image (URL)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="/assets/pnj/mon-pnj.png"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Upload...' : '📁 Importer'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const { url } = await uploadApi.entityImage(file, 'pnj');
                      setImageUrl(url);
                    } catch (err: any) {
                      setError(err?.response?.data?.error || 'Erreur upload');
                    } finally {
                      setUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Éditeur sprite */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13 }}>Ajustement sprite 🎨</strong>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setSpriteScale(1); setSpriteOffsetX(0); setSpriteOffsetY(0); }} title="Réinitialiser">↺</button>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Preview */}
                  <div style={{ width: 120, height: 120, background: '#1a237e', border: '2px solid #4a5568', position: 'relative', overflow: 'visible', flexShrink: 0 }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="" style={{
                        position: 'absolute',
                        bottom: `${spriteOffsetY}%`,
                        left: `calc(50% + ${spriteOffsetX}%)`,
                        transform: 'translateX(-50%)',
                        height: `${140 * spriteScale}%`,
                        width: 'auto',
                        pointerEvents: 'none',
                      }} />
                    ) : (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Aucune image</span>
                    )}
                  </div>
                  {/* Contrôles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Taille : {spriteScale.toFixed(2)}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => setSpriteScale(s => Math.max(0.1, parseFloat((s - 0.05).toFixed(2))))} style={{ minWidth: 32 }}>−</button>
                        <button className="btn btn-sm" onClick={() => setSpriteScale(s => parseFloat((s + 0.05).toFixed(2)))} style={{ minWidth: 32 }}>+</button>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Position : X {spriteOffsetX > 0 ? '+' : ''}{spriteOffsetX.toFixed(0)}% / Y {spriteOffsetY > 0 ? '+' : ''}{spriteOffsetY.toFixed(0)}%
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '32px 32px 32px', gridTemplateRows: '32px 32px 32px', gap: 2 }}>
                        <div />
                        <button className="btn btn-sm" onClick={() => setSpriteOffsetY(v => v + 2)} style={{ padding: 0 }}>↑</button>
                        <div />
                        <button className="btn btn-sm" onClick={() => setSpriteOffsetX(v => v - 2)} style={{ padding: 0 }}>←</button>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: '50%' }} />
                        </div>
                        <button className="btn btn-sm" onClick={() => setSpriteOffsetX(v => v + 2)} style={{ padding: 0 }}>→</button>
                        <div />
                        <button className="btn btn-sm" onClick={() => setSpriteOffsetY(v => v - 2)} style={{ padding: 0 }}>↓</button>
                        <div />
                      </div>
                    </div>
                  </div>
                </div>
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

        {/* ── Section dialogues ── */}
        <div className="detail-page-section" style={{ alignSelf: 'start' }}>
          <div className="detail-page-section-header">
            <h3>Dialogues {pnj.dialogues && pnj.dialogues.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({pnj.dialogues.length})</span>}</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddDialogue(v => !v)}>
              {showAddDialogue ? 'Annuler' : '+ Ajouter'}
            </button>
          </div>

          {showAddDialogue && (
            <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <select value={dialogueType} onChange={e => setDialogueType(e.target.value as DialogueType)}>
                  <option value="ACCUEIL">ACCUEIL (contenu dispo)</option>
                  <option value="SANS_INTERACTION">SANS_INTERACTION (rien)</option>
                </select>
                <select value={dialogueQueteId} onChange={e => { setDialogueQueteId(e.target.value ? Number(e.target.value) : ''); setDialogueEtapeOrdre(''); }}>
                  <option value="">— Aucune quête (générique) —</option>
                  {quetes.map(q => <option key={q.id} value={q.id}>{q.nom}</option>)}
                </select>
                <input
                  type="number" min={1}
                  value={dialogueEtapeOrdre}
                  onChange={e => setDialogueEtapeOrdre(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Étape"
                  disabled={!dialogueQueteId}
                  title="Numéro d'étape (laisser vide = toute la quête)"
                  style={{ width: 70 }}
                />
              </div>
              {dialogueQueteId && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {dialogueEtapeOrdre ? `Affiché à l'étape ${dialogueEtapeOrdre} de cette quête` : 'Affiché pendant toute la durée de cette quête'}
                </div>
              )}
              <textarea
                value={dialogueTexte}
                rows={3}
                onChange={e => setDialogueTexte(e.target.value)}
                placeholder="Texte du dialogue..."
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  Ordre : <input type="number" min={0} value={dialogueOrdre} onChange={e => setDialogueOrdre(Number(e.target.value))} style={{ width: 50, marginLeft: 4 }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDialogue(false)}>Annuler</button>
                  <button className="btn btn-primary btn-sm" onClick={handleAddDialogue} disabled={saving}>Ajouter</button>
                </div>
              </div>
            </div>
          )}

          {(!pnj.dialogues || pnj.dialogues.length === 0) && !showAddDialogue && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
              Aucun dialogue. Cliquez "+ Ajouter" pour en créer.
            </div>
          )}

          {pnj.dialogues && pnj.dialogues.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pnj.dialogues.map((d: PNJDialogue) => (
                <div key={d.id} style={{ padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  {editingDialogue?.id === d.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                        <select value={editingDialogue.type} onChange={e => setEditingDialogue(prev => prev ? { ...prev, type: e.target.value as DialogueType } : null)}>
                          <option value="ACCUEIL">ACCUEIL</option>
                          <option value="SANS_INTERACTION">SANS_INTERACTION</option>
                        </select>
                        <select value={editingDialogue.queteId ?? ''} onChange={e => setEditingDialogue(prev => prev ? { ...prev, queteId: e.target.value ? Number(e.target.value) : null, etapeOrdre: null } : null)}>
                          <option value="">— Aucune quête —</option>
                          {quetes.map(q => <option key={q.id} value={q.id}>{q.nom}</option>)}
                        </select>
                        <input type="number" min={1} value={editingDialogue.etapeOrdre ?? ''} onChange={e => setEditingDialogue(prev => prev ? { ...prev, etapeOrdre: e.target.value ? Number(e.target.value) : null } : null)} placeholder="Étape" disabled={!editingDialogue.queteId} style={{ width: 70 }} />
                      </div>
                      <textarea value={editingDialogue.texte} rows={2} onChange={e => setEditingDialogue(prev => prev ? { ...prev, texte: e.target.value } : null)} style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '4px 6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={handleUpdateDialogue}>OK</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingDialogue(null)}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span className={`badge ${d.type === 'ACCUEIL' ? 'badge-info' : 'badge-muted'}`} style={{ fontSize: 10 }}>{d.type}</span>
                          {d.queteId && (
                            <span className="badge badge-secondary" style={{ fontSize: 10 }}>
                              {quetes.find(q => q.id === d.queteId)?.nom ?? `Quête #${d.queteId}`}
                              {d.etapeOrdre ? ` — étape ${d.etapeOrdre}` : ' (toute la quête)'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 13 }}>"{d.texte}"</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingDialogue({ id: d.id, texte: d.texte, type: d.type, ordre: d.ordre, queteId: d.queteId ?? null, etapeOrdre: d.etapeOrdre ?? null })}>✎</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeletingDialogue(d)}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                    <select value={ligneType} onChange={e => { setLigneType(e.target.value as 'equipement' | 'ressource' | 'familier'); setLigneEquipId(''); setLigneResId(''); setLigneFamilierRaceId(''); }} style={{ flex: '0 0 140px' }}>
                      <option value="equipement">Équipement</option>
                      <option value="ressource">Ressource</option>
                      <option value="familier">🐾 Familier</option>
                    </select>
                    {ligneType === 'equipement' ? (
                      <select value={ligneEquipId} onChange={e => setLigneEquipId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
                        <option value="">-- choisir --</option>
                        {equipements.map(eq => <option key={eq.id} value={eq.id}>{eq.nom} ({eq.slot})</option>)}
                      </select>
                    ) : ligneType === 'ressource' ? (
                      <select value={ligneResId} onChange={e => setLigneResId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
                        <option value="">-- choisir --</option>
                        {ressources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                      </select>
                    ) : (
                      <select value={ligneFamilierRaceId} onChange={e => setLigneFamilierRaceId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
                        <option value="">-- choisir race --</option>
                        {allFamilierRaces.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
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
                          ) : ligne.familierRace ? (
                            <span>🐾 {ligne.familierRace.nom} <span className="badge badge-info" style={{ fontSize: 10 }}>Familier</span></span>
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

      {/* ── Métiers enseignés ── */}
      <div className="detail-page-section" style={{ marginTop: 16 }}>
        <div className="detail-page-section-header">
          <h3>Métiers enseignés</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddMetier(v => !v)}>
            {showAddMetier ? 'Annuler' : '+ Ajouter'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          Les métiers listés ici peuvent être appris par les joueurs en interagissant avec ce PNJ.
        </div>

        {showAddMetier && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12 }}>
            <select value={newMetierId} onChange={e => setNewMetierId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
              <option value="">— Choisir un métier —</option>
              {allMetiers
                .filter(m => !pnj.metiers?.some(pm => pm.metierId === m.id))
                .map(m => <option key={m.id} value={m.id}>{m.nom}</option>)
              }
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAddMetier} disabled={saving || !newMetierId}>
              {saving ? '...' : 'Ajouter'}
            </button>
          </div>
        )}

        {(!pnj.metiers || pnj.metiers.length === 0) && !showAddMetier && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
            Ce PNJ n'enseigne aucun métier.
          </div>
        )}

        {pnj.metiers && pnj.metiers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pnj.metiers.map(pm => (
              <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(139,195,74,0.12)', border: '1px solid rgba(139,195,74,0.3)', borderRadius: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{pm.metier.nom}</span>
                {pm.metier.description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pm.metier.description}</span>}
                <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => handleRemoveMetier(pm.metierId)}>✕</button>
              </div>
            ))}
          </div>
        )}
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
      <ConfirmDialog
        open={!!deletingDialogue}
        message="Supprimer ce dialogue ?"
        onConfirm={handleDeleteDialogue}
        onCancel={() => setDeletingDialogue(null)}
      />
    </div>
  );
};

export default PNJDetailPage;
