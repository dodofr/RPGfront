import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { equipmentApi, zonesApi, setsApi, resourcesApi, recipesAdminApi } from '../../api/static';
import { metiersApi } from '../../api/metiers';
import type { Equipment, Zone, Panoplie, Recette, Ressource, StatType, SlotType, LigneDegatsArme, Metier } from '../../types';
import '../../styles/admin.css';

const STAT_OPTIONS: { value: StatType; label: string }[] = [
  { value: 'FORCE', label: 'Force' },
  { value: 'INTELLIGENCE', label: 'Intelligence' },
  { value: 'DEXTERITE', label: 'Dextérité' },
  { value: 'AGILITE', label: 'Agilité' },
  { value: 'VIE', label: 'Vie' },
  { value: 'CHANCE', label: 'Chance' },
];

const SLOT_LABELS: Record<SlotType, string> = {
  ARME: 'Arme', COIFFE: 'Coiffe', AMULETTE: 'Amulette', BOUCLIER: 'Bouclier',
  HAUT: 'Haut', BAS: 'Bas', ANNEAU1: 'Anneau 1', ANNEAU2: 'Anneau 2', FAMILIER: 'Familier',
};

const EquipementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equip, setEquip] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Référentiels
  const [zones, setZones] = useState<Zone[]>([]);
  const [panoplies, setPanoplies] = useState<Panoplie[]>([]);
  const [allResources, setAllResources] = useState<Ressource[]>([]);

  // Recette
  const [recette, setRecette] = useState<Recette | null>(null);
  const [recetteNom, setRecetteNom] = useState('');
  const [recetteNiveau, setRecetteNiveau] = useState(1);
  const [recetteOr, setRecetteOr] = useState(0);
  const [recetteMetierId, setRecetteMetierId] = useState<number | null>(null);
  const [recetteNiveauMetier, setRecetteNiveauMetier] = useState(1);
  const [recetteXpCraft, setRecetteXpCraft] = useState(10);
  const [allMetiers, setAllMetiers] = useState<Metier[]>([]);
  const [savingRecette, setSavingRecette] = useState(false);
  const [addIngredientId, setAddIngredientId] = useState<number>(0);
  const [addIngredientQty, setAddIngredientQty] = useState<number>(1);

  // Champs éditables — base
  const [nom, setNom] = useState('');
  const [niveauMinimum, setNiveauMinimum] = useState(1);
  const [poids, setPoids] = useState(1);
  const [panoplieId, setPanoplieId] = useState<number | null>(null);

  // Stats bonuses
  const [bonusForce, setBonusForce] = useState(0);
  const [bonusForceMax, setBonusForceMax] = useState<number | null>(null);
  const [bonusIntelligence, setBonusIntelligence] = useState(0);
  const [bonusIntelligenceMax, setBonusIntelligenceMax] = useState<number | null>(null);
  const [bonusDexterite, setBonusDexterite] = useState(0);
  const [bonusDexteriteMax, setBonusDexteriteMax] = useState<number | null>(null);
  const [bonusAgilite, setBonusAgilite] = useState(0);
  const [bonusAgiliteMax, setBonusAgiliteMax] = useState<number | null>(null);
  const [bonusVie, setBonusVie] = useState(0);
  const [bonusVieMax, setBonusVieMax] = useState<number | null>(null);
  const [bonusChance, setBonusChance] = useState(0);
  const [bonusChanceMax, setBonusChanceMax] = useState<number | null>(null);
  const [bonusPA, setBonusPA] = useState(0);
  const [bonusPAMax, setBonusPAMax] = useState<number | null>(null);
  const [bonusPM, setBonusPM] = useState(0);
  const [bonusPMMax, setBonusPMMax] = useState<number | null>(null);
  const [bonusPO, setBonusPO] = useState(0);
  const [bonusPOMax, setBonusPOMax] = useState<number | null>(null);
  const [bonusCritique, setBonusCritique] = useState(0);
  const [bonusCritiqueMax, setBonusCritiqueMax] = useState<number | null>(null);
  const [resistanceForce, setResistanceForce] = useState(0);
  const [resistanceForceMax, setResistanceForceMax] = useState<number | null>(null);
  const [resistanceIntelligence, setResistanceIntelligence] = useState(0);
  const [resistanceIntelligenceMax, setResistanceIntelligenceMax] = useState<number | null>(null);
  const [resistanceDexterite, setResistanceDexterite] = useState(0);
  const [resistanceDexteriteMax, setResistanceDexteriteMax] = useState<number | null>(null);
  const [resistanceAgilite, setResistanceAgilite] = useState(0);
  const [resistanceAgiliteMax, setResistanceAgiliteMax] = useState<number | null>(null);
  const [bonusDommages, setBonusDommages] = useState(0);
  const [bonusDommagesMax, setBonusDommagesMax] = useState<number | null>(null);
  const [bonusSoins, setBonusSoins] = useState(0);
  const [bonusSoinsMax, setBonusSoinsMax] = useState<number | null>(null);

  // Arme
  const [chanceCritBase, setChanceCritBase] = useState(0.05);
  const [bonusCrit, setBonusCrit] = useState(0);
  const [coutPA, setCoutPA] = useState(4);
  const [porteeMin, setPorteeMin] = useState(1);
  const [porteeMax, setPorteeMax] = useState(1);
  const [ligneDeVue, setLigneDeVue] = useState(true);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [tauxEchec, setTauxEchec] = useState(0);

  // Lignes de dégâts
  const [newLigne, setNewLigne] = useState({ degatsMin: 0, degatsMax: 0, statUtilisee: 'FORCE' as StatType, estVolDeVie: false, estSoin: false });

  const loadRecette = useCallback(async (equipId: number) => {
    const all = await recipesAdminApi.getAll();
    const found = all.find(r => r.equipementId === equipId) || null;
    setRecette(found);
    if (found) {
      setRecetteNom(found.nom);
      setRecetteNiveau(found.niveauMinimum);
      setRecetteOr(found.coutOr);
      setRecetteMetierId(found.metierId ?? null);
      setRecetteNiveauMetier(found.niveauMetierRequis ?? 1);
      setRecetteXpCraft(found.xpCraft ?? 10);
    }
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await equipmentApi.getById(Number(id));
      setEquip(data);
      setNom(data.nom);
      setNiveauMinimum(data.niveauMinimum);
      setPoids(data.poids);
      setPanoplieId(data.panoplieId);
      setBonusForce(data.bonusForce); setBonusForceMax(data.bonusForceMax);
      setBonusIntelligence(data.bonusIntelligence); setBonusIntelligenceMax(data.bonusIntelligenceMax);
      setBonusDexterite(data.bonusDexterite); setBonusDexteriteMax(data.bonusDexteriteMax);
      setBonusAgilite(data.bonusAgilite); setBonusAgiliteMax(data.bonusAgiliteMax);
      setBonusVie(data.bonusVie); setBonusVieMax(data.bonusVieMax);
      setBonusChance(data.bonusChance); setBonusChanceMax(data.bonusChanceMax);
      setBonusPA(data.bonusPA); setBonusPAMax(data.bonusPAMax);
      setBonusPM(data.bonusPM); setBonusPMMax(data.bonusPMMax);
      setBonusPO(data.bonusPO); setBonusPOMax(data.bonusPOMax);
      setBonusCritique(data.bonusCritique); setBonusCritiqueMax(data.bonusCritiqueMax);
      setResistanceForce(data.resistanceForce ?? 0); setResistanceForceMax(data.resistanceForceMax ?? null);
      setResistanceIntelligence(data.resistanceIntelligence ?? 0); setResistanceIntelligenceMax(data.resistanceIntelligenceMax ?? null);
      setResistanceDexterite(data.resistanceDexterite ?? 0); setResistanceDexteriteMax(data.resistanceDexteriteMax ?? null);
      setResistanceAgilite(data.resistanceAgilite ?? 0); setResistanceAgiliteMax(data.resistanceAgiliteMax ?? null);
      setBonusDommages(data.bonusDommages ?? 0); setBonusDommagesMax(data.bonusDommagesMax ?? null);
      setBonusSoins(data.bonusSoins ?? 0); setBonusSoinsMax(data.bonusSoinsMax ?? null);
      if (data.slot === 'ARME') {
        setChanceCritBase(data.chanceCritBase ?? 0.05);
        setBonusCrit(data.bonusCrit ?? 0);
        setCoutPA(data.coutPA ?? 4);
        setPorteeMin(data.porteeMin ?? 1);
        setPorteeMax(data.porteeMax ?? 1);
        setLigneDeVue(data.ligneDeVue ?? true);
        setZoneId(data.zoneId);
        setCooldown(data.cooldown ?? 0);
        setTauxEchec(data.tauxEchec ?? 0);
      }
      await loadRecette(Number(id));
    } finally {
      setLoading(false);
    }
  }, [id, loadRecette]);

  useEffect(() => {
    load();
    zonesApi.getAll().then(setZones);
    setsApi.getAll().then(setPanoplies);
    resourcesApi.getAll().then(setAllResources);
    metiersApi.getAll().then(setAllMetiers);
  }, [load]);

  const handleSaveBase = async () => {
    if (!equip) return;
    setSaving(true);
    const payload: Partial<Equipment> = { nom, niveauMinimum, poids, panoplieId: panoplieId || null };
    if (equip.slot === 'ARME') {
      Object.assign(payload, { chanceCritBase, bonusCrit, coutPA, porteeMin, porteeMax, ligneDeVue, zoneId: zoneId || null, cooldown, tauxEchec });
    }
    await equipmentApi.update(equip.id, payload);
    await load();
    setSaving(false);
  };

  const handleSaveStats = async () => {
    if (!equip) return;
    setSaving(true);
    await equipmentApi.update(equip.id, {
      bonusForce, bonusForceMax, bonusIntelligence, bonusIntelligenceMax,
      bonusDexterite, bonusDexteriteMax, bonusAgilite, bonusAgiliteMax,
      bonusVie, bonusVieMax, bonusChance, bonusChanceMax,
      bonusPA, bonusPAMax, bonusPM, bonusPMMax, bonusPO, bonusPOMax,
      bonusCritique, bonusCritiqueMax,
      resistanceForce, resistanceForceMax,
      resistanceIntelligence, resistanceIntelligenceMax,
      resistanceDexterite, resistanceDexteriteMax,
      resistanceAgilite, resistanceAgiliteMax,
      bonusDommages, bonusDommagesMax,
      bonusSoins, bonusSoinsMax,
    });
    await load();
    setSaving(false);
  };

  const handleAddLigne = async () => {
    if (!equip) return;
    const nextOrdre = (equip.lignesDegats?.length ?? 0) + 1;
    await equipmentApi.addLigne(equip.id, { ...newLigne, ordre: nextOrdre });
    setNewLigne({ degatsMin: 0, degatsMax: 0, statUtilisee: 'FORCE', estVolDeVie: false, estSoin: false });
    await load();
  };

  const handleRemoveLigne = async (ligneId: number) => {
    if (!equip) return;
    await equipmentApi.removeLigne(equip.id, ligneId);
    await load();
  };

  const handleSaveRecette = async () => {
    if (!equip) return;
    setSavingRecette(true);
    const metierData = {
      metierId: recetteMetierId || null,
      niveauMetierRequis: recetteNiveauMetier,
      xpCraft: recetteXpCraft,
    };
    if (recette) {
      await recipesAdminApi.update(recette.id, { nom: recetteNom, niveauMinimum: recetteNiveau, coutOr: recetteOr, ...metierData });
    } else {
      await recipesAdminApi.create({ nom: recetteNom || equip.nom, equipementId: equip.id, niveauMinimum: recetteNiveau, coutOr: recetteOr, ...metierData });
    }
    await loadRecette(equip.id);
    setSavingRecette(false);
  };

  const handleAddIngredient = async () => {
    if (!recette || !addIngredientId) return;
    await recipesAdminApi.addIngredient(recette.id, { ressourceId: addIngredientId, quantite: addIngredientQty });
    setAddIngredientId(0);
    await loadRecette(equip!.id);
  };

  const handleRemoveIngredient = async (ingredientId: number) => {
    if (!recette) return;
    await recipesAdminApi.removeIngredient(recette.id, ingredientId);
    await loadRecette(equip!.id);
  };

  const handleDeleteRecette = async () => {
    if (!recette) return;
    await recipesAdminApi.remove(recette.id);
    setRecette(null);
    setRecetteNom(''); setRecetteNiveau(1); setRecetteOr(0);
  };

  const handleDelete = async () => {
    if (!equip) return;
    await equipmentApi.remove(equip.id);
    navigate('/admin/objets');
  };

  if (loading) return <div className="admin-page"><p>Chargement...</p></div>;
  if (!equip) return <div className="admin-page"><p>Equipement introuvable.</p></div>;

  const isArme = equip.slot === 'ARME';

  const statRows: [string, number, (v: number) => void, number | null, (v: number | null) => void][] = [
    ['Force', bonusForce, setBonusForce, bonusForceMax, setBonusForceMax],
    ['Intelligence', bonusIntelligence, setBonusIntelligence, bonusIntelligenceMax, setBonusIntelligenceMax],
    ['Dextérité', bonusDexterite, setBonusDexterite, bonusDexteriteMax, setBonusDexteriteMax],
    ['Agilité', bonusAgilite, setBonusAgilite, bonusAgiliteMax, setBonusAgiliteMax],
    ['Vie', bonusVie, setBonusVie, bonusVieMax, setBonusVieMax],
    ['Chance', bonusChance, setBonusChance, bonusChanceMax, setBonusChanceMax],
    ['PA', bonusPA, setBonusPA, bonusPAMax, setBonusPAMax],
    ['PM', bonusPM, setBonusPM, bonusPMMax, setBonusPMMax],
    ['PO', bonusPO, setBonusPO, bonusPOMax, setBonusPOMax],
    ['Critique %', bonusCritique, setBonusCritique, bonusCritiqueMax, setBonusCritiqueMax],
  ];

  const resistanceRows: [string, number, (v: number) => void, number | null, (v: number | null) => void][] = [
    ['Résist. Force', resistanceForce, setResistanceForce, resistanceForceMax, setResistanceForceMax],
    ['Résist. Intelligence', resistanceIntelligence, setResistanceIntelligence, resistanceIntelligenceMax, setResistanceIntelligenceMax],
    ['Résist. Dextérité', resistanceDexterite, setResistanceDexterite, resistanceDexteriteMax, setResistanceDexteriteMax],
    ['Résist. Agilité', resistanceAgilite, setResistanceAgilite, resistanceAgiliteMax, setResistanceAgiliteMax],
    ['Bonus dégâts', bonusDommages, setBonusDommages, bonusDommagesMax, setBonusDommagesMax],
    ['Bonus soins', bonusSoins, setBonusSoins, bonusSoinsMax, setBonusSoinsMax],
  ];

  return (
    <div className="admin-page">
      {/* En-tête */}
      <div className="detail-page-header">
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/objets')}>
          ← Retour
        </button>
        <div className="detail-page-title">
          <input className="detail-page-name-input" value={nom} onChange={e => setNom(e.target.value)} />
          <span className="badge badge-muted">ID {equip.id}</span>
          <span className="badge badge-info">{SLOT_LABELS[equip.slot]}</span>
          {panoplies.find(p => p.id === panoplieId) && (
            <span className="badge badge-success">{panoplies.find(p => p.id === panoplieId)?.nom}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleting(true)}>Supprimer</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Colonne gauche : Général + Lignes de dégâts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Informations générales */}
        <div className="detail-page-section">
          <div className="detail-page-section-header">
            <h3>Général</h3>
            <button className="btn btn-sm btn-primary" onClick={handleSaveBase} disabled={saving}>Sauvegarder</button>
          </div>
          <div className="detail-page-fields">
            <div className="detail-page-field">
              <label>Niveau minimum</label>
              <input type="number" min={1} value={niveauMinimum} onChange={e => setNiveauMinimum(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Poids</label>
              <input type="number" min={0} value={poids} onChange={e => setPoids(Number(e.target.value))} />
            </div>
            <div className="detail-page-field">
              <label>Panoplie</label>
              <select value={panoplieId ?? ''} onChange={e => setPanoplieId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- Aucune --</option>
                {panoplies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            {isArme && (
              <>
                <div className="detail-page-field">
                  <label>Chance crit base</label>
                  <input type="number" step={0.01} min={0} max={1} value={chanceCritBase} onChange={e => setChanceCritBase(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>Bonus crit (+X min/max)</label>
                  <input type="number" min={0} value={bonusCrit} onChange={e => setBonusCrit(Number(e.target.value))} />
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
                  <label>Taux échec</label>
                  <input type="number" step={0.01} min={0} max={1} value={tauxEchec} onChange={e => setTauxEchec(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>Zone d'effet</label>
                  <select value={zoneId ?? ''} onChange={e => setZoneId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- Aucune --</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.nom} ({z.type})</option>)}
                  </select>
                </div>
                <div className="detail-page-flag-row" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={ligneDeVue} onChange={e => setLigneDeVue(e.target.checked)} />
                    Ligne de vue requise
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lignes de dégâts (arme seulement) */}
        {isArme && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Lignes de dégâts ({equip.lignesDegats?.length ?? 0})</h3>
            </div>
            {equip.lignesDegats && equip.lignesDegats.length > 0 ? (
              <div className="sort-list" style={{ marginBottom: 10 }}>
                {equip.lignesDegats.map((l: LigneDegatsArme) => (
                  <div key={l.id} className="sort-item">
                    <div>
                      <span className="sort-name">Ligne {l.ordre}</span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        {l.degatsMin}–{l.degatsMax} {l.statUtilisee}
                        {l.estVolDeVie && <span style={{ color: '#00c853', marginLeft: 4 }}>Vol de vie</span>}
                        {l.estSoin && <span style={{ color: 'var(--success)', marginLeft: 4 }}>Soin</span>}
                      </span>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemoveLigne(l.id)}>X</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>
                Aucune ligne — arme inutilisable en combat
              </div>
            )}
            <div className="inline-add" style={{ flexWrap: 'wrap' }}>
              <input type="number" placeholder="Min" value={newLigne.degatsMin} onChange={e => setNewLigne(p => ({ ...p, degatsMin: +e.target.value }))} style={{ width: 60 }} />
              <input type="number" placeholder="Max" value={newLigne.degatsMax} onChange={e => setNewLigne(p => ({ ...p, degatsMax: +e.target.value }))} style={{ width: 60 }} />
              <select value={newLigne.statUtilisee} onChange={e => setNewLigne(p => ({ ...p, statUtilisee: e.target.value as StatType }))}>
                {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 2 }}>
                <input type="checkbox" checked={newLigne.estVolDeVie} onChange={e => setNewLigne(p => ({ ...p, estVolDeVie: e.target.checked }))} /> VdV
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 2 }}>
                <input type="checkbox" checked={newLigne.estSoin} onChange={e => setNewLigne(p => ({ ...p, estSoin: e.target.checked }))} /> Soin
              </label>
              <button className="btn btn-sm btn-primary" onClick={handleAddLigne}>+ Ajouter</button>
            </div>
          </div>
        )}

        </div>{/* fin colonne gauche */}

        {/* Colonne droite : Bonus de stats + Recette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Bonus de stats */}
        <div className="detail-page-section">
          <div className="detail-page-section-header">
            <h3>Bonus de stats</h3>
            <button className="btn btn-sm btn-primary" onClick={handleSaveStats} disabled={saving}>Sauvegarder</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 20px 1fr', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stat</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Min</span>
              <span></span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max (optionnel)</span>
            </div>
            {statRows.map(([label, val, setVal, maxVal, setMaxVal]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 20px 1fr', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <input type="number" value={val} onChange={e => setVal(Number(e.target.value))}
                  style={{ padding: '4px 6px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }} />
                <span style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                <input type="number" value={maxVal ?? ''} placeholder="—"
                  onChange={e => setMaxVal(e.target.value ? Number(e.target.value) : null)}
                  style={{ padding: '4px 6px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }} />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Résistances aux dégâts
              </span>
            </div>
            {resistanceRows.map(([label, val, setVal, maxVal, setMaxVal]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 20px 1fr', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>{label}</span>
                <input type="number" min={0} max={75} value={val} onChange={e => setVal(Number(e.target.value))}
                  style={{ padding: '4px 6px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }} />
                <span style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                <input type="number" min={0} max={75} value={maxVal ?? ''} placeholder="—"
                  onChange={e => setMaxVal(e.target.value ? Number(e.target.value) : null)}
                  style={{ padding: '4px 6px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Recette */}
        <div className="detail-page-section">
          <div className="detail-page-section-header">
            <h3>{recette ? 'Recette de craft' : 'Recette de craft'}</h3>
            {recette && (
              <button className="btn btn-sm btn-danger" onClick={handleDeleteRecette}>Supprimer la recette</button>
            )}
          </div>

          {!recette ? (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Aucune recette pour cet équipement.</p>
              <div className="detail-page-fields" style={{ marginBottom: 10 }}>
                <div className="detail-page-field">
                  <label>Nom de la recette</label>
                  <input type="text" value={recetteNom} placeholder={`Recette : ${equip.nom}`}
                    onChange={e => setRecetteNom(e.target.value)} />
                </div>
                <div className="detail-page-field">
                  <label>Niveau minimum</label>
                  <input type="number" min={1} value={recetteNiveau} onChange={e => setRecetteNiveau(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>Coût en or</label>
                  <input type="number" min={0} value={recetteOr} onChange={e => setRecetteOr(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>Métier requis</label>
                  <select value={recetteMetierId ?? ''} onChange={e => setRecetteMetierId(e.target.value === '' ? null : Number(e.target.value))}>
                    <option value="">— Aucun —</option>
                    {allMetiers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
                <div className="detail-page-field">
                  <label>Niv. métier requis</label>
                  <input type="number" min={1} value={recetteNiveauMetier} onChange={e => setRecetteNiveauMetier(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>XP craft gagné</label>
                  <input type="number" min={0} value={recetteXpCraft} onChange={e => setRecetteXpCraft(Number(e.target.value))} />
                </div>
              </div>
              <button className="btn btn-sm btn-success" onClick={handleSaveRecette} disabled={savingRecette}>
                + Créer la recette
              </button>
            </div>
          ) : (
            <div>
              <div className="detail-page-fields" style={{ marginBottom: 12 }}>
                <div className="detail-page-field">
                  <label>Nom</label>
                  <input type="text" value={recetteNom} onChange={e => setRecetteNom(e.target.value)} />
                </div>
                <div className="detail-page-field">
                  <label>Niveau minimum</label>
                  <input type="number" min={1} value={recetteNiveau} onChange={e => setRecetteNiveau(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>Coût en or</label>
                  <input type="number" min={0} value={recetteOr} onChange={e => setRecetteOr(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>Métier requis</label>
                  <select value={recetteMetierId ?? ''} onChange={e => setRecetteMetierId(e.target.value === '' ? null : Number(e.target.value))}>
                    <option value="">— Aucun —</option>
                    {allMetiers.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
                <div className="detail-page-field">
                  <label>Niv. métier requis</label>
                  <input type="number" min={1} value={recetteNiveauMetier} onChange={e => setRecetteNiveauMetier(Number(e.target.value))} />
                </div>
                <div className="detail-page-field">
                  <label>XP craft gagné</label>
                  <input type="number" min={0} value={recetteXpCraft} onChange={e => setRecetteXpCraft(Number(e.target.value))} />
                </div>
              </div>
              <button className="btn btn-sm btn-primary" style={{ marginBottom: 12 }} onClick={handleSaveRecette} disabled={savingRecette}>
                Sauvegarder la recette
              </button>

              <h4 style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Ingrédients ({recette.ingredients?.length || 0})
              </h4>
              <div className="sort-list" style={{ marginBottom: 10 }}>
                {recette.ingredients && recette.ingredients.length > 0 ? (
                  recette.ingredients.map(ing => (
                    <div key={ing.id} className="sort-item">
                      <div>
                        <span className="sort-name">{ing.ressource?.nom || `Ressource #${ing.ressourceId}`}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>x{ing.quantite}</span>
                      </div>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveIngredient(ing.id)}>X</button>
                    </div>
                  ))
                ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun ingrédient</div>}
              </div>
              <div className="inline-add">
                <select value={addIngredientId} onChange={e => setAddIngredientId(Number(e.target.value))}>
                  <option value={0}>-- Ressource --</option>
                  {allResources.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
                <input type="number" value={addIngredientQty} onChange={e => setAddIngredientQty(Number(e.target.value))}
                  min={1} style={{ width: 60 }} placeholder="Qté" />
                <button className="btn btn-sm btn-success" onClick={handleAddIngredient} disabled={!addIngredientId}>+ Ajouter</button>
              </div>
            </div>
          )}
        </div>

        </div>{/* fin colonne droite */}
      </div>{/* fin grid */}

      <ConfirmDialog
        open={deleting}
        message={`Supprimer "${equip.nom}" définitivement ?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
};

export default EquipementDetailPage;
