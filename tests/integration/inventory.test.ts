import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import supertest from 'supertest';
import { hashPassword } from '../../apps/api/src/password.js';

const testUrl = new URL(process.env.TEST_DATABASE_ADMIN_URL || '');
if (testUrl.pathname !== '/aduana_test' || !['127.0.0.1', 'localhost'].includes(testUrl.hostname)) throw new Error('Destino de pruebas no autorizado');
const admin = new pg.Pool({ connectionString: testUrl.toString() });
let appPool: pg.Pool, readPool: pg.Pool;
let request: ReturnType<typeof supertest.agent>;
let csrf: string;
let app: ReturnType<(typeof import('../../apps/api/src/app.js'))['createApp']>;
const origin = 'http://127.0.0.1:5173';

before(async () => {
  await admin.query('SELECT 1');
  const db = await admin.query('SELECT current_database() AS name');
  assert.equal(db.rows[0].name, 'aduana_test');
  // Solo se reinician esquemas de la base aduana_test, comprobada arriba.
  await admin.query('DROP SCHEMA IF EXISTS reporting CASCADE; DROP SCHEMA IF EXISTS aduana CASCADE');
  await admin.query(await readFile('database/migrations/001_schema.sql', 'utf8'));
  await admin.query(await readFile('database/migrations/002_catalog_guards.sql', 'utf8'));
  await admin.query(await readFile('database/migrations/003_movement_null_guard.sql', 'utf8'));
  await admin.query(await readFile('database/roles/grants.sql', 'utf8'));
  await admin.query(await readFile('database/seeds/demo.sql', 'utf8'));
  await admin.query(await readFile('database/seeds/nombres.sql', 'utf8'));
  for (const [name, role] of [['test-admin', 'administrador'], ['test-read', 'consulta']]) await admin.query('INSERT INTO aduana.usuarios(nombre,password_hash,rol) VALUES($1,$2,$3)', [name, hashPassword('test-isolated-password'), role]);
  const appUrl = new URL(process.env.DATABASE_URL!); appUrl.pathname = '/aduana_test';
  const readerUrl = new URL(process.env.DATABASE_READER_URL!); readerUrl.pathname = '/aduana_test';
  process.env.DATABASE_URL = appUrl.toString(); process.env.DATABASE_READER_URL = readerUrl.toString();
  const dbModule = await import('../../apps/api/src/db.js'); appPool = dbModule.pool; readPool = dbModule.reader;
  const { createApp } = await import('../../apps/api/src/app.js'); app = createApp(); request = supertest.agent(app);
  await request.post('/api/auth/login').set('Origin', origin).send({ nombre: 'test-admin', password: 'test-isolated-password' }).expect(200);
  csrf = (await request.get('/api/auth/me').expect(200)).body.csrf;
});
after(async () => { await Promise.all([admin.end(), appPool?.end(), readPool?.end()]); });

async function move(lot: number, type: string, qty: string, from: number | null, to: number | null, key = randomUUID()) {
  return appPool.query('SELECT aduana.mover($1,1,$2,$3,$4,$5,$6,$7)', [key, type, lot, from, to, qty, 'Prueba de inventario']);
}
async function balance(lot: number) { return (await admin.query('SELECT coalesce(sum(cantidad),0)::text AS saldo FROM aduana.existencias WHERE lote_id=$1', [lot])).rows[0].saldo; }
async function release(lot: number) { await appPool.query("SELECT aduana.inspeccionar(1,$1,1,'APROBADO','Prueba aprobada')", [lot]); await appPool.query("SELECT aduana.liberar(1,$1,'Prueba de liberación')", [lot]); }

