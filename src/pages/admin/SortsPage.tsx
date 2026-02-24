import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type Column } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { sortsApi, racesApi } from '../../api/static';
import type { Sort, Race, StatType } from '../../types';
import '../../styles/admin.css';

type TabFilter = 'all' | 'race' | 'monstre' | 'invocation';
type CreateStep = 'origin' | 'race' | 'flags' | 'name';
type SortOrigin = 'race' | 'monstre' | 'neutre';

// Flags disponibles à la création
const FLAG_OPTIONS = [
  { key: 'estSoin', label: '💚 Soin', desc: 'Soigne au lieu de blesser' },
  { key: 'estInvocation', label: '🔮 Invocation', desc: 'Invoque un familier' },
  { key: 'estVolDeVie', label: '🩸 Vol de vie', desc: 'Regagne des PV sur les dégâts' },
  { key: 'estGlyphe', label: '🔶 Glyphe', desc: 'Pose une zone visible (déclenche au tour)' },
  { key: 'estPiege', label: '🪤 Piège', desc: 'Pose une zone cachée (déclenche au passage)' },
  { key: 'estTeleportation', label: '✨ Téléportation', desc: 'Le lanceur se téléporte à la position cible' },
  { key: 'estDispelOnly', label: '⚔️ Standard', desc: 'Sort de dégâts ou utilitaire normal' },
] as const;

