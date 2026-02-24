import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { sortsApi, racesApi, zonesApi, effetsApi } from '../../api/static';
import { monstresApi } from '../../api/maps';
import type { Sort, Race, Zone, Effet, MonsterTemplate, StatType, SortType } from '../../types';
import '../../styles/admin.css';

const getEffetNom = (e: NonNullable<Sort['effets']>[number]) => e.nom || e.effet?.nom || '';
const getEffetType = (e: NonNullable<Sort['effets']>[number]) => e.type || e.effet?.type || '';
const getEffetStat = (e: NonNullable<Sort['effets']>[number]) => e.statCiblee || e.effet?.statCiblee || '';
const getEffetValeur = (e: NonNullable<Sort['effets']>[number]) => e.valeur ?? e.effet?.valeur ?? 0;
const getEffetValeurMin = (e: NonNullable<Sort['effets']>[number]) => e.valeurMin ?? e.effet?.valeurMin ?? null;
const getEffetDuree = (e: NonNullable<Sort['effets']>[number]) => e.duree ?? e.effet?.duree ?? 0;
const getEffetId = (e: NonNullable<Sort['effets']>[number]) => e.effetId || e.effet?.id || 0;

const STAT_OPTIONS: { value: StatType; label: string }[] = [
  { value: 'FORCE', label: 'Force' },
  { value: 'INTELLIGENCE', label: 'Intelligence' },
  { value: 'DEXTERITE', label: 'Dextérité' },
  { value: 'AGILITE', label: 'Agilité' },
  { value: 'VIE', label: 'Vie' },
  { value: 'CHANCE', label: 'Chance' },
];

const SortDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sort, setSort] = useState<Sort | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Référentiels
  const [races, setRaces] = useState<Race[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [allEffets, setAllEffets] = useState<Effet[]>([]);
  const [monstres, setMonstres] = useState<MonsterTemplate[]>([]);

  // Champs éditables
  const [nom, setNom] = useState('');
  const [type, setType] = useState<SortType>('SORT');
  const [statUtilisee, setStatUtilisee] = useState<StatType>('INTELLIGENCE');
  const [coutPA, setCoutPA] = useState(3);
  const [porteeMin, setPorteeMin] = useState(1);
  const [porteeMax, setPorteeMax] = useState(5);
  const [ligneDeVue, setLigneDeVue] = useState(true);
  const [degatsMin, setDegatsMin] = useState(0);
  const [degatsMax, setDegatsMax] = useState(0);
  const [degatsCritMin, setDegatsCritMin] = useState(0);
  const [degatsCritMax, setDegatsCritMax] = useState(0);
  const [chanceCritBase, setChanceCritBase] = useState(0.01);
  const [cooldown, setCooldown] = useState(0);
  const [tauxEchec, setTauxEchec] = useState(0);
  const [niveauApprentissage, setNiveauApprentissage] = useState(1);
  const [raceId, setRaceId] = useState<number | null>(null);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [invocationTemplateId, setInvocationTemplateId] = useState<number | null>(null);
  const [poseDuree, setPoseDuree] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  // Flags
  const [estSoin, setEstSoin] = useState(false);
  const [estInvocation, setEstInvocation] = useState(false);
  const [estVolDeVie, setEstVolDeVie] = useState(false);
  const [estGlyphe, setEstGlyphe] = useState(false);
  const [estPiege, setEstPiege] = useState(false);
  const [estTeleportation, setEstTeleportation] = useState(false);
  const [porteeModifiable, setPorteeModifiable] = useState(true);
  const [ligneDirecte, setLigneDirecte] = useState(false);

  // Effets
  const [addEffetId, setAddEffetId] = useState<number>(0);
  const [addChance, setAddChance] = useState<number>(100);
  const [addSurCible, setAddSurCible] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await sortsApi.getById(Number(id));
      setSort(data);
      setNom(data.nom);
      setType(data.type);
      setStatUtilisee(data.statUtilisee);
      setCoutPA(data.coutPA);
      setPorteeMin(data.porteeMin);
      setPorteeMax(data.porteeMax);
      setLigneDeVue(data.ligneDeVue);
      setDegatsMin(data.degatsMin);
      setDegatsMax(data.degatsMax);
      setDegatsCritMin(data.degatsCritMin);
      setDegatsCritMax(data.degatsCritMax);
      setChanceCritBase(data.chanceCritBase);
      setCooldown(data.cooldown);
      setTauxEchec(data.tauxEchec);
      setNiveauApprentissage(data.niveauApprentissage);
      setRaceId(data.raceId);
      setZoneId(data.zoneId);
      setInvocationTemplateId(data.invocationTemplateId);
      setPoseDuree(data.poseDuree ?? null);
      setDescription(data.description ?? '');
      setEstSoin(data.estSoin);
      setEstInvocation(data.estInvocation);
      setEstVolDeVie(data.estVolDeVie);
      setEstGlyphe(data.estGlyphe ?? false);
      setEstPiege(data.estPiege ?? false);
      setEstTeleportation(data.estTeleportation ?? false);
      setPorteeModifiable(data.porteeModifiable !== false);
      setLigneDirecte(data.ligneDirecte ?? false);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    racesApi.getAll().then(setRaces);
    zonesApi.getAll().then(setZones);
    effetsApi.getAll().then(setAllEffets);
    monstresApi.getAll().then(setMonstres);
  }, [load]);

  const handleSave = async () => {
    if (!sort) return;
    setSaving(true);
    await sortsApi.update(sort.id, {
      nom, type, statUtilisee, coutPA, porteeMin, porteeMax, ligneDeVue,
      degatsMin, degatsMax, degatsCritMin, degatsCritMax, chanceCritBase,
      cooldown, tauxEchec, niveauApprentissage,
      raceId: raceId || null,
      zoneId: zoneId || null,
      invocationTemplateId: estInvocation ? (invocationTemplateId || null) : null,
      poseDuree: (estGlyphe || estPiege) ? poseDuree : null,
      description: description || null,
      estSoin, estInvocation, estVolDeVie, estGlyphe, estPiege, estTeleportation, porteeModifiable, ligneDirecte,
    });
    await load();
    setSaving(false);
  };

  const handleAddEffect = async () => {
    if (!sort || !addEffetId) return;
    await sortsApi.addEffect(sort.id, { effetId: addEffetId, chanceDeclenchement: addChance / 100, surCible: addSurCible });
    setAddEffetId(0);
    await load();
  };

  const handleRemoveEffect = async (effetId: number) => {
    if (!sort) return;
    await sortsApi.removeEffect(sort.id, effetId);
    await load();
  };

  const handleDelete = async () => {
    if (!sort) return;
    await sortsApi.remove(sort.id);
    navigate('/admin/combat');
  };

  // Monstres qui utilisent ce sort
  const monstreUtilisateurs = monstres.filter(m =>
    m.sorts?.some(ms => ms.sortId === sort?.id)
  );

  if (loading) return <div className="admin-page"><p>Chargement...</p></div>;
  if (!sort) return <div className="admin-page"><p>Sort introuvable.</p></div>;

  const raceName = races.find(r => r.id === raceId)?.nom;

  return (
    <div className="admin-page">
      {/* En-tête */}
      <div className="detail-page-header">
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/combat')}>
          ← Retour
        </button>
        <div className="detail-page-title">
          <input className="detail-page-name-input" value={nom} onChange={e => setNom(e.target.value)} />
          <span className="badge badge-muted">ID {sort.id}</span>
          {raceName && <span className="badge badge-info">{raceName}</span>}
          {estSoin && <span className="badge badge-success">Soin</span>}
          {estInvocation && <span className="badge badge-warning">Invocation</span>}
          {estVolDeVie && <span className="badge badge-poison">Vol de vie</span>}
          {estGlyphe && <span className="badge badge-warning">Glyphe</span>}
          {estPiege && <span className="badge badge-secondary">Piège</span>}
          {estTeleportation && <span className="badge badge-info">Téléportation</span>}
          {ligneDirecte && <span className="badge badge-info">Ligne droite</span>}
          {tauxEchec > 0 && <span className="badge badge-danger">Echec {Math.round(tauxEchec * 100)}%</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleting(true)}>
            Supprimer
          </button>
        </div>
      </div>

      <div className="detail-page-body">
        {/* Propriétés de base */}
        <div className="detail-page-section">
          <div className="detail-page-section-header"><h3>Propriétés</h3></div>
          <div className="detail-page-fields">
            <div className="detail-page-field">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value as SortType)}>
                <option value="SORT">Sort</option>
                <option value="ARME">Arme</option>
              </select>
            </div>
            <div className="detail-page-field">
              <label>Stat utilisée</label>
              <select value={statUtilisee} onChange={e => setStatUtilisee(e.target.value as StatType)}>
                {STAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="detail-page-field">
              <label>Coût PA</label>
              <input type="number" min={0} value={coutPA} onChange={e => setCoutPA(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Portée min</label>
              <input type="number" min={0} value={porteeMin} onChange={e => setPorteeMin(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Portée max</label>
              <input type="number" min={0} value={porteeMax} onChange={e => setPorteeMax(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Cooldown</label>
              <input type="number" min={0} value={cooldown} onChange={e => setCooldown(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Niveau apprentissage</label>
              <input type="number" min={1} value={niveauApprentissage} onChange={e => setNiveauApprentissage(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Taux échec (0-1)</label>
              <input type="number" step={0.01} min={0} max={1} value={tauxEchec} onChange={e => setTauxEchec(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Race</label>
              <select value={raceId ?? ''} onChange={e => setRaceId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- Aucune --</option>
                {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>
            <div className="detail-page-field">
              <label>Zone d'effet</label>
              <select value={zoneId ?? ''} onChange={e => setZoneId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- Aucune --</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.nom} ({z.type})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dégâts */}
        <div className="detail-page-section">
          <div className="detail-page-section-header"><h3>Dégâts</h3></div>
          <div className="detail-page-fields">
            <div className="detail-page-field">
              <label>Dégâts min</label>
              <input type="number" min={0} value={degatsMin} onChange={e => setDegatsMin(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Dégâts max</label>
              <input type="number" min={0} value={degatsMax} onChange={e => setDegatsMax(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Dégâts crit min</label>
              <input type="number" min={0} value={degatsCritMin} onChange={e => setDegatsCritMin(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Dégâts crit max</label>
              <input type="number" min={0} value={degatsCritMax} onChange={e => setDegatsCritMax(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Chance crit base (0-1)</label>
              <input type="number" step={0.01} min={0} max={1} value={chanceCritBase} onChange={e => setChanceCritBase(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="detail-page-section">
          <div className="detail-page-section-header"><h3>Flags</h3></div>
          <div className="detail-page-flags">
            {([
              ['Ligne de vue', ligneDeVue, setLigneDeVue],
              ['Est soin', estSoin, setEstSoin],
              ['Est invocation', estInvocation, setEstInvocation],
              ['Vol de vie', estVolDeVie, setEstVolDeVie],
              ['Pose un glyphe', estGlyphe, setEstGlyphe],
              ['Pose un piège', estPiege, setEstPiege],
              ['Téléportation', estTeleportation, setEstTeleportation],
              ['PO modifiable par buffs', porteeModifiable, setPorteeModifiable],
              ['Ligne droite uniquement', ligneDirecte, setLigneDirecte],
            ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
              <label key={label} className="detail-page-flag-row">
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} />
                {label}
              </label>
            ))}
          </div>

          {(estGlyphe || estPiege) && (
            <div className="detail-page-field" style={{ marginTop: 12 }}>
              <label>Durée de la zone (tours)</label>
              <input type="number" min={1} value={poseDuree ?? 3}
                onChange={e => setPoseDuree(Number(e.target.value))} />
            </div>
          )}

          {estInvocation && (
            <div className="detail-page-field" style={{ marginTop: 12 }}>
              <label>Template invocation</label>
              <select value={invocationTemplateId ?? ''} onChange={e => setInvocationTemplateId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- Aucun --</option>
                {monstres.map(m => <option key={m.id} value={m.id}>{m.nom} (ID {m.id})</option>)}
              </select>
            </div>
          )}

          <div className="detail-page-field" style={{ marginTop: 12 }}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Effets liés */}
        <div className="detail-page-section">
          <div className="detail-page-section-header"><h3>Effets liés ({sort.effets?.length || 0})</h3></div>
          <div className="sort-list" style={{ marginBottom: 10 }}>
            {sort.effets && sort.effets.length > 0 ? (
              sort.effets.map((e, i) => {
                const eType = getEffetType(e);
                const badgeClass = eType === 'DISPEL' ? 'badge-dispel' : eType === 'BUFF' ? 'badge-success' : eType === 'POISON' ? 'badge-poison' : (eType === 'POUSSEE' || eType === 'ATTIRANCE') ? 'badge-movement' : 'badge-danger';
                const valMin = getEffetValeurMin(e);
                return (
                  <div key={i} className="sort-item">
                    <div>
                      <span className="sort-name">{getEffetNom(e)}</span>
                      <span className="sort-meta">
                        <span className={`badge ${badgeClass}`}>{eType}</span>
                        <span>{eType === 'POISON' && valMin != null ? `${valMin}-${getEffetValeur(e)} dgts/tour` : `${getEffetValeur(e) > 0 ? '+' : ''}${getEffetValeur(e)} ${getEffetStat(e)}`}</span>
                        <span>{getEffetDuree(e)}t</span>
                        <span>{Math.round(e.chanceDeclenchement * 100)}%</span>
                        <span className="badge badge-info">{e.surCible ? 'Sur cible(s)' : 'Sur lanceur'}</span>
                      </span>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveEffect(getEffetId(e))}>X</button>
                  </div>
                );
              })
            ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun effet lié</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="inline-add">
              <select value={addEffetId} onChange={e => setAddEffetId(Number(e.target.value))}>
                <option value={0}>-- Effet --</option>
                {allEffets.map(ef => <option key={ef.id} value={ef.id}>{ef.nom} ({ef.type})</option>)}
              </select>
              <input type="number" value={addChance} onChange={e => setAddChance(Number(e.target.value))}
                min={1} max={100} style={{ width: 60 }} placeholder="%" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={addSurCible} onChange={e => setAddSurCible(e.target.checked)} />
                Sur cible(s)
              </label>
              <button className="btn btn-sm btn-success" onClick={handleAddEffect} disabled={!addEffetId}>+ Ajouter</button>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, paddingLeft: 2 }}>
              ✅ coché = effet sur les cibles dans la zone &nbsp;|&nbsp; ☐ décoché = dégâts sur cible, effet sur le lanceur
            </div>
          </div>
        </div>

        {/* Utilisé par */}
        {monstreUtilisateurs.length > 0 && (
          <div className="detail-page-section">
            <div className="detail-page-section-header"><h3>Utilisé par</h3></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {monstreUtilisateurs.map(m => (
                <button key={m.id} className="badge badge-muted" style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => navigate(`/admin/monstres/${m.id}`)}>
                  {m.nom}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleting}
        message={`Supprimer le sort "${sort.nom}" définitivement ?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
};

export default SortDetailPage;
