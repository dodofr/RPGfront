import React, { useState, useEffect } from 'react';

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'float' | 'select' | 'checkbox';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
  showIf?: (values: Record<string, unknown>) => boolean;
}

interface FormModalProps {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}

const FormModal: React.FC<FormModalProps> = ({ open, title, fields, initialValues, onSubmit, onCancel }) => {
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open) {
      const defaults: Record<string, unknown> = {};
      fields.forEach(f => {
        if (initialValues && initialValues[f.name] !== undefined) {
          defaults[f.name] = initialValues[f.name];
        } else if (f.defaultValue !== undefined) {
          defaults[f.name] = f.defaultValue;
        } else if (f.type === 'checkbox') {
          defaults[f.name] = false;
        } else if (f.type === 'number' || f.type === 'float') {
          defaults[f.name] = f.min ?? 0;
        } else {
          defaults[f.name] = '';
        }
      });
      setValues(defaults);
    }
  }, [open, fields, initialValues]);

  if (!open) return null;

  const handleChange = (name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result: Record<string, unknown> = {};
    fields.forEach(f => {
      if (f.showIf && !f.showIf(values)) return;
      const v = values[f.name];
      if (f.type === 'number') {
        result[f.name] = v === '' || v === null ? null : Number(v);
      } else if (f.type === 'float') {
        result[f.name] = v === '' || v === null ? null : parseFloat(String(v));
      } else if (f.type === 'select' && typeof v === 'string' && !isNaN(Number(v)) && f.options?.some(o => typeof o.value === 'number')) {
        result[f.name] = v === '' ? null : Number(v);
      } else {
        result[f.name] = v;
      }
    });
    onSubmit(result);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-form" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          {fields.map(f => {
            if (f.showIf && !f.showIf(values)) return null;
            return (
              <div key={f.name} className="form-field">
                <label>{f.label}</label>
                {f.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!values[f.name]}
                    onChange={e => handleChange(f.name, e.target.checked)}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={String(values[f.name] ?? '')}
                    onChange={e => handleChange(f.name, e.target.value)}
                    required={f.required}
                  >
                    <option value="">-- Choisir --</option>
                    {f.options?.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'float' ? 'number' : f.type}
                    value={String(values[f.name] ?? '')}
                    onChange={e => handleChange(f.name, e.target.value)}
                    required={f.required}
                    min={f.min}
                    max={f.max}
                    step={f.type === 'float' ? (f.step ?? 0.01) : f.step}
                  />
                )}
              </div>
            );
          })}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Annuler</button>
            <button type="submit" className="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormModal;
