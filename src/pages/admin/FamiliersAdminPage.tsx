import React, { useState, useEffect, useCallback } from 'react';
import { familiersApi } from '../../api/familiers';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { FamilierFamille, FamilierRace, FamilierCroisement } from '../../types';
import '../../styles/admin.css';

const STAT_BASE_KEYS: (keyof FamilierRace)[] = [
  'baseForce', 'baseIntelligence', 'baseDexterite', 'baseAgilite', 'baseVie', 'baseChance',
  'basePA', 'basePM', 'basePO', 'baseCritique', 'baseDommages', 'baseSoins',
];
const STAT_CROIS_KEYS: (keyof FamilierRace)[] = [
  'croissanceForce', 'croissanceIntelligence', 'croissanceDexterite', 'croissanceAgilite',
  'croissanceVie', 'croissanceChance', 'croissancePA', 'croissancePM', 'croissancePO',
  'croissanceCritique', 'croissanceDommages', 'croissanceSoins',
];
const STAT_LABELS: Record<string, string> = {
  baseForce: 'FOR', baseIntelligence: 'INT', baseDexterite: 'DEX', baseAgilite: 'AGI',
  baseVie: 'VIE', baseChance: 'CHA', basePA: 'PA', basePM: 'PM', basePO: 'PO',
  baseCritique: 'CRIT', baseDommages: 'DMG', baseSoins: 'SOIN',
  croissanceForce: 'FOR', croissanceIntelligence: 'INT', croissanceDexterite: 'DEX',
  croissanceAgilite: 'AGI', croissanceVie: 'VIE', croissanceChance: 'CHA',
  croissancePA: 'PA', croissancePM: 'PM', croissancePO: 'PO',
  croissanceCritique: 'CRIT', croissanceDommages: 'DMG', croissanceSoins: 'SOIN',
};

const defaultRaceStats = (): Partial<FamilierRace> => ({
  generation: 1,
  baseForce: 5, baseIntelligence: 5, baseDexterite: 5, baseAgilite: 5,
  baseVie: 5, baseChance: 5, basePA: 0, basePM: 0, basePO: 0,
  baseCritique: 0, baseDommages: 0, baseSoins: 0,
  croissanceForce: 1, croissanceIntelligence: 1, croissanceDexterite: 1, croissanceAgilite: 1,
  croissanceVie: 1, croissanceChance: 1, croissancePA: 0, croissancePM: 0, croissancePO: 0,
  croissanceCritique: 0, croissanceDommages: 0, croissanceSoins: 0,
  spriteScale: 1.0, spriteOffsetX: 0, spriteOffsetY: 0,
});

