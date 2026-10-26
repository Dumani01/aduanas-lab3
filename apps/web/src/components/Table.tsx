import type { ReactNode } from 'react';
import type { Row } from '../lib/api';
export type Column = { key: string; label: string; render?: (row: Row) => ReactNode };
export function Table({ rows, columns, caption }: { rows: Row[]; columns: Column[]; caption: string }) {
  if (!rows.length) return <div className="empty"><span aria-hidden="true">◇</span><h3>Sin resultados</h3><p>No hay registros para los filtros seleccionados.</p></div>;
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}><table><caption className="sr-only">{caption}</caption><thead><tr>{columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={String(row.id ?? i)}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}
export function Badge({ value }: { value: unknown }) { return <span className={`badge ${value === 'RETENIDO' || value === 'RETENER' ? 'warning' : 'success'}`}>{String(value)}</span>; }
