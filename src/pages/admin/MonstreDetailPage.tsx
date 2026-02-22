import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { monstresApi, regionsApi } from '../../api/maps';
import { sortsApi, equipmentApi, resourcesApi } from '../../api/static';
import type { MonsterTemplate, Sort, Equipment, Ressource, Region, IAType } from '../../types';
import '../../styles/admin.css';

const IA_OPTIONS: { value: IAType; label: string }[] = [
  { value: 'EQUILIBRE', label: 'Equilibre' },
  { value: 'AGGRESSIF', label: 'Aggressif' },
  { value: 'SOUTIEN', label: 'Soutien' },
  { value: 'DISTANCE', label: 'Distance' },
];

const MonstreDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monstre, setMonstre] = useState<MonsterTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Référentiels
  const [allSorts, setAllSorts] = useState<Sort[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [allResources, setAllResources] = useState<Ressource[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);

  // Champs éditables (stats)
  const [nom, setNom] = useState('');
  const [iaType, setIaType] = useState<IAType>('EQUILIBRE');
  const [stats, setStats] = useState({
    force: 10, intelligence: 10, dexterite: 10, agilite: 10,
    vie: 10, chance: 10, pvBase: 50, paBase: 6, pmBase: 3, niveauBase: 1,
  });
  const [rewards, setRewards] = useState({ xpRecompense: 0, orMin: 0, orMax: 0 });
  const [pvScaling, setPvScaling] = useState<number>(0.5);

  // Sorts
  const [addSortId, setAddSortId] = useState<number>(0);
  const [addSortPrio, setAddSortPrio] = useState<number>(1);

  // Drops
  const [dropType, setDropType] = useState<'ressource' | 'equipement'>('ressource');
  const [dropTargetId, setDropTargetId] = useState<number>(0);
  const [dropRate, setDropRate] = useState<number>(0.3);
  const [dropMin, setDropMin] = useState<number>(1);
  const [dropMax, setDropMax] = useState<number>(1);

  // Régions
  const [addRegionId, setAddRegionId] = useState<number>(0);
  const [addRegionProba, setAddRegionProba] = useState<number>(0.5);

  const isInvocation = monstre
    ? (monstre.pvScalingInvocation !== null || monstre.xpRecompense === 0)
    : false;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await monstresApi.getById(Number(id));
      setMonstre(data);
      setNom(data.nom);
      setIaType(data.iaType);
      setStats({
        force: data.force, intelligence: data.intelligence, dexterite: data.dexterite,
        agilite: data.agilite, vie: data.vie, chance: data.chance,
        pvBase: data.pvBase, paBase: data.paBase, pmBase: data.pmBase, niveauBase: data.niveauBase,
      });
      setRewards({ xpRecompense: data.xpRecompense, orMin: data.orMin, orMax: data.orMax });
      if (data.pvScalingInvocation !== null) setPvScaling(data.pvScalingInvocation ?? 0.5);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    Promise.all([sortsApi.getAll(), equipmentApi.getAll(), resourcesApi.getAll(), regionsApi.getAll()])
      .then(([s, e, r, reg]) => { setAllSorts(s); setAllEquipment(e); setAllResources(r); setAllRegions(reg); });
  }, [load]);

  const handleSaveBase = async () => {
    if (!monstre) return;
    setSaving(true);
    await monstresApi.update(monstre.id, { nom, iaType });
    await load();
    setSaving(false);
  };

  const handleSaveStats = async () => {
    if (!monstre) return;
    setSaving(true);
    await monstresApi.update(monstre.id, stats);
    await load();
    setSaving(false);
  };

  const handleSaveRewards = async () => {
    if (!monstre) return;
    setSaving(true);
    const payload: Record<string, number> = { ...rewards };
    if (isInvocation) payload.pvScalingInvocation = pvScaling;
    await monstresApi.update(monstre.id, payload);
    await load();
    setSaving(false);
  };

  const handleAddSort = async () => {
    if (!monstre || !addSortId) return;
    await monstresApi.addSort(monstre.id, { sortId: addSortId, priorite: addSortPrio });
    setAddSortId(0);
    await load();
  };

  const handleRemoveSort = async (sortId: number) => {
    if (!monstre) return;
    await monstresApi.removeSort(monstre.id, sortId);
    await load();
  };

  const handleAddDrop = async () => {
    if (!monstre || !dropTargetId) return;
    const data: Record<string, unknown> = { tauxDrop: dropRate, quantiteMin: dropMin, quantiteMax: dropMax };
    if (dropType === 'ressource') data.ressourceId = dropTargetId;
    else data.equipementId = dropTargetId;
    await monstresApi.addDrop(monstre.id, data as any);
    setDropTargetId(0);
    await load();
  };

  const handleRemoveDrop = async (dropId: number) => {
    if (!monstre) return;
    await monstresApi.removeDrop(monstre.id, dropId);
    await load();
  };

  const handleAddRegion = async () => {
    if (!monstre || !addRegionId) return;
    await regionsApi.addMonstre(addRegionId, { monstreId: monstre.id, probabilite: addRegionProba });
    setAddRegionId(0);
    await load();
  };

  const handleRemoveRegion = async (regionId: number) => {
    if (!monstre) return;
    await regionsApi.removeMonstre(regionId, monstre.id);
    await load();
  };

  const handleDelete = async () => {
    if (!monstre) return;
    await monstresApi.remove(monstre.id);
    navigate('/admin/entites');
  };

  if (loading) return <div className="admin-page"><p>Chargement...</p></div>;
  if (!monstre) return <div className="admin-page"><p>Monstre introuvable.</p></div>;

  const pvMax = 50 + (stats.vie * 5);

  return (
    <div className="admin-page">
      {/* En-tête */}
      <div className="detail-page-header">
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/entites')}>
          ← Retour
        </button>
        <div className="detail-page-title">
          <input
            className="detail-page-name-input"
            value={nom}
            onChange={e => setNom(e.target.value)}
          />
          <span className="badge badge-muted">ID {monstre.id}</span>
          {isInvocation
            ? <span className="badge badge-warning">Invocation</span>
            : <span className="badge badge-danger">Ennemi</span>}
          <span className="badge badge-info">PV max calculé : {pvMax}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={iaType}
            onChange={e => setIaType(e.target.value as IAType)}
            style={{ padding: '4px 8px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }}
          >
            {IA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleSaveBase} disabled={saving}>
            Sauvegarder nom / IA
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleting(true)}>
            Supprimer
          </button>
        </div>
      </div>

      <div className="detail-page-body">
        {/* Stats */}
        <div className="detail-page-section">
          <div className="detail-page-section-header">
            <h3>Stats</h3>
            <button className="btn btn-sm btn-primary" onClick={handleSaveStats} disabled={saving}>Sauvegarder</button>
          </div>
          <div className="detail-page-fields">
            {(Object.entries(stats) as [keyof typeof stats, number][]).map(([key, val]) => (
              <div key={key} className="detail-page-field">
                <label>{key}</label>
                <input
                  type="number"
                  value={val}
                  min={0}
                  onChange={e => setStats(p => ({ ...p, [key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Récompenses */}
        <div className="detail-page-section">
          <div className="detail-page-section-header">
            <h3>{isInvocation ? 'Paramètres invocation' : 'Récompenses'}</h3>
            <button className="btn btn-sm btn-primary" onClick={handleSaveRewards} disabled={saving}>Sauvegarder</button>
          </div>
          <div className="detail-page-fields">
            {!isInvocation && (
              <div className="detail-page-field">
                <label>XP récompense</label>
                <input type="number" min={0} value={rewards.xpRecompense}
                  onChange={e => setRewards(p => ({ ...p, xpRecompense: Number(e.target.value) }))} />
              </div>
            )}
            <div className="detail-page-field">
              <label>Or min</label>
              <input type="number" min={0} value={rewards.orMin}
                onChange={e => setRewards(p => ({ ...p, orMin: Number(e.target.value) }))} />
            </div>
            <div className="detail-page-field">
              <label>Or max</label>
              <input type="number" min={0} value={rewards.orMax}
                onChange={e => setRewards(p => ({ ...p, orMax: Number(e.target.value) }))} />
            </div>
            {isInvocation && (
              <div className="detail-page-field">
                <label>PV Scaling (ex: 0.5)</label>
                <input type="number" step={0.05} min={0} max={2} value={pvScaling}
                  onChange={e => setPvScaling(Number(e.target.value))} />
              </div>
            )}
          </div>
        </div>

        {/* Sorts */}
        <div className="detail-page-section">
          <div className="detail-page-section-header">
            <h3>Sorts ({monstre.sorts?.length || 0})</h3>
          </div>
          <div className="sort-list" style={{ marginBottom: 10 }}>
            {monstre.sorts && monstre.sorts.length > 0 ? (
              [...monstre.sorts].sort((a, b) => a.priorite - b.priorite).map(ms => (
                <div key={ms.id} className="sort-item">
                  <div>
                    <span className="sort-name">{ms.sort?.nom || `Sort #${ms.sortId}`}</span>
                    {ms.sort && (
                      <span className="sort-meta">
                        <span>{ms.sort.coutPA} PA</span>
                        <span>{ms.sort.degatsMin}-{ms.sort.degatsMax} dmg</span>
                        <span>{ms.sort.porteeMin}-{ms.sort.porteeMax} PO</span>
                        {ms.sort.estSoin && <span style={{ color: 'var(--success)' }}>Soin</span>}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-info">P{ms.priorite}</span>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveSort(ms.sortId)}>X</button>
                  </div>
                </div>
              ))
            ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun sort</div>}
          </div>
          <div className="inline-add">
            <select value={addSortId} onChange={e => setAddSortId(Number(e.target.value))}>
              <option value={0}>-- Sort --</option>
              {allSorts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            <input type="number" value={addSortPrio} onChange={e => setAddSortPrio(Number(e.target.value))}
              min={1} style={{ width: 60 }} placeholder="Prio" />
            <button className="btn btn-sm btn-success" onClick={handleAddSort} disabled={!addSortId}>+ Ajouter</button>
          </div>
        </div>

        {/* Drops (ennemi uniquement) */}
        {!isInvocation && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Drops ({monstre.drops?.length || 0})</h3>
            </div>
            <div className="sort-list" style={{ marginBottom: 10 }}>
              {monstre.drops && monstre.drops.length > 0 ? (
                monstre.drops.map(d => (
                  <div key={d.id} className="sort-item">
                    <div>
                      <span className="sort-name">
                        {d.ressource ? d.ressource.nom : d.equipement ? d.equipement.nom : '?'}
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        {d.ressource ? 'Ressource' : 'Equipement'} | {Math.round(d.tauxDrop * 100)}% | x{d.quantiteMin}-{d.quantiteMax}
                      </span>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveDrop(d.id)}>X</button>
                  </div>
                ))
              ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun drop</div>}
            </div>
            <div className="inline-add" style={{ flexWrap: 'wrap' }}>
              <select value={dropType} onChange={e => { setDropType(e.target.value as 'ressource' | 'equipement'); setDropTargetId(0); }}>
                <option value="ressource">Ressource</option>
                <option value="equipement">Equipement</option>
              </select>
              <select value={dropTargetId} onChange={e => setDropTargetId(Number(e.target.value))}>
                <option value={0}>-- Choisir --</option>
                {(dropType === 'ressource' ? allResources : allEquipment).map(item => (
                  <option key={item.id} value={item.id}>{item.nom}</option>
                ))}
              </select>
              <input type="number" value={dropRate} onChange={e => setDropRate(Number(e.target.value))}
                step={0.05} min={0} max={1} style={{ width: 60 }} title="Taux (0-1)" />
              <input type="number" value={dropMin} onChange={e => setDropMin(Number(e.target.value))}
                min={1} style={{ width: 50 }} title="Qté min" />
              <input type="number" value={dropMax} onChange={e => setDropMax(Number(e.target.value))}
                min={1} style={{ width: 50 }} title="Qté max" />
              <button className="btn btn-sm btn-success" onClick={handleAddDrop} disabled={!dropTargetId}>+ Ajouter</button>
            </div>
          </div>
        )}

        {/* Régions (ennemi uniquement) */}
        {!isInvocation && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Régions ({monstre.regions?.length || 0})</h3>
            </div>
            <div className="sort-list" style={{ marginBottom: 10 }}>
              {monstre.regions && monstre.regions.length > 0 ? (
                monstre.regions.map((r, i) => (
                  <div key={i} className="sort-item">
                    <div>
                      <span className="sort-name">{r.region?.nom || `Region #${r.regionId}`}</span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        Probabilité : {Math.round(r.probabilite * 100)}%
                      </span>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveRegion(r.regionId)}>X</button>
                  </div>
                ))
              ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune région</div>}
            </div>
            <div className="inline-add">
              <select value={addRegionId} onChange={e => setAddRegionId(Number(e.target.value))}>
                <option value={0}>-- Région --</option>
                {allRegions.map(r => <option key={r.id} value={r.id}>{r.nom} (Niv {r.niveauMin}-{r.niveauMax})</option>)}
              </select>
              <input type="number" value={addRegionProba} onChange={e => setAddRegionProba(Number(e.target.value))}
                step={0.05} min={0} max={1} style={{ width: 60 }} title="Probabilité" />
              <button className="btn btn-sm btn-success" onClick={handleAddRegion} disabled={!addRegionId}>+ Ajouter</button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleting}
        message={`Supprimer "${monstre.nom}" définitivement ?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
};

export default MonstreDetailPage;
