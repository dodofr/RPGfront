import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { SpritesheetConfig, SpriteAnimState } from '../utils/spriteConfig';
import SpriteAnimator from './SpriteAnimator';
import { uploadApi } from '../api/maps';

const ALL_ANIM_STATES: SpriteAnimState[] = [
  'idle', 'walk-right', 'walk-left', 'walk-down', 'walk-up', 'attack', 'hit', 'death',
];

const DEFAULT_ANIM_DEF = { row: 0, frames: 1, fps: 8, freeze: false };

interface SpriteAnimEditorProps {
  label: string;
  sheetUrl: string | null | undefined;   // imageUrl de base (pour l'upload)
  config: SpritesheetConfig | null | undefined;
  onChange: (config: SpritesheetConfig) => void;
  onSave: (config: SpritesheetConfig) => Promise<void>;
  uploadType?: 'races' | 'monsters';
}

const SpriteAnimEditor: React.FC<SpriteAnimEditorProps> = ({
  label, sheetUrl, config, onChange, onSave, uploadType = 'races',
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAnim, setSelectedAnim] = useState<SpriteAnimState>('idle');

  // Local working config
  const [local, setLocal] = useState<SpritesheetConfig>(() => config ?? {
    sheet: '',
    frameW: 256,
    frameH: 384,
    cols: 4,
    rows: 7,
    animations: Object.fromEntries(ALL_ANIM_STATES.map(a => [a, { ...DEFAULT_ANIM_DEF }])) as SpritesheetConfig['animations'],
  });

  // Sync from parent when config changes (e.g. after load)
  useEffect(() => {
    if (config) setLocal(config);
  }, [config]);

  const updateLocal = useCallback((patch: Partial<SpritesheetConfig>) => {
    setLocal(prev => {
      const next = { ...prev, ...patch };
      onChange(next);
      return next;
    });
  }, [onChange]);

  const updateAnim = useCallback((animKey: SpriteAnimState, patch: Partial<SpritesheetConfig['animations'][string]>) => {
    setLocal(prev => {
      const next = {
        ...prev,
        animations: {
          ...prev.animations,
          [animKey]: { ...(prev.animations[animKey] ?? DEFAULT_ANIM_DEF), ...patch },
        },
      };
      onChange(next);
      return next;
    });
  }, [onChange]);

  const handleUploadSheet = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadApi.entityImage(file, uploadType);
      updateLocal({ sheet: res.url ?? '' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(local);
    } finally {
      setSaving(false);
    }
  };

  const currentAnim = local.animations[selectedAnim] ?? DEFAULT_ANIM_DEF;

  // Compute cell size for grid display
  const MAX_SHEET_DISPLAY = 480;
  const displayCols = local.cols || 1;
  const displayRows = local.rows || 1;
  const cellW = Math.floor(MAX_SHEET_DISPLAY / displayCols);
  const cellH = Math.floor((local.frameH / local.frameW) * cellW);
  const sheetDisplayW = cellW * displayCols;
  const sheetDisplayH = cellH * displayRows;

  // Cell click: set row (and optionally startFrame) for selected anim
  const handleCellClick = (row: number, col: number) => {
    const anim = local.animations[selectedAnim] ?? DEFAULT_ANIM_DEF;
    if (anim.row === row) {
      // Extend frames
      const start = anim.startFrame ?? 0;
      const currentEnd = start + anim.frames - 1;
      if (col > currentEnd) {
        updateAnim(selectedAnim, { frames: col - start + 1 });
      } else if (col < start) {
        updateAnim(selectedAnim, { startFrame: col, frames: currentEnd - col + 1 });
      }
    } else {
      // New row: reset to single frame
      updateAnim(selectedAnim, { row, startFrame: col, frames: 1 });
    }
  };

  // Highlight cells for the current animation
  const isHighlighted = (row: number, col: number) => {
    const anim = local.animations[selectedAnim] ?? DEFAULT_ANIM_DEF;
    const start = anim.startFrame ?? 0;
    return anim.row === row && col >= start && col < start + anim.frames;
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong style={{ fontSize: 14 }}>{label}</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '...' : '📁 Spritesheet'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving || !local.sheet}>
            {saving ? '...' : 'Sauvegarder config'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadSheet(f); e.target.value = ''; }} />
      </div>

      {/* Global sheet parameters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Frame W</span>
          <input type="number" value={local.frameW} min={1}
            onChange={e => updateLocal({ frameW: Number(e.target.value) })}
            style={{ width: 60, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Frame H</span>
          <input type="number" value={local.frameH} min={1}
            onChange={e => updateLocal({ frameH: Number(e.target.value) })}
            style={{ width: 60, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Cols</span>
          <input type="number" value={local.cols} min={1}
            onChange={e => updateLocal({ cols: Number(e.target.value) })}
            style={{ width: 50, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Rows</span>
          <input type="number" value={local.rows} min={1}
            onChange={e => updateLocal({ rows: Number(e.target.value) })}
            style={{ width: 50, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
      </div>

      {/* Animation selector + per-anim params */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, fontSize: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Animation</span>
          <select value={selectedAnim} onChange={e => setSelectedAnim(e.target.value as SpriteAnimState)}
            style={{ padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }}>
            {ALL_ANIM_STATES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Row</span>
          <input type="number" value={currentAnim.row ?? 0} min={0} max={local.rows - 1}
            onChange={e => updateAnim(selectedAnim, { row: Number(e.target.value) })}
            style={{ width: 50, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Start</span>
          <input type="number" value={currentAnim.startFrame ?? 0} min={0} max={local.cols - 1}
            onChange={e => updateAnim(selectedAnim, { startFrame: Number(e.target.value) })}
            style={{ width: 50, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Frames</span>
          <input type="number" value={currentAnim.frames ?? 1} min={1} max={local.cols}
            onChange={e => updateAnim(selectedAnim, { frames: Number(e.target.value) })}
            style={{ width: 50, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>fps</span>
          <input type="number" value={currentAnim.fps ?? 8} min={1} max={30}
            onChange={e => updateAnim(selectedAnim, { fps: Number(e.target.value) })}
            style={{ width: 50, padding: '2px 4px', background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={currentAnim.freeze ?? false}
            onChange={e => updateAnim(selectedAnim, { freeze: e.target.checked })} />
          <span style={{ color: 'var(--text-muted)' }}>freeze</span>
        </label>
      </div>

      {/* Main area: grid + preview */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Spritesheet with clickable grid overlay */}
        {local.sheet ? (
          <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
            <img
              src={local.sheet}
              alt="spritesheet"
              style={{ width: sheetDisplayW, height: sheetDisplayH, display: 'block', imageRendering: 'pixelated' }}
            />
            {/* Grid overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${displayCols}, ${cellW}px)`,
              gridTemplateRows: `repeat(${displayRows}, ${cellH}px)`,
            }}>
              {Array.from({ length: displayRows }, (_, row) =>
                Array.from({ length: displayCols }, (_, col) => (
                  <div
                    key={`${row}-${col}`}
                    onClick={() => handleCellClick(row, col)}
                    style={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: isHighlighted(row, col)
                        ? 'rgba(59,130,246,0.45)'
                        : 'transparent',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                    title={`row ${row}, col ${col}`}
                  />
                ))
              )}
            </div>
            {/* Row labels */}
            <div style={{ position: 'absolute', left: -28, top: 0, display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: displayRows }, (_, row) => (
                <div key={row} style={{ height: cellH, display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                  {row}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            width: 200, height: 150, border: '2px dashed var(--border)', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 12, flexShrink: 0,
          }}>
            Uploader un spritesheet
          </div>
        )}

        {/* Preview live */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Preview : {selectedAnim}</div>
          <div style={{
            width: 100, height: 100,
            background: '#1a237e',
            border: '2px solid var(--border)',
            borderRadius: 4,
            position: 'relative',
            overflow: 'visible',
          }}>
            <SpriteAnimator
              imageUrl={local.sheet || null}
              animState={selectedAnim}
              displayHeight={100}
              configOverride={local.sheet ? local : undefined}
              style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
            row:{currentAnim.row ?? 0} start:{currentAnim.startFrame ?? 0}<br />
            frames:{currentAnim.frames ?? 1} fps:{currentAnim.fps ?? 8}
          </div>
        </div>
      </div>

      {/* Current sheet URL display */}
      {local.sheet && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
          Sheet: {local.sheet}
        </div>
      )}
    </div>
  );
};

export default SpriteAnimEditor;
