import React, { useState, useEffect } from 'react';
import DataTable, { type Column } from '../../components/DataTable';
import FormModal, { type FieldDef } from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useCrud } from '../../hooks/useCrud';
import { donjonsApi, compositionsApi } from '../../api/donjons';
import { regionsApi, mapsApi, monstresApi } from '../../api/maps';
import type { Donjon, Region, GameMap, MonsterTemplate, DonjonSalle, DonjonSalleComposition } from '../../types';

const DIFFICULTIES = [4, 6, 8];

// ─── Mini composition editor per salle × difficulty ───────────────────────
interface CompEditorProps {
  donjon: Donjon;
  salle: DonjonSalle;
  monstres: MonsterTemplate[];
  onRefresh: () => void;
}

const CompEditor: React.FC<CompEditorProps> = ({ donjon, salle, monstres, onRefresh }) => {
  const [adding, setAdding] = useState<{ difficulte: number } | null>(null);
  const [newComp, setNewComp] = useState({ difficulte: 4, monstreTemplateId: 0, niveau: 1, quantite: 1 });

  const compsByDiff = (diff: number) =>
    (salle.compositions || []).filter(c => c.difficulte === diff);

  const handleDelete = async (comp: DonjonSalleComposition) => {
    await compositionsApi.remove(donjon.id, salle.id, comp.id);
    onRefresh();
  };

  const handleAdd = async () => {
    if (!newComp.monstreTemplateId) return;
    await compositionsApi.create(donjon.id, salle.id, {
      difficulte: newComp.difficulte,
      monstreTemplateId: newComp.monstreTemplateId,
      niveau: newComp.niveau,
      quantite: newComp.quantite,
    });
    setAdding(null);
    onRefresh();
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Salle {salle.ordre} — {salle.map?.nom || `Map ${salle.mapId}`}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {DIFFICULTIES.map(diff => (
          <div key={diff} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontWeight: 500, marginBottom: 4, color: diff === 4 ? '#4caf50' : diff === 6 ? '#ff9800' : '#f44336' }}>
              Difficulté {diff}
            </div>
            {compsByDiff(diff).length === 0 ? (
              <div className="meta" style={{ fontSize: 11 }}>Aucune</div>
            ) : (
              compsByDiff(diff).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ flex: 1 }}>{c.monstre?.nom ?? `M${c.monstreTemplateId}`} ×{c.quantite} Niv.{c.niveau}</span>
                  <button
                    className="btn btn-sm"
                    style={{ padding: '1px 5px', fontSize: 11, background: 'var(--danger, #c62828)', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                    onClick={() => handleDelete(c)}
                    title="Supprimer"
                  >×</button>
                </div>
              ))
            )}
            <button
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 11, marginTop: 4, width: '100%' }}
              onClick={() => { setAdding({ difficulte: diff }); setNewComp(n => ({ ...n, difficulte: diff })); }}
            >+ Ajouter</button>
          </div>
        ))}
      </div>
      {adding && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid var(--accent)', borderRadius: 6, background: 'var(--bg-secondary, #1a1a1a)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Ajouter entrée (diff. {adding.difficulte})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11 }}>Monstre</label>
              <select
                value={newComp.monstreTemplateId}
                onChange={e => setNewComp(n => ({ ...n, monstreTemplateId: Number(e.target.value) }))}
                style={{ display: 'block', minWidth: 160 }}
              >
                <option value={0}>-- Choisir --</option>
                {monstres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Niveau</label>
              <input type="number" min={1} value={newComp.niveau} style={{ width: 60, display: 'block' }}
                onChange={e => setNewComp(n => ({ ...n, niveau: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Quantité</label>
              <input type="number" min={1} max={8} value={newComp.quantite} style={{ width: 60, display: 'block' }}
                onChange={e => setNewComp(n => ({ ...n, quantite: Number(e.target.value) }))} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!newComp.monstreTemplateId}>Ajouter</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setAdding(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────
const DonjonsPage: React.FC = () => {
  const { items, loading, create, update, remove } = useCrud(donjonsApi);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Donjon | null>(null);
  const [deleting, setDeleting] = useState<Donjon | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [monstres, setMonstres] = useState<MonsterTemplate[]>([]);

  // Detail panel
  const [selectedDonjon, setSelectedDonjon] = useState<Donjon | null>(null);

  // Portail form
  const [portailForm, setPortailForm] = useState({ fromMapId: 0, positionX: 0, positionY: 0, nom: 'Entrée du donjon' });
  const [portailLoading, setPortailLoading] = useState(false);

  useEffect(() => {
    regionsApi.getAll().then(setRegions);
    mapsApi.getAll().then(setMaps);
    monstresApi.getAll().then(setMonstres);
  }, []);

  // When selecting a donjon, load full detail (with portails + compositions)
  const loadDetail = async (id: number) => {
    const d = await donjonsApi.getById(id);
    setSelectedDonjon(d);
    const portail = d.portails?.[0];
    if (portail) {
      setPortailForm({ fromMapId: portail.fromMapId, positionX: portail.positionX, positionY: portail.positionY, nom: portail.nom });
    } else {
      setPortailForm({ fromMapId: 0, positionX: 0, positionY: 0, nom: 'Entrée du donjon' });
    }
  };

  const handleSelectDonjon = (item: Donjon) => {
    loadDetail(item.id);
  };

  const handleSavePortail = async () => {
    if (!selectedDonjon || !portailForm.fromMapId) return;
    setPortailLoading(true);
    try {
      await donjonsApi.setPortail(selectedDonjon.id, portailForm);
      await loadDetail(selectedDonjon.id);
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.error || 'Erreur portail');
    }
    setPortailLoading(false);
  };

  const handleDeletePortail = async () => {
    if (!selectedDonjon) return;
    setPortailLoading(true);
    try {
      await donjonsApi.deletePortail(selectedDonjon.id);
      await loadDetail(selectedDonjon.id);
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.error || 'Erreur portail');
    }
    setPortailLoading(false);
  };

  const handleRefreshCompositions = () => {
    if (selectedDonjon) loadDetail(selectedDonjon.id);
  };

  const columns: Column<Donjon>[] = [
    { key: 'id', header: 'ID' },
    { key: 'nom', header: 'Nom' },
    {
      key: 'region',
      header: 'Region',
      render: (item) => item.region?.nom ?? String(item.regionId),
    },
    { key: 'niveauMin', header: 'Niveau min' },
    { key: 'niveauMax', header: 'Niveau max' },
    {
      key: 'boss',
      header: 'Boss',
      render: (item) => item.boss?.nom ?? String(item.bossId),
    },
  ];

  const baseFields: FieldDef[] = [
    { name: 'nom', label: 'Nom', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'text' },
    {
      name: 'regionId',
      label: 'Region',
      type: 'select',
      required: true,
      options: regions.map(r => ({ value: r.id, label: r.nom })),
    },
    { name: 'niveauMin', label: 'Niveau min', type: 'number', defaultValue: 1, min: 1 },
    { name: 'niveauMax', label: 'Niveau max', type: 'number', defaultValue: 5, min: 1 },
    {
      name: 'bossId',
      label: 'Boss',
      type: 'select',
      required: true,
      options: monstres.map(m => ({ value: m.id, label: m.nom })),
    },
  ];

  const salleFields: FieldDef[] = [
    { name: 'salle1MapId', label: 'Salle 1 (Map)', type: 'select', required: true, options: maps.map(m => ({ value: m.id, label: m.nom })) },
    { name: 'salle2MapId', label: 'Salle 2 (Map)', type: 'select', required: true, options: maps.map(m => ({ value: m.id, label: m.nom })) },
    { name: 'salle3MapId', label: 'Salle 3 (Map)', type: 'select', required: true, options: maps.map(m => ({ value: m.id, label: m.nom })) },
    { name: 'salle4MapId', label: 'Salle 4 - Boss (Map)', type: 'select', required: true, options: maps.map(m => ({ value: m.id, label: m.nom })) },
  ];

  const fields = [...baseFields, ...salleFields];

  const initialValues = editing
    ? {
        ...editing,
        salle1MapId: editing.salles?.find(s => s.ordre === 1)?.mapId,
        salle2MapId: editing.salles?.find(s => s.ordre === 2)?.mapId,
        salle3MapId: editing.salles?.find(s => s.ordre === 3)?.mapId,
        salle4MapId: editing.salles?.find(s => s.ordre === 4)?.mapId,
      }
    : undefined;

  const nonDungeonMaps = maps.filter(m => m.type !== 'DONJON' && m.type !== 'BOSS');

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Donjons</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Créer
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDonjon ? '1fr 420px' : '1fr', gap: 24 }}>
        {/* Table */}
        <div>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            onEdit={item => { setEditing(item); setShowForm(true); }}
            onDelete={item => setDeleting(item)}
            onRowClick={handleSelectDonjon}
          />
        </div>

        {/* Detail panel */}
        {selectedDonjon && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{selectedDonjon.nom}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDonjon(null)}>×</button>
            </div>

            {/* ── Portail section ── */}
            <h4 style={{ marginBottom: 8 }}>Portail d'entrée</h4>
            {selectedDonjon.portails?.[0] ? (
              <div style={{ marginBottom: 8, padding: 8, background: '#1a1a1a', borderRadius: 6, fontSize: 12 }}>
                <div><strong>Map :</strong> {maps.find(m => m.id === selectedDonjon.portails![0].fromMapId)?.nom ?? selectedDonjon.portails[0].fromMapId}</div>
                <div><strong>Position :</strong> ({selectedDonjon.portails[0].positionX}, {selectedDonjon.portails[0].positionY})</div>
                <div><strong>Nom :</strong> {selectedDonjon.portails[0].nom}</div>
              </div>
            ) : (
              <div className="meta" style={{ fontSize: 12, marginBottom: 8 }}>Aucun portail configuré</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 11 }}>Map hôte (non-donjon)</label>
                <select value={portailForm.fromMapId} onChange={e => setPortailForm(f => ({ ...f, fromMapId: Number(e.target.value) }))} style={{ width: '100%' }}>
                  <option value={0}>-- Choisir --</option>
                  {nonDungeonMaps.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11 }}>Position X</label>
                  <input type="number" min={0} value={portailForm.positionX} style={{ width: '100%' }}
                    onChange={e => setPortailForm(f => ({ ...f, positionX: Number(e.target.value) }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11 }}>Position Y</label>
                  <input type="number" min={0} value={portailForm.positionY} style={{ width: '100%' }}
                    onChange={e => setPortailForm(f => ({ ...f, positionY: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Nom du portail</label>
                <input type="text" value={portailForm.nom} style={{ width: '100%' }}
                  onChange={e => setPortailForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSavePortail} disabled={portailLoading || !portailForm.fromMapId} style={{ flex: 1 }}>
                  {selectedDonjon.portails?.[0] ? 'Mettre à jour' : 'Créer portail'}
                </button>
                {selectedDonjon.portails?.[0] && (
                  <button className="btn btn-danger btn-sm" onClick={handleDeletePortail} disabled={portailLoading}>
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            {/* ── Compositions section ── */}
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Composition des salles</h4>
            <div className="meta" style={{ fontSize: 11, marginBottom: 8 }}>
              Définit les monstres fixes par salle × difficulté. Laissez vide pour utiliser le spawn aléatoire de la région.
            </div>
            {(selectedDonjon.salles || []).map(salle => (
              <CompEditor
                key={salle.id}
                donjon={selectedDonjon}
                salle={salle}
                monstres={monstres}
                onRefresh={handleRefreshCompositions}
              />
            ))}
          </div>
        )}
      </div>

      <FormModal
        open={showForm}
        title={editing ? 'Modifier un donjon' : 'Créer un donjon'}
        fields={fields}
        initialValues={initialValues}
        onSubmit={async (vals) => {
          const { salle1MapId, salle2MapId, salle3MapId, salle4MapId, ...donjonData } = vals as Record<string, unknown>;
          const salles = [
            { ordre: 1, mapId: Number(salle1MapId) },
            { ordre: 2, mapId: Number(salle2MapId) },
            { ordre: 3, mapId: Number(salle3MapId) },
            { ordre: 4, mapId: Number(salle4MapId) },
          ];
          if (editing) {
            await update(editing.id, { ...donjonData, salles } as any);
          } else {
            await create({ ...donjonData, salles } as Partial<Donjon> & { salles: { ordre: number; mapId: number }[] });
          }
          setShowForm(false);
        }}
        onCancel={() => setShowForm(false)}
      />
      <ConfirmDialog
        open={!!deleting}
        message={`Supprimer "${deleting?.nom}" ?`}
        onConfirm={async () => { if (deleting) await remove(deleting.id); setDeleting(null); }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
};

export default DonjonsPage;