test('Dominio SQL: parámetros NULL rechazados sin operaciones vacías ni cambios', async () => {
  const before = (await admin.query('SELECT count(*) FROM aduana.operaciones')).rows[0].count;
  for (const values of [[null, '1', 'Prueba de nulidad'], ['RECEPCION', null, 'Prueba de nulidad'], ['RECEPCION', '1', null]]) {
    await assert.rejects(appPool.query('SELECT aduana.mover($1,1,$2,1,NULL,2,$3,$4)', [randomUUID(), ...values]), { code: 'P0001' });
  }
  assert.equal((await admin.query('SELECT count(*) FROM aduana.operaciones')).rows[0].count, before);
  assert.equal(await balance(1), '0');
});
test('INV-01/06: recepción persistente e idempotente; contenido diferente rechazado', async () => {
  const key = randomUUID(); await move(1, 'RECEPCION', '100', null, 2, key); await move(1, 'RECEPCION', '100', null, 2, key);
  assert.equal(await balance(1), '100.000');
  assert.equal((await admin.query('SELECT count(*) FROM aduana.movimientos WHERE lote_id=1')).rows[0].count, '1');
  await assert.rejects(move(1, 'RECEPCION', '99', null, 2, key), /idempotencia/);
});
test('INV-02/03: sin sobregiro ni despacho retenido, sin efectos parciales', async () => {
  await assert.rejects(move(1, 'SALIDA', '10', 2, null), /retenida/);
  await release(1); await assert.rejects(move(1, 'SALIDA', '101', 2, null), /Saldo insuficiente/);
  assert.equal(await balance(1), '100.000');
  assert.equal((await admin.query('SELECT count(*) FROM aduana.operaciones')).rows[0].count, '1');
});
test('INV-04/05: traslado conserva total; fallo destino revierte saldo e historia', async () => {
  await move(1, 'TRASLADO', '30', 2, 3); assert.equal(await balance(1), '100.000');
  const before = (await admin.query('SELECT count(*) FROM aduana.movimientos')).rows[0].count;
  await assert.rejects(move(1, 'TRASLADO', '10', 2, 999999), /destino/);
  assert.equal(await balance(1), '100.000');
  assert.equal((await admin.query('SELECT cantidad FROM aduana.existencias WHERE lote_id=1 AND bodega_id=2')).rows[0].cantidad, '70.000');
  assert.equal((await admin.query('SELECT count(*) FROM aduana.movimientos')).rows[0].count, before);
});
test('INV-07: dos salidas concurrentes no producen saldo negativo', async () => {
  await move(2, 'RECEPCION', '100', null, 1); await release(2);
  const results = await Promise.allSettled([move(2, 'SALIDA', '80', 1, null), move(2, 'SALIDA', '80', 1, null)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(await balance(2), '20.000');
});
test('INV-08: el mismo producto conserva dos países de origen', async () => {
  await move(16, 'RECEPCION', '20', null, 2);
  await move(17, 'RECEPCION', '20', null, 2);
  const { rows } = await admin.query("SELECT DISTINCT origen FROM reporting.inventario WHERE producto_id=1 ORDER BY origen");
  assert.deepEqual(rows.map(r => r.origen), ['China', 'Estados Unidos']);
});
test('INV-09/10: no se borra referencia histórica y el detalle conserva nombre', async () => {
  await assert.rejects(appPool.query('DELETE FROM aduana.productos WHERE id=1'), { code: '23503' });
  await appPool.query("UPDATE aduana.productos SET nombre='Nombre actualizado' WHERE id=1");
  assert.equal((await admin.query('SELECT producto_nombre FROM aduana.detalles WHERE id=1')).rows[0].producto_nombre, 'Panel solar');
});
test('INV-11: límite de octubre excluye noviembre, incluye último día', async () => {
  await admin.query("INSERT INTO aduana.declaraciones(numero,operador_id,agente_id,fecha,regimen) VALUES('TEST-OCT',1,1,'2026-10-31','IMPORTACION'),('TEST-NOV',1,1,'2026-11-01','IMPORTACION')");
  const result = await request.get('/api/reportes/importaciones?anio=2026').expect(200);
  assert(result.body.rows.some((r: { numero: string }) => r.numero === 'TEST-OCT'));
  assert(!result.body.rows.some((r: { numero: string }) => r.numero === 'TEST-NOV'));
});
test('Integridad: recepción máxima, cantidades enteras y capacidad', async () => {
  await assert.rejects(move(1, 'RECEPCION', '11', null, 2), /declarada/);
  await assert.rejects(move(3, 'RECEPCION', '0.5', null, 1), /entera/);
  await admin.query('UPDATE aduana.bodegas SET capacidad_kg=5 WHERE id=15');
  await assert.rejects(move(4, 'RECEPCION', '10', null, 15), /Capacidad/);
  await move(4, 'RECEPCION', '10', null, 1);
  await assert.rejects(appPool.query('UPDATE aduana.bodegas SET capacidad_kg=5 WHERE id=1'), /capacidad/);
  assert.equal(await balance(4), '10.000');
  const snapshot = await appPool.query("INSERT INTO aduana.detalles(declaracion_id,linea,producto_id,pais_id,cantidad,valor_unitario,tarifa_aplicada,producto_nombre,unidad) VALUES(1,3,1,1,1,10,99,'nombre manipulado','kg') RETURNING unidad,producto_nombre,tarifa_aplicada");
  assert.equal(snapshot.rows[0].unidad, 'unidad'); assert.equal(snapshot.rows[0].producto_nombre, 'Nombre actualizado'); assert.equal(snapshot.rows[0].tarifa_aplicada, '2.500');
});
test('Reconciliación exacta de saldos y movimientos', async () => {
  const { rows } = await admin.query(`SELECT e.id FROM aduana.existencias e LEFT JOIN (SELECT lote_id,bodega_id,sum(cantidad) AS saldo FROM aduana.movimientos GROUP BY lote_id,bodega_id)m USING(lote_id,bodega_id) WHERE e.cantidad<>coalesce(m.saldo,0)`);
  assert.equal(rows.length, 0);
});
test('Permisos efectivos: lector no escribe ni ejecuta operaciones; app no edita saldo', async () => {
  await readPool.query('SELECT * FROM reporting.inventario LIMIT 1');
  await assert.rejects(readPool.query("DELETE FROM aduana.movimientos"));
  const c = await readPool.connect();
  try { await c.query('SET default_transaction_read_only=off'); await assert.rejects(c.query('UPDATE aduana.existencias SET cantidad=0'), { code: '42501' }); await assert.rejects(c.query("SELECT aduana.liberar(1,1,'intento lector')"), { code: '42501' }); } finally { await c.query('RESET default_transaction_read_only'); c.release(); }
  await assert.rejects(appPool.query('UPDATE aduana.existencias SET cantidad=0'), { code: '42501' });
  await assert.rejects(appPool.query("INSERT INTO aduana.lotes(codigo,detalle_id,estado,liberado_en) VALUES('BYPASS',1,'LIBERADO',now())"), { code: '42501' });
});
test('API: autorización, CSRF y origen obligatorios', async () => {
  await supertest(app).get('/api/dashboard').expect(401);
  await request.post('/api/movimientos').set('Origin', origin).send({}).expect(403);
  await request.post('/api/movimientos').set('Origin', 'https://ajeno.example').set('x-csrf-token', csrf).send({}).expect(403);
  const read = supertest.agent(app);
  await read.post('/api/auth/login').set('Origin', origin).send({ nombre: 'test-read', password: 'test-isolated-password' }).expect(200);
  const token = (await read.get('/api/auth/me')).body.csrf;
  await read.post('/api/movimientos').set('Origin', origin).set('x-csrf-token', token).send({}).expect(403);
  await read.post('/api/catalogos/paises').set('Origin', origin).set('x-csrf-token', token).send({ codigo: 'XX', nombre: 'Prueba' }).expect(403);
});
test('API: SQL injection en búsqueda no altera tablas; catálogo arbitrario rechazado', async () => {
  const result = await request.get('/api/catalogos/productos').query({ q: "'; DROP TABLE aduana.productos; --" }).expect(200);
  assert.equal(result.body.rows.length, 0);
  await request.get('/api/catalogos/usuarios').expect(404);
  assert.equal((await admin.query('SELECT count(*) FROM aduana.productos')).rows[0].count, '15');
});
test('API: declaración atómica, persistencia y rechazo de recepción prematura', async () => {
  const input = { numero: 'TEST-NUEVA', operador_id: 1, agente_id: 1, fecha: '2026-10-20', regimen: 'IMPORTACION', detalles: [{ producto_id: 1, pais_id: 1, cantidad: '25', valor_unitario: '100.0000' }], contenedores: [{ codigo: 'TEST-CONTAINER', pais_id: 1, fecha_recepcion: '2026-10-21' }] };
  const created = await request.post('/api/declaraciones').set('Origin', origin).set('x-csrf-token', csrf).send(input).expect(201);
  const fetched = await request.get(`/api/declaraciones/${created.body.id}`).expect(200); assert.equal(fetched.body.detalles.length, 1); assert.equal(fetched.body.valor, '2500.0000');
  await request.post('/api/declaraciones').set('Origin', origin).set('x-csrf-token', csrf).send({ ...input, numero: 'TEST-ROLLBACK', detalles: [{ ...input.detalles[0], producto_id: 99999 }] }).expect(409);
  assert.equal((await admin.query("SELECT count(*) FROM aduana.declaraciones WHERE numero='TEST-ROLLBACK'")).rows[0].count, '0');
});
test('API: ocho reportes SQL reales y dashboard conciliado', async () => {
  const paths = ['importaciones?anio=2026','retenidos','pais-contenedores','importador-valor','inspecciones','stock-producto?producto_id=1','china-bodega2','movimientos?lote_id=1&desde=2026-01-01T00:00:00-06:00&hasta=2027-01-01T00:00:00-06:00'];
  for (const path of paths) { const r = await request.get(`/api/reportes/${path}`).expect(200); assert(Array.isArray(r.body.rows)); }
  const dash = await request.get('/api/dashboard').expect(200);
  assert.equal(dash.body.declaraciones, (await admin.query('SELECT count(*) FROM aduana.declaraciones')).rows[0].count);
  const independent = await admin.query('SELECT sum(cantidad*valor_unitario)::numeric(20,4) AS valor FROM aduana.detalles');
  assert.equal(dash.body.valor, independent.rows[0].valor);
});
test('API: chat sin configuración devuelve bloqueo, sin respuesta fabricada', async () => {
  const result = await request.post('/api/chat').set('Origin', origin).set('x-csrf-token', csrf).send({ mensaje: '¿Mercancías retenidas?' }).expect(503);
  assert.match(result.body.error, /sin configurar/); assert.equal(result.body.respuesta, undefined);
  await mkdir('evidencias', { recursive: true });
  await writeFile('evidencias/destino-pruebas.json', JSON.stringify({ database: 'aduana_test', host: '127.0.0.1', scope: 'Pruebas SQL/API. No valida agente LLM.', timestamp: new Date().toISOString() }, null, 2));
});