const CreateModal: React.FC<{
  open: boolean;
  races: Race[];
  onCancel: () => void;
  onCreate: (nom: string, payload: Partial<Sort>) => Promise<void>;
}> = ({ open, races, onCancel, onCreate }) => {
  const [step, setStep] = useState<CreateStep>('origin');
  const [origin, setOrigin] = useState<SortOrigin>('neutre');
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [flags, setFlags] = useState<string[]>(['estDispelOnly']);
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setStep('origin'); setOrigin('neutre'); setSelectedRaceId(null); setFlags(['estDispelOnly']); setNom(''); setSaving(false); };
  const handleCancel = () => { reset(); onCancel(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    const payload: Partial<Sort> = {
      nom: nom.trim(),
      type: 'SORT',
      statUtilisee: 'INTELLIGENCE' as StatType,
      coutPA: 3,
      porteeMin: 1,
      porteeMax: 5,
      ligneDeVue: true,
      degatsMin: 0,
      degatsMax: 0,
      degatsCritMin: 0,
      degatsCritMax: 0,
      chanceCritBase: 0.01,
      cooldown: 0,
      tauxEchec: 0,
      niveauApprentissage: 1,
      raceId: origin === 'race' ? selectedRaceId : null,
      zoneId: null,
      invocationTemplateId: null,
      estSoin: flags.includes('estSoin'),
      estInvocation: flags.includes('estInvocation'),
      estVolDeVie: flags.includes('estVolDeVie'),
      estGlyphe: flags.includes('estGlyphe'),
      estPiege: flags.includes('estPiege'),
      estTeleportation: flags.includes('estTeleportation'),
      porteeModifiable: !flags.includes('estInvocation') && !flags.includes('estTeleportation'),
    };
    await onCreate(nom.trim(), payload);
    reset();
  };

  const nextStep = () => {
    if (step === 'origin') {
      if (origin === 'race') setStep('race');
      else setStep('flags');
    } else if (step === 'race') {
      setStep('flags');
    } else if (step === 'flags') {
      setStep('name');
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-header">
          <h3>Créer un sort</h3>
          <button className="modal-close" onClick={handleCancel}>✕</button>
        </div>
        <div className="modal-body">
          {step === 'origin' && (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Ce sort appartient à :</p>
              <div style={{ display: 'flex', gap: 10 }}>
                {([
                  { key: 'race', label: '🧝 Race', desc: 'Sort appris par une race de personnage' },
                  { key: 'monstre', label: '👹 Monstre', desc: 'Sort utilisé par des monstres' },
                  { key: 'neutre', label: '⚡ Neutre', desc: 'Sort générique / utilitaire' },
                ] as { key: SortOrigin; label: string; desc: string }[]).map(o => (
                  <button
                    key={o.key}
                    className={`btn ${origin === o.key ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '14px 8px', fontSize: 13 }}
                    onClick={() => setOrigin(o.key)}
                  >
                    {o.label}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={nextStep}>Suivant →</button>
              </div>
            </div>
          )}

          {step === 'race' && (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Choisir la race :</p>
              <select
                value={selectedRaceId ?? ''}
                onChange={e => setSelectedRaceId(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 14 }}
              >
                <option value="">-- Sélectionner --</option>
                {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep('origin')}>← Retour</button>
                <button className="btn btn-primary" onClick={nextStep} disabled={!selectedRaceId}>Suivant →</button>
              </div>
            </div>
          )}

          {step === 'flags' && (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Type de sort (peut en cocher plusieurs) :</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {FLAG_OPTIONS.filter(f => f.key !== 'estDispelOnly').map(f => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: flags.includes(f.key) ? 'rgba(233,69,96,0.1)' : 'var(--bg-light)', border: `1px solid ${flags.includes(f.key) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={flags.includes(f.key)} onChange={e => {
                      if (e.target.checked) setFlags(prev => [...prev.filter(k => k !== 'estDispelOnly'), f.key]);
                      else setFlags(prev => { const next = prev.filter(k => k !== f.key); return next.length === 0 ? ['estDispelOnly'] : next; });
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.desc}</div>
                    </div>
                  </label>
                ))}
                {flags.length === 0 || (flags.length === 1 && flags[0] === 'estDispelOnly') ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun flag = sort de dégâts standard</div>
                ) : null}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => origin === 'race' ? setStep('race') : setStep('origin')}>← Retour</button>
                <button className="btn btn-primary" onClick={nextStep}>Suivant →</button>
              </div>
            </div>
          )}

          {step === 'name' && (
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Nom du sort
              </label>
              <input
                autoFocus
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Ex : Boule de feu"
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep('flags')}>← Retour</button>
                <button type="submit" className="btn btn-primary" disabled={!nom.trim() || saving}>
                  {saving ? 'Création...' : 'Créer et configurer →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const SortsPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, create, remove } = useCrud(sortsApi);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<Sort | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [raceFilter, setRaceFilter] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => { racesApi.getAll().then(setRaces); }, []);

  const handleTabChange = (tab: TabFilter) => {
    setActiveTab(tab);
    setRaceFilter(null);
    setSearchText('');
  };

  const filteredItems = items.filter(sort => {
    switch (activeTab) {
      case 'race': if (sort.raceId === null) return false; break;
      case 'monstre': if (sort.raceId !== null || sort.estInvocation) return false; break;
      case 'invocation': if (!sort.estInvocation) return false; break;
    }
    if (activeTab === 'race' && raceFilter !== null && sort.raceId !== raceFilter) return false;
    if (searchText && !sort.nom.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const sortedItems = activeTab === 'race'
    ? [...filteredItems].sort((a, b) => {
        if (raceFilter !== null) return a.niveauApprentissage - b.niveauApprentissage;
        const raceCmp = (a.race?.nom || '').localeCompare(b.race?.nom || '');
        return raceCmp !== 0 ? raceCmp : a.niveauApprentissage - b.niveauApprentissage;
      })
    : filteredItems;

  const handleCreate = async (nom: string, payload: Partial<Sort>) => {
    const created = await create(payload);
    setShowCreate(false);
    navigate(`/admin/sorts/${created.id}`);
  };

  const columns: Column<Sort>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    { key: 'type', header: 'Type' },
    { key: 'statUtilisee', header: 'Stat' },
    { key: 'coutPA', header: 'PA' },
    { key: 'degats', header: 'Dégâts', render: (item) => `${item.degatsMin}-${item.degatsMax}` },
    { key: 'portee', header: 'Portée', render: (item) => `${item.porteeMin}-${item.porteeMax}` },
    {
      key: 'flags', header: 'Flags',
      render: (item) => {
        const flags: string[] = [];
        if (item.estSoin) flags.push('Soin');
        if (item.estInvocation) flags.push('Invoc.');
        if (item.estVolDeVie) flags.push('VdV');
        if (item.estGlyphe) flags.push('Glyphe');
        if (item.estPiege) flags.push('Piège');
        if (item.ligneDirecte) flags.push('LDroite');
        if (item.tauxEchec > 0) flags.push(`${Math.round(item.tauxEchec * 100)}%`);
        return flags.join(', ') || '-';
      },
    },
    { key: 'niveauApprentissage', header: 'Niv.' },
    { key: 'race', header: 'Race', render: (item) => item.race?.nom ?? '-' },
    { key: 'cooldown', header: 'CD' },
  ];

  const tabs = [
    { key: 'all' as TabFilter, label: 'Tous', count: items.length },
    { key: 'race' as TabFilter, label: 'Sorts de race', count: items.filter(s => s.raceId !== null).length },
    { key: 'monstre' as TabFilter, label: 'Sorts de monstre', count: items.filter(s => s.raceId === null && !s.estInvocation).length },
    { key: 'invocation' as TabFilter, label: 'Invocations', count: items.filter(s => s.estInvocation).length },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Sorts</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Créer</button>
      </div>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Barre de recherche */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0' }}>
        <input
          type="text"
          placeholder="Rechercher un sort par nom..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 13 }}
        />
        {searchText && (
          <button className="btn btn-secondary btn-sm" onClick={() => setSearchText('')}>✕</button>
        )}
      </div>

      {/* Filtre par race (tab "Sorts de race" uniquement) */}
      {activeTab === 'race' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <button
            className={`btn btn-sm ${raceFilter === null ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRaceFilter(null)}
          >
            Toutes ({items.filter(s => s.raceId !== null).length})
          </button>
          {races.map(race => {
            const count = items.filter(s => s.raceId === race.id).length;
            return (
              <button
                key={race.id}
                className={`btn btn-sm ${raceFilter === race.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRaceFilter(raceFilter === race.id ? null : race.id)}
              >
                {race.nom} ({count})
              </button>
            );
          })}
        </div>
      )}

      <DataTable
        columns={columns}
        data={sortedItems}
        loading={loading}
        onDelete={item => setDeleting(item)}
        onRowClick={item => navigate(`/admin/sorts/${item.id}`)}
      />

      <CreateModal open={showCreate} races={races} onCancel={() => setShowCreate(false)} onCreate={handleCreate} />

      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" ?`}
        onConfirm={async () => { if (deleting) { await remove(deleting.id); setDeleting(null); } }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default SortsPage;
