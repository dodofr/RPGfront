import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import { racesApi } from '../../api/static';
import { uploadApi } from '../../api/maps';
import type { Race } from '../../types';
import { SPRITE_CONFIG, type SpritesheetConfig } from '../../utils/spriteConfig';
import SpriteAnimEditor from '../../components/SpriteAnimEditor';
import '../../styles/admin.css';

type RaceTab = 'stats' | 'sprite' | 'animations' | 'sorts';

// ── Preview sprite ────────────────────────────────────────────
const SpritePreview: React.FC<{
  imageUrl: string | null | undefined;
  scale: number;
  offsetX: number;
  offsetY: number;
  cellSize?: number;
}> = ({ imageUrl, scale, offsetX, offsetY, cellSize = 120 }) => {
  const config = imageUrl ? SPRITE_CONFIG[imageUrl] : undefined;
  const displayHeight = 1.4 * scale * cellSize;

  return (
    <div style={{
      width: cellSize, height: cellSize,
      background: '#1a237e',
      border: '2px solid #4a5568',
      position: 'relative',
      overflow: 'visible',
      flexShrink: 0,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
    }}>
      {imageUrl && config && (() => {
        const anim = config.animations['idle'];
        const col = anim.startFrame ?? 0;
        const row = anim.row;
        const spriteScale = displayHeight / config.frameH;
        const displayWidth = config.frameW * spriteScale;
        const bgW = config.cols * config.frameW * spriteScale;
        const bgH = config.rows * config.frameH * spriteScale;
        return (
          <div style={{
            position: 'absolute',
            bottom: `${offsetY}%`,
            left: `calc(50% + ${offsetX}%)`,
            transform: 'translateX(-50%)',
            width: displayWidth,
            height: displayHeight,
            backgroundImage: `url(${config.sheet})`,
            backgroundSize: `${bgW}px ${bgH}px`,
            backgroundPosition: `${-col * config.frameW * spriteScale}px ${-row * config.frameH * spriteScale}px`,
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
          }} />
        );
      })()}
      {imageUrl && !config && (
        <img src={imageUrl} alt="" style={{
          position: 'absolute',
          bottom: `${offsetY}%`,
          left: `calc(50% + ${offsetX}%)`,
          transform: 'translateX(-50%)',
          height: `${140 * scale}%`,
          width: 'auto',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }} />
      )}
      {!imageUrl && (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
          Aucune image
        </span>
      )}
    </div>
  );
};

// ── Editeur sprite pour un sexe ───────────────────────────────
const SexEditor: React.FC<{
  label: string;
  imageUrl: string | null | undefined;
  scale: number;
  offsetX: number;
  offsetY: number;
  uploading: boolean;
  onUpload: (file: File) => void;
  onScale: (delta: number) => void;
  onOffset: (dx: number, dy: number) => void;
  onReset: () => void;
}> = ({ label, imageUrl, scale, offsetX, offsetY, uploading, onUpload, onScale, onOffset, onReset }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, flex: 1, minWidth: 240 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '...' : '📁 Image'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onReset} title="Réinitialiser">↺</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <SpritePreview imageUrl={imageUrl} scale={scale} offsetX={offsetX} offsetY={offsetY} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Taille : {scale.toFixed(2)}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-sm" onClick={() => onScale(-0.05)} style={{ minWidth: 32 }}>−</button>
              <button className="btn btn-sm" onClick={() => onScale(+0.05)} style={{ minWidth: 32 }}>+</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              Position : X {offsetX > 0 ? '+' : ''}{offsetX.toFixed(0)}% / Y {offsetY > 0 ? '+' : ''}{offsetY.toFixed(0)}%
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 32px 32px', gridTemplateRows: '32px 32px 32px', gap: 2 }}>
              <div />
              <button className="btn btn-sm" onClick={() => onOffset(0, +2)} style={{ padding: 0 }}>↑</button>
              <div />
              <button className="btn btn-sm" onClick={() => onOffset(-2, 0)} style={{ padding: 0 }}>←</button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: '50%' }} />
              </div>
              <button className="btn btn-sm" onClick={() => onOffset(+2, 0)} style={{ padding: 0 }}>→</button>
              <div />
              <button className="btn btn-sm" onClick={() => onOffset(0, -2)} style={{ padding: 0 }}>↓</button>
              <div />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
const RaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSprite, setSavingSprite] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<RaceTab>(() =>
    (localStorage.getItem('admin-race-tab') as RaceTab) ?? 'stats'
  );

  const [nom, setNom] = useState('');
  const [stats, setStats] = useState({
    bonusForce: 0, bonusIntelligence: 0, bonusDexterite: 0,
    bonusAgilite: 0, bonusVie: 0, bonusChance: 0,
  });

  const [scale, setScale] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scaleF, setScaleF] = useState(1.0);
  const [offsetXF, setOffsetXF] = useState(0);
  const [offsetYF, setOffsetYF] = useState(0);
  const [imageHomme, setImageHomme] = useState<string | null>(null);
  const [imageFemme, setImageFemme] = useState<string | null>(null);
  const [uploadingH, setUploadingH] = useState(false);
  const [uploadingF, setUploadingF] = useState(false);
  const [spriteConfigHomme, setSpriteConfigHomme] = useState<SpritesheetConfig | null>(null);
  const [spriteConfigFemme, setSpriteConfigFemme] = useState<SpritesheetConfig | null>(null);

  const switchTab = (tab: RaceTab) => {
    setActiveTab(tab);
    localStorage.setItem('admin-race-tab', tab);
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await racesApi.getById(Number(id));
      setRace(data);
      setNom(data.nom);
      setStats({
        bonusForce: data.bonusForce, bonusIntelligence: data.bonusIntelligence,
        bonusDexterite: data.bonusDexterite, bonusAgilite: data.bonusAgilite,
        bonusVie: data.bonusVie, bonusChance: data.bonusChance,
      });
      setScale(data.spriteScale ?? 1.0);
      setOffsetX(data.spriteOffsetX ?? 0);
      setOffsetY(data.spriteOffsetY ?? 0);
      setScaleF(data.spriteScaleFemme ?? 1.0);
      setOffsetXF(data.spriteOffsetXFemme ?? 0);
      setOffsetYF(data.spriteOffsetYFemme ?? 0);
      setImageHomme(data.imageUrlHomme ?? null);
      setImageFemme(data.imageUrlFemme ?? null);
      setSpriteConfigHomme((data.spriteConfigHomme as SpritesheetConfig | null) ?? null);
      setSpriteConfigFemme((data.spriteConfigFemme as SpritesheetConfig | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveStats = async () => {
    if (!race) return;
    setSaving(true);
    await racesApi.update(race.id, { nom, ...stats });
    await load();
    setSaving(false);
  };

  const handleSaveSprite = async () => {
    if (!race) return;
    setSavingSprite(true);
    await racesApi.update(race.id, {
      spriteScale: scale, spriteOffsetX: offsetX, spriteOffsetY: offsetY,
      spriteScaleFemme: scaleF, spriteOffsetXFemme: offsetXF, spriteOffsetYFemme: offsetYF,
    });
    setRace(prev => prev ? { ...prev, spriteScale: scale, spriteOffsetX: offsetX, spriteOffsetY: offsetY,
      spriteScaleFemme: scaleF, spriteOffsetXFemme: offsetXF, spriteOffsetYFemme: offsetYF } : prev);
    setSavingSprite(false);
  };

  const handleUpload = async (sexe: 'homme' | 'femme', file: File) => {
    if (!race) return;
    if (sexe === 'homme') setUploadingH(true); else setUploadingF(true);
    try {
      const res = await uploadApi.entityImage(file, 'races');
      const url = res.url ?? '';
      if (sexe === 'homme') {
        setImageHomme(url);
        await racesApi.update(race.id, { imageUrlHomme: url });
        setRace(prev => prev ? { ...prev, imageUrlHomme: url } : prev);
      } else {
        setImageFemme(url);
        await racesApi.update(race.id, { imageUrlFemme: url });
        setRace(prev => prev ? { ...prev, imageUrlFemme: url } : prev);
      }
    } finally {
      if (sexe === 'homme') setUploadingH(false); else setUploadingF(false);
    }
  };

  const handleDelete = async () => {
    if (!race) return;
    await racesApi.remove(race.id);
    navigate('/admin/monde');
  };

  if (loading) return <div className="admin-page"><p>Chargement...</p></div>;
  if (!race) return <div className="admin-page"><p>Race introuvable.</p></div>;

  const STAT_LABELS: [string, keyof typeof stats][] = [
    ['Force', 'bonusForce'], ['Intelligence', 'bonusIntelligence'],
    ['Dextérité', 'bonusDexterite'], ['Agilité', 'bonusAgilite'],
    ['Vie', 'bonusVie'], ['Chance', 'bonusChance'],
  ];

  return (
    <div className="admin-page">
      <div className="detail-page-header">
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/monde')}>
          ← Retour
        </button>
        <div className="detail-page-title">
          <input className="detail-page-name-input" value={nom} onChange={e => setNom(e.target.value)} />
          <span className="badge badge-muted">ID {race.id}</span>
        </div>
        <button className="btn btn-sm btn-danger" onClick={() => setDeleting(true)}>
          Supprimer
        </button>
      </div>

      {/* Onglets */}
      <div className="tabs" style={{ padding: '0 16px' }}>
        <button className={`tab-btn${activeTab === 'stats' ? ' active' : ''}`} onClick={() => switchTab('stats')}>
          Stats
        </button>
        <button className={`tab-btn${activeTab === 'sprite' ? ' active' : ''}`} onClick={() => switchTab('sprite')}>
          Sprite
        </button>
        <button className={`tab-btn${activeTab === 'animations' ? ' active' : ''}`} onClick={() => switchTab('animations')}>
          Animations
        </button>
        <button className={`tab-btn${activeTab === 'sorts' ? ' active' : ''}`} onClick={() => switchTab('sorts')}>
          Sorts ({race.sorts?.length || 0})
        </button>
      </div>

      <div className="detail-page-body">

        {/* ── Onglet Stats ── */}
        {activeTab === 'stats' && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Stats de base</h3>
              <button className="btn btn-sm btn-primary" onClick={handleSaveStats} disabled={saving}>
                {saving ? '...' : 'Sauvegarder'}
              </button>
            </div>
            <div className="detail-page-fields">
              {STAT_LABELS.map(([label, key]) => (
                <div key={key} className="detail-page-field">
                  <label>Bonus {label}</label>
                  <input type="number" value={stats[key]}
                    onChange={e => setStats(p => ({ ...p, [key]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Onglet Sprite ── */}
        {activeTab === 'sprite' && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Ajustements sprite</h3>
              <button className="btn btn-sm btn-primary" onClick={handleSaveSprite} disabled={savingSprite}>
                {savingSprite ? '...' : 'Sauvegarder'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SexEditor
                label="Homme"
                imageUrl={imageHomme}
                scale={scale} offsetX={offsetX} offsetY={offsetY}
                uploading={uploadingH}
                onUpload={f => handleUpload('homme', f)}
                onScale={d => setScale(s => Math.max(0.1, Math.round((s + d) * 100) / 100))}
                onOffset={(dx, dy) => { setOffsetX(x => Math.round((x + dx) * 10) / 10); setOffsetY(y => Math.round((y + dy) * 10) / 10); }}
                onReset={() => { setScale(1); setOffsetX(0); setOffsetY(0); }}
              />
              <SexEditor
                label="Femme"
                imageUrl={imageFemme}
                scale={scaleF} offsetX={offsetXF} offsetY={offsetYF}
                uploading={uploadingF}
                onUpload={f => handleUpload('femme', f)}
                onScale={d => setScaleF(s => Math.max(0.1, Math.round((s + d) * 100) / 100))}
                onOffset={(dx, dy) => { setOffsetXF(x => Math.round((x + dx) * 10) / 10); setOffsetYF(y => Math.round((y + dy) * 10) / 10); }}
                onReset={() => { setScaleF(1); setOffsetXF(0); setOffsetYF(0); }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              Ajustements indépendants par sexe. Upload de l'image statique ici.
            </div>
          </div>
        )}

        {/* ── Onglet Animations ── */}
        {activeTab === 'animations' && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Animations Spritesheet</h3>
            </div>
            <SpriteAnimEditor
              label="Spritesheet Homme"
              sheetUrl={imageHomme}
              config={spriteConfigHomme}
              onChange={cfg => setSpriteConfigHomme(cfg)}
              onSave={async cfg => {
                if (!race) return;
                await racesApi.update(race.id, { spriteConfigHomme: cfg });
                setSpriteConfigHomme(cfg);
              }}
              uploadType="races"
            />
            <SpriteAnimEditor
              label="Spritesheet Femme"
              sheetUrl={imageFemme}
              config={spriteConfigFemme}
              onChange={cfg => setSpriteConfigFemme(cfg)}
              onSave={async cfg => {
                if (!race) return;
                await racesApi.update(race.id, { spriteConfigFemme: cfg });
                setSpriteConfigFemme(cfg);
              }}
              uploadType="races"
            />
          </div>
        )}

        {/* ── Onglet Sorts ── */}
        {activeTab === 'sorts' && (
          <div className="detail-page-section">
            <div className="detail-page-section-header">
              <h3>Sorts ({race.sorts?.length || 0})</h3>
            </div>
            <div className="sort-list">
              {race.sorts && race.sorts.length > 0 ? (
                [...race.sorts]
                  .sort((a, b) => (a.niveauApprentissage ?? 1) - (b.niveauApprentissage ?? 1))
                  .map(s => (
                    <div key={s.id} className="sort-item">
                      <div>
                        <span className="sort-name">{s.nom}</span>
                        <span className="sort-meta">
                          <span>Niv. {s.niveauApprentissage ?? 1}</span>
                          <span>{s.coutPA} PA</span>
                          <span>{s.porteeMin}-{s.porteeMax} PO</span>
                          <span>{s.degatsMin}-{s.degatsMax} dmg</span>
                          {s.estSoin && <span style={{ color: 'var(--success)' }}>Soin</span>}
                          {s.estInvocation && <span style={{ color: 'var(--warning)' }}>Invocation</span>}
                        </span>
                      </div>
                      <span className="badge badge-muted">ID {s.id}</span>
                    </div>
                  ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun sort</div>
              )}
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        open={deleting}
        message={`Supprimer la race "${race.nom}" définitivement ? Attention : cela supprimera aussi tous les sorts associés.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
};

export default RaceDetailPage;