const FamiliersAdminPage: React.FC = () => {
  const [familles, setFamilles] = useState<FamilierFamille[]>([]);
  const [races, setRaces] = useState<FamilierRace[]>([]);
  const [croisements, setCroisements] = useState<FamilierCroisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [expandedFamille, setExpandedFamille] = useState<number | null>(null);
  const [expandedRace, setExpandedRace] = useState<number | null>(null);

  // Famille form
  const [showFamilleForm, setShowFamilleForm] = useState(false);
  const [editingFamille, setEditingFamille] = useState<FamilierFamille | null>(null);
  const [familleNom, setFamilleNom] = useState('');
  const [deletingFamille, setDeletingFamille] = useState<FamilierFamille | null>(null);

  // Race form
  const [showRaceForm, setShowRaceForm] = useState<number | null>(null); // familleId
  const [editingRace, setEditingRace] = useState<FamilierRace | null>(null);
  const [raceFields, setRaceFields] = useState<Partial<FamilierRace>>(defaultRaceStats());
  const [raceNom, setRaceNom] = useState('');
  const [raceImageUrl, setRaceImageUrl] = useState('');
  const [deletingRace, setDeletingRace] = useState<FamilierRace | null>(null);

  // Croisement form
  const [showCroisementForm, setShowCroisementForm] = useState(false);
  const [croisRaceAId, setCroisRaceAId] = useState<number | ''>('');
  const [croisRaceBId, setCroisRaceBId] = useState<number | ''>('');
  const [croisRaceEnfantId, setCroisRaceEnfantId] = useState<number | ''>('');
  const [croisProba, setCroisProba] = useState<number>(0.5);
  const [deletingCroisement, setDeletingCroisement] = useState<FamilierCroisement | null>(null);
  const [filterCroisRaceA, setFilterCroisRaceA] = useState<number | ''>('');
  const [filterCroisRaceB, setFilterCroisRaceB] = useState<number | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fs, rs, cs] = await Promise.all([
        familiersApi.getAllFamilles(),
        familiersApi.getAllRaces(),
        familiersApi.getAllCroisements(),
      ]);
      setFamilles(fs);
      setRaces(rs);
      setCroisements(cs);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Famille handlers ──────────────────────────────────────────────────────

  const openFamilleForm = (f?: FamilierFamille) => {
    setEditingFamille(f ?? null);
    setFamilleNom(f?.nom ?? '');
    setShowFamilleForm(true);
  };

  const handleSaveFamille = async () => {
    if (!familleNom.trim()) return;
    setSaving(true);
    try {
      if (editingFamille) {
        await familiersApi.updateFamille(editingFamille.id, familleNom);
      } else {
        await familiersApi.createFamille(familleNom);
      }
      setShowFamilleForm(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFamille = async () => {
    if (!deletingFamille) return;
    try {
      await familiersApi.deleteFamille(deletingFamille.id);
      setDeletingFamille(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  // ── Race handlers ─────────────────────────────────────────────────────────

  const openRaceForm = (familleId: number, race?: FamilierRace) => {
    setEditingRace(race ?? null);
    setRaceNom(race?.nom ?? '');
    setRaceImageUrl(race?.imageUrl ?? '');
    setRaceFields(race ? {
      generation: race.generation,
      spriteScale: race.spriteScale, spriteOffsetX: race.spriteOffsetX, spriteOffsetY: race.spriteOffsetY,
      baseForce: race.baseForce, baseIntelligence: race.baseIntelligence, baseDexterite: race.baseDexterite,
      baseAgilite: race.baseAgilite, baseVie: race.baseVie, baseChance: race.baseChance,
      basePA: race.basePA, basePM: race.basePM, basePO: race.basePO,
      baseCritique: race.baseCritique, baseDommages: race.baseDommages, baseSoins: race.baseSoins,
      croissanceForce: race.croissanceForce, croissanceIntelligence: race.croissanceIntelligence,
      croissanceDexterite: race.croissanceDexterite, croissanceAgilite: race.croissanceAgilite,
      croissanceVie: race.croissanceVie, croissanceChance: race.croissanceChance,
      croissancePA: race.croissancePA, croissancePM: race.croissancePM, croissancePO: race.croissancePO,
      croissanceCritique: race.croissanceCritique, croissanceDommages: race.croissanceDommages,
      croissanceSoins: race.croissanceSoins,
    } : defaultRaceStats());
    setShowRaceForm(familleId);
  };

  const handleSaveRace = async () => {
    if (!raceNom.trim() || showRaceForm === null) return;
    setSaving(true);
    try {
      const data = { ...raceFields, nom: raceNom, imageUrl: raceImageUrl || null, familleId: showRaceForm };
      if (editingRace) {
        await familiersApi.updateRace(editingRace.id, data);
      } else {
        await familiersApi.createRace(data);
      }
      setShowRaceForm(null);
      setEditingRace(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRace = async () => {
    if (!deletingRace) return;
    try {
      await familiersApi.deleteRace(deletingRace.id);
      setDeletingRace(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  // ── Croisement handlers ───────────────────────────────────────────────────

  const handleSaveCroisement = async () => {
    if (!croisRaceAId || !croisRaceBId || !croisRaceEnfantId) return;
    setSaving(true);
    try {
      await familiersApi.createCroisement({
        raceAId: Number(croisRaceAId),
        raceBId: Number(croisRaceBId),
        raceEnfantId: Number(croisRaceEnfantId),
        probabilite: croisProba,
      });
      setShowCroisementForm(false);
      setCroisRaceAId(''); setCroisRaceBId(''); setCroisRaceEnfantId(''); setCroisProba(0.5);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCroisement = async () => {
    if (!deletingCroisement) return;
    try {
      await familiersApi.removeCroisement(deletingCroisement.id);
      setDeletingCroisement(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur');
    }
  };

  const filteredCroisements = croisements.filter(c => {
    if (filterCroisRaceA && c.raceAId !== Number(filterCroisRaceA) && c.raceBId !== Number(filterCroisRaceA)) return false;
    if (filterCroisRaceB && c.raceAId !== Number(filterCroisRaceB) && c.raceBId !== Number(filterCroisRaceB)) return false;
    return true;
  });

  const raceName = (id: number) => races.find(r => r.id === id)?.nom ?? `Race #${id}`;

  if (loading) return <div className="detail-page-body" style={{ padding: 24 }}>Chargement...</div>;

  return (
    <div className="detail-page-body" style={{ padding: 24 }}>
      <div className="detail-page-header" style={{ marginBottom: 20 }}>
        <h2>Familiers</h2>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'var(--danger)', color: '#fff', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
          {error}
          <button style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Section 1 : Familles + Races ── */}
      <div className="detail-page-section" style={{ marginBottom: 24 }}>
        <div className="detail-page-section-header">
          <h3>Familles &amp; Races</h3>
          <button className="btn btn-primary btn-sm" onClick={() => openFamilleForm()}>+ Nouvelle famille</button>
        </div>

        {/* Formulaire famille */}
        {showFamilleForm && (
          <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={familleNom} onChange={e => setFamilleNom(e.target.value)}
              placeholder="Nom de la famille" style={{ flex: 1, minWidth: 160 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSaveFamille} disabled={saving || !familleNom.trim()}>
              {editingFamille ? 'Modifier' : 'Créer'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowFamilleForm(false); setEditingFamille(null); }}>Annuler</button>
          </div>
        )}

        {familles.length === 0 && !showFamilleForm && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Aucune famille. Créez-en une pour commencer.</div>
        )}

        {familles.map(famille => {
          const familleRaces = races.filter(r => r.familleId === famille.id);
          const isExpanded = expandedFamille === famille.id;
          return (
            <div key={famille.id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {/* Famille header */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
                onClick={() => setExpandedFamille(isExpanded ? null : famille.id)}
              >
                <span style={{ fontWeight: 600 }}>
                  {isExpanded ? '▼' : '▶'} {famille.nom}
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({familleRaces.length} race{familleRaces.length !== 1 ? 's' : ''})
                  </span>
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); openFamilleForm(famille); }}>✏</button>
                  <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); setDeletingFamille(famille); }}>✕</button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '12px' }}>
                  {/* Race form */}
                  {showRaceForm === famille.id && (
                    <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12 }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>{editingRace ? `Modifier "${editingRace.nom}"` : 'Nouvelle race'}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Nom</span>
                          <input value={raceNom} onChange={e => setRaceNom(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                        </label>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL</span>
                          <input value={raceImageUrl} onChange={e => setRaceImageUrl(e.target.value)} placeholder="/assets/..." style={{ width: '100%', boxSizing: 'border-box' }} />
                        </label>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Génération</span>
                          <input type="number" min={1} value={raceFields.generation ?? 1}
                            onChange={e => setRaceFields(f => ({ ...f, generation: Number(e.target.value) }))}
                            style={{ width: '100%', boxSizing: 'border-box' }} />
                        </label>
                        <label>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Sprite scale</span>
                          <input type="number" step={0.05} value={raceFields.spriteScale ?? 1.0}
                            onChange={e => setRaceFields(f => ({ ...f, spriteScale: Number(e.target.value) }))}
                            style={{ width: '100%', boxSizing: 'border-box' }} />
                        </label>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Stats de base</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                          {STAT_BASE_KEYS.map(k => (
                            <label key={String(k)}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{STAT_LABELS[String(k)]}</span>
                              <input type="number" value={(raceFields as any)[k] ?? 0}
                                onChange={e => setRaceFields(f => ({ ...f, [k]: Number(e.target.value) }))}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '2px 4px' }} />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Croissances par niveau</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                          {STAT_CROIS_KEYS.map(k => (
                            <label key={String(k)}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{STAT_LABELS[String(k)]}</span>
                              <input type="number" step={0.5} value={(raceFields as any)[k] ?? 0}
                                onChange={e => setRaceFields(f => ({ ...f, [k]: Number(e.target.value) }))}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '2px 4px' }} />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setShowRaceForm(null); setEditingRace(null); }}>Annuler</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveRace} disabled={saving || !raceNom.trim()}>
                          {editingRace ? 'Modifier' : 'Créer'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Liste des races */}
                  <div className="sort-list" style={{ marginBottom: 8 }}>
                    {familleRaces.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune race dans cette famille.</div>
                    ) : familleRaces.map(race => {
                      const isRaceExpanded = expandedRace === race.id;
                      return (
                        <div key={race.id} style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div className="sort-item" style={{ cursor: 'pointer', background: 'none' }}
                            onClick={() => setExpandedRace(isRaceExpanded ? null : race.id)}>
                            <div>
                              <span className="sort-name">
                                {isRaceExpanded ? '▼' : '▶'} {race.nom}
                              </span>
                              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                Gén.{race.generation} | VIE:{race.baseVie} FOR:{race.baseForce} INT:{race.baseIntelligence}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                              <button className="btn btn-sm btn-secondary" onClick={() => openRaceForm(famille.id, race)}>✏</button>
                              <button className="btn btn-sm btn-danger" onClick={() => setDeletingRace(race)}>✕</button>
                            </div>
                          </div>
                          {isRaceExpanded && (
                            <div style={{ padding: '8px 12px', fontSize: 12, background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)' }}>
                              {race.imageUrl && (
                                <div style={{ marginBottom: 8 }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Image : </span>
                                  <span>{race.imageUrl}</span>
                                  <img src={race.imageUrl} alt="" style={{ marginLeft: 8, height: 40, verticalAlign: 'middle' }} />
                                </div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 4 }}>
                                {STAT_BASE_KEYS.map(k => (
                                  <div key={String(k)} style={{ textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{STAT_LABELS[String(k)]}</div>
                                    <div>{(race as any)[k]}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Croissances :</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                                {STAT_CROIS_KEYS.map(k => (
                                  <div key={String(k)} style={{ textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{STAT_LABELS[String(k)]}</div>
                                    <div>{(race as any)[k]}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button className="btn btn-sm btn-success" onClick={() => openRaceForm(famille.id)}>+ Nouvelle race</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Section 2 : Croisements ── */}
      <div className="detail-page-section">
        <div className="detail-page-section-header">
          <h3>Croisements ({croisements.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCroisementForm(v => !v)}>
            {showCroisementForm ? 'Annuler' : '+ Ajouter'}
          </button>
        </div>

        {showCroisementForm && (
          <div style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Race A</span>
                <select value={croisRaceAId} onChange={e => setCroisRaceAId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </label>
              <label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Race B</span>
                <select value={croisRaceBId} onChange={e => setCroisRaceBId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </label>
              <label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Race enfant</span>
                <select value={croisRaceEnfantId} onChange={e => setCroisRaceEnfantId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%' }}>
                  <option value="">-- Choisir --</option>
                  {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </label>
              <label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Probabilité</span>
                <input type="number" step={0.05} min={0} max={1} value={croisProba}
                  onChange={e => setCroisProba(Number(e.target.value))} style={{ width: 70 }} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCroisementForm(false)}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveCroisement}
                disabled={saving || !croisRaceAId || !croisRaceBId || !croisRaceEnfantId}>
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Filtrer :</span>
          <select value={filterCroisRaceA} onChange={e => setFilterCroisRaceA(e.target.value ? Number(e.target.value) : '')} style={{ fontSize: 12 }}>
            <option value="">Toutes races A</option>
            {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>×</span>
          <select value={filterCroisRaceB} onChange={e => setFilterCroisRaceB(e.target.value ? Number(e.target.value) : '')} style={{ fontSize: 12 }}>
            <option value="">Toutes races B</option>
            {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
        </div>

        <div className="sort-list">
          {filteredCroisements.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun croisement.</div>
          ) : filteredCroisements.map(c => (
            <div key={c.id} className="sort-item">
              <div>
                <span className="sort-name">
                  {raceName(c.raceAId)} × {raceName(c.raceBId)} → {raceName(c.raceEnfantId)}
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  {Math.round(c.probabilite * 100)}%
                </span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => setDeletingCroisement(c)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!deletingFamille}
        message={`Supprimer la famille "${deletingFamille?.nom}" et toutes ses races ?`}
        onConfirm={handleDeleteFamille}
        onCancel={() => setDeletingFamille(null)}
      />
      <ConfirmDialog
        open={!!deletingRace}
        message={`Supprimer la race "${deletingRace?.nom}" ?`}
        onConfirm={handleDeleteRace}
        onCancel={() => setDeletingRace(null)}
      />
      <ConfirmDialog
        open={!!deletingCroisement}
        message={`Supprimer le croisement ${deletingCroisement ? `${raceName(deletingCroisement.raceAId)} × ${raceName(deletingCroisement.raceBId)} → ${raceName(deletingCroisement.raceEnfantId)}` : ''} ?`}
        onConfirm={handleDeleteCroisement}
        onCancel={() => setDeletingCroisement(null)}
      />
    </div>
  );
};

export default FamiliersAdminPage;
