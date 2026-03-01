import React, { useState, useRef } from 'react';
import { importApi, type ImportCounters } from '../../api/import';

interface ImportError {
  error: string;
  details?: unknown;
}

const COUNTER_LABELS: Record<keyof ImportCounters, string> = {
  ressources:        'Ressources',
  effets:            'Effets',
  zones:             'Zones',
  races:             'Races',
  sorts:             'Sorts',
  sortEffets:        'Liaisons sort→effet',
  monstres:          'Monstres',
  monstreSorts:      'Liaisons monstre→sort',
  monstreDrops:      'Drops monstres',
  equipements:       'Équipements',
  lignesDegats:      'Lignes de dégâts',
  recettes:          'Recettes',
  recetteIngredients:'Ingrédients recettes',
};

const isValidJson = (s: string): boolean => {
  try { JSON.parse(s); return true; } catch { return false; }
};

const ImportPage: React.FC = () => {
  const [json, setJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportCounters | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setResult(null); setError(null); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJson(ev.target?.result as string);
      reset();
    };
    reader.readAsText(file, 'utf-8');
    // Reset input so the same file can be reloaded
    e.target.value = '';
  };

  const handleImport = async () => {
    setLoading(true);
    reset();
    try {
      const pack = JSON.parse(json);
      const res = await importApi.importPack(pack);
      setResult(res.imported);
    } catch (err: any) {
      if (err?.response?.data) {
        setError(err.response.data);
      } else if (err instanceof SyntaxError) {
        setError({ error: `JSON invalide : ${err.message}` });
      } else {
        setError({ error: err?.message ?? 'Erreur inconnue' });
      }
    } finally {
      setLoading(false);
    }
  };

  const jsonOk = json.length > 0 && isValidJson(json);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Import en masse</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>POST /api/import</span>
      </div>

      <div className="import-layout">
        {/* ── Panneau éditeur ── */}
        <div className="import-editor-panel">
          <div className="import-toolbar">
            <button className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
              Charger un fichier .json
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setJson(''); reset(); }}
              disabled={!json}
            >
              Vider
            </button>
            <span className="import-char-count">
              {json.length > 0 ? `${json.length} caractères` : ''}
            </span>
          </div>

          <textarea
            className="import-textarea"
            value={json}
            onChange={(e) => { setJson(e.target.value); reset(); }}
            placeholder={'Collez votre JSON ici ou chargez un fichier...\n\nExemple minimal :\n{\n  "ressources": [{ "nom": "Pierre", "poids": 1 }]\n}'}
            spellCheck={false}
          />

          <div className="import-footer">
            {json.length > 0 && (
              <span className={`import-json-badge ${jsonOk ? 'valid' : 'invalid'}`}>
                {jsonOk ? '✓ JSON valide' : '✗ JSON invalide'}
              </span>
            )}
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || !jsonOk}
            >
              {loading ? 'Import en cours…' : 'Importer'}
            </button>
          </div>
        </div>

        {/* ── Panneau résultat ── */}
        <div className="import-result-panel">
          {/* Succès */}
          {result && (
            <div className="import-success">
              <div className="import-result-title success">✓ Import réussi</div>
              <table className="import-counters-table">
                <tbody>
                  {(Object.entries(result) as [keyof ImportCounters, number][]).map(([key, count]) => (
                    <tr key={key} className={count > 0 ? 'row-nonzero' : 'row-zero'}>
                      <td className="counter-label">{COUNTER_LABELS[key]}</td>
                      <td className="counter-value">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="import-error">
              <div className="import-result-title error">✗ Erreur</div>
              <p className="import-error-msg">{error.error}</p>
              {error.details && (
                <pre className="import-error-details">
                  {typeof error.details === 'string'
                    ? error.details
                    : JSON.stringify(error.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Aide initiale */}
          {!result && !error && (
            <div className="import-hint">
              <p className="import-hint-title">Format du pack JSON</p>
              <p>Toutes les sections sont <strong>optionnelles</strong>. L'import est :</p>
              <ul>
                <li><strong>Atomique</strong> — rollback complet si une erreur survient</li>
                <li><strong>Idempotent</strong> — réimporter le même pack ne crée pas de doublons</li>
                <li><strong>Par nom</strong> — aucun ID à connaître, tout se résout par nom</li>
              </ul>
              <p className="import-hint-title">Sections disponibles</p>
              <table className="import-sections-table">
                <tbody>
                  <tr><td>ressources</td><td>Ressources et matériaux</td></tr>
                  <tr><td>effets</td><td>Buffs, debuffs, poisons…</td></tr>
                  <tr><td>zones</td><td>Types de zone d'effet (CASE, CROIX…)</td></tr>
                  <tr><td>races</td><td>Races jouables</td></tr>
                  <tr><td>sorts</td><td>Sorts avec zone et effets liés</td></tr>
                  <tr><td>monstres</td><td>Templates avec sorts et drops</td></tr>
                  <tr><td>equipements</td><td>Items avec lignes de dégâts</td></tr>
                  <tr><td>recettes</td><td>Recettes de craft</td></tr>
                </tbody>
              </table>
              <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                Consultez <code>importdocumentation.txt</code> dans le dossier backend pour le format complet et des exemples.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
