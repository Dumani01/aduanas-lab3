import { z } from 'zod';
const name = z.string().trim().min(2).max(160);
const code = z.string().trim().min(2).max(30);
const id = z.coerce.number().int().positive();
export const catalogs = {
  paises: { fields: ['codigo', 'nombre'], schema: z.object({ codigo: z.string().regex(/^[A-Z]{2}$/), nombre: name }) },
  operadores: { fields: ['identificacion', 'nombre', 'activo'], schema: z.object({ identificacion: code, nombre: name, activo: z.boolean().default(true) }) },
  agentes: { fields: ['licencia', 'nombre', 'activo'], schema: z.object({ licencia: code, nombre: name, activo: z.boolean().default(true) }) },
  partidas: { fields: ['codigo', 'nombre', 'tarifa'], schema: z.object({ codigo: code, nombre: name, tarifa: z.coerce.number().min(0).max(100) }) },
  productos: { fields: ['sku', 'nombre', 'partida_id', 'unidad', 'activo'], schema: z.object({ sku: code, nombre: name, partida_id: id, unidad: z.enum(['unidad', 'kg', 'litro']), activo: z.boolean().default(true) }) },
  bodegas: { fields: ['codigo', 'nombre', 'capacidad_kg', 'activo'], schema: z.object({ codigo: code, nombre: name, capacidad_kg: z.coerce.number().positive().max(1e12), activo: z.boolean().default(true) }) },
  funcionarios: { fields: ['codigo', 'nombre', 'activo'], schema: z.object({ codigo: code, nombre: name, activo: z.boolean().default(true) }) },
} as const;
export type CatalogName = keyof typeof catalogs;
