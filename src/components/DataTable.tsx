import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: number }> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
  selectedId?: number;
  loading?: boolean;
  extraActions?: (item: T) => React.ReactNode;
}

function DataTable<T extends { id: number }>({ columns, data, onEdit, onDelete, onRowClick, selectedId, loading, extraActions }: DataTableProps<T>) {
  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key}>{col.header}</th>
          ))}
          {(onEdit || onDelete || extraActions) && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length + 1} className="empty">Aucun element</td></tr>
        ) : (
          data.map(item => (
            <tr
              key={item.id}
              className={`${onRowClick ? 'clickable' : ''} ${selectedId === item.id ? 'row-selected' : ''}`}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map(col => (
                <td key={col.key}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {(onEdit || onDelete || extraActions) && (
                <td className="actions">
                  {extraActions && <span onClick={e => e.stopPropagation()}>{extraActions(item)}</span>}
                  {onEdit && <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>Modifier</button>}
                  {onDelete && <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(item); }}>Supprimer</button>}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default DataTable;
