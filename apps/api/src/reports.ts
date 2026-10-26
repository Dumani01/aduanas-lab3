import { z } from 'zod';
import { reader } from './db.js';
import { readFileSync } from 'node:fs';
const queries = JSON.parse(readFileSync('database/queries/reports.json', 'utf8')) as Record<string, string>;
export async function reports(name: string, query: Record<string, unknown>) {
  let values: unknown[] = [];
  switch (name) {
    case 'importaciones': {
      const year = z.coerce.number().int().min(2000).max(2100).parse(query.anio);
      values = [`${year}-10-01`, `${year}-11-01`]; break;
    }
    case 'retenidos': case 'pais-contenedores': case 'importador-valor': case 'inspecciones': case 'china-bodega2': break;
    case 'stock-producto': values = [z.coerce.number().int().positive().parse(query.producto_id)]; break;
    case 'movimientos': {
      const from = z.iso.datetime({ offset: true }).parse(query.desde);
      const to = z.iso.datetime({ offset: true }).parse(query.hasta);
      if (new Date(from) >= new Date(to)) throw new z.ZodError([{ code: 'custom', path: ['hasta'], message: 'Debe ser posterior a desde' }]);
      values = [z.coerce.number().int().positive().parse(query.lote_id), from, to]; break;
    }
    default: throw new z.ZodError([{ code: 'custom', path: ['name'], message: 'Reporte no disponible' }]);
  }
  // Consultas fijas: no SQL libre ni nombres de columnas enviados por el usuario.
  const sql = queries[name];
  const result = await reader.query(`SELECT * FROM (${sql}) consulta LIMIT 101`, values);
  return { rows: result.rows.slice(0, 100), limitado: result.rows.length > 100, limite: 100 };
}
