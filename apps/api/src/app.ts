import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from './db.js';
import { verifyPassword } from './password.js';
import { catalogs, type CatalogName } from './catalogs.js';
import { reports } from './reports.js';

declare module 'express-session' {
  interface SessionData { userId: number; csrf: string; chatSession: string }
}
const positiveId = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const decimal = z.string().regex(/^\d{1,12}(\.\d{1,3})?$/).refine(v => Number(v) > 0, 'Debe ser mayor que cero');
const PgStore = connectPgSimple(session);
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"] } } }));
  app.use(express.json({ limit: '24kb' }));
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Configure SESSION_SECRET (mínimo 32 caracteres)');
  app.use(session({
    store: new PgStore({ pool, schemaName: 'aduana', tableName: 'sesiones', createTableIfMissing: false }),
    secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
    name: 'aduana.sid', cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600_000 },
  }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origins = (process.env.APP_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4310').split(',');
      if (!origins.includes(req.get('origin') || '')) return res.status(403).json({ error: 'Origen no autorizado' });
      if (req.path !== '/auth/login' && (!req.session.csrf || req.get('x-csrf-token') !== req.session.csrf)) return res.status(403).json({ error: 'Sesión o token de seguridad inválido' });
    }
    next();
  });
  app.get('/api/health', async (_req, res) => {
    try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'PostgreSQL' }); }
    catch { res.status(503).json({ error: 'Base de datos no disponible' }); }
  });
  app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, legacyHeaders: false }), async (req, res) => {
    const input = z.object({ nombre: z.string().min(1).max(100), password: z.string().min(1).max(200) }).parse(req.body);
    const { rows } = await pool.query('SELECT id,password_hash FROM aduana.usuarios WHERE nombre=$1 AND activo', [input.nombre]);
    if (!rows[0] || !verifyPassword(input.password, rows[0].password_hash)) return res.status(401).json({ error: 'Credenciales incorrectas' });
    await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.userId = Number(rows[0].id);
    req.session.csrf = randomBytes(24).toString('hex');
    req.session.chatSession = randomBytes(24).toString('hex');
    await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
    res.json({ ok: true });
  });
  app.use('/api', async (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Inicie sesión' });
    const { rows } = await pool.query('SELECT id,nombre,rol FROM aduana.usuarios WHERE id=$1 AND activo', [req.session.userId]);
    if (!rows[0]) return res.status(401).json({ error: 'Sesión no válida' });
    res.locals.user = rows[0];
    next();
  });
  app.get('/api/auth/me', (req, res) => res.json({ user: res.locals.user, csrf: req.session.csrf }));
  app.post('/api/auth/logout', (req, res, next) => req.session.destroy(err => { if (err) return next(err); res.clearCookie('aduana.sid'); res.json({ ok: true }); }));
  const write: express.RequestHandler = (_req, res, next) => {
    if (!['administrador', 'operador'].includes(res.locals.user.rol)) return res.status(403).json({ error: 'Su rol solo permite consultas' });
    next();
  };
  const admin: express.RequestHandler = (_req, res, next) => {
    if (res.locals.user.rol !== 'administrador') return res.status(403).json({ error: 'Requiere administrador' });
    next();
  };
  app.get('/api/catalogos/:tabla', async (req, res) => {
    const key = req.params.tabla as CatalogName;
    if (!Object.hasOwn(catalogs, key)) return res.status(404).json({ error: 'Catálogo inexistente' });
    const search = z.string().max(160).parse(req.query.q || '');
    const page = z.coerce.number().int().min(1).max(10000).parse(req.query.page || 1);
    const [{ rows }, count] = await Promise.all([
      pool.query(`SELECT * FROM aduana.${key} WHERE nombre ILIKE $1 ORDER BY id LIMIT 50 OFFSET $2`, [`%${search}%`, (page - 1) * 50]),
      pool.query(`SELECT count(*) FROM aduana.${key} WHERE nombre ILIKE $1`, [`%${search}%`]),
    ]);
    res.json({ rows, total: Number(count.rows[0].count), page });
  });
  app.post('/api/catalogos/:tabla', admin, async (req, res) => {
    const key = req.params.tabla as CatalogName;
    if (!Object.hasOwn(catalogs, key)) return res.status(404).json({ error: 'Catálogo inexistente' });
    const def = catalogs[key]; const input = def.schema.parse(req.body) as Record<string, unknown>;
    const values = def.fields.map(field => input[field]);
    const result = await pool.query(`INSERT INTO aduana.${key}(${def.fields.join(',')}) VALUES(${values.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, values);
    res.status(201).json(result.rows[0]);
  });
  app.put('/api/catalogos/:tabla/:id', admin, async (req, res) => {
    const key = req.params.tabla as CatalogName;
    if (!Object.hasOwn(catalogs, key)) return res.status(404).json({ error: 'Catálogo inexistente' });
    const def = catalogs[key]; const input = def.schema.parse(req.body) as Record<string, unknown>;
    const id = positiveId.parse(req.params.id);
    // Unidad de productos con historia no se puede cambiar: la cantidad conserva su dimensión.
    if (key === 'productos') {
      const old = await pool.query('SELECT unidad FROM aduana.productos WHERE id=$1', [id]);
      if (old.rows[0] && old.rows[0].unidad !== input.unidad) return res.status(409).json({ error: 'La unidad de un producto es inmutable; registre otro producto' });
    }
    const values = def.fields.map(field => input[field]);
    const result = await pool.query(`UPDATE aduana.${key} SET ${def.fields.map((field, i) => `${field}=$${i + 1}`).join(',')} WHERE id=$${values.length + 1} RETURNING *`, [...values, id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Registro inexistente' });
    res.json(result.rows[0]);
  });
  app.delete('/api/catalogos/:tabla/:id', admin, async (req, res) => {
    const key = req.params.tabla as CatalogName;
    if (!Object.hasOwn(catalogs, key)) return res.status(404).json({ error: 'Catálogo inexistente' });
    const result = await pool.query(`DELETE FROM aduana.${key} WHERE id=$1`, [positiveId.parse(req.params.id)]);
    if (!result.rowCount) return res.status(404).json({ error: 'Registro inexistente' });
    res.json({ ok: true });
  });
  app.get('/api/referencias', async (_req, res) => {
    const keys = Object.keys(catalogs) as CatalogName[];
    const result = await Promise.all(keys.map(key => pool.query(`SELECT * FROM aduana.${key} ORDER BY nombre LIMIT 1000`)));
    res.json(Object.fromEntries(keys.map((key, i) => [key, result[i].rows])));
  });
  app.get('/api/declaraciones', async (req, res) => {
    const q = z.string().max(100).parse(req.query.q || '');
    const page = z.coerce.number().int().min(1).max(10000).parse(req.query.page || 1);
    const { rows } = await pool.query('SELECT *,count(*) OVER() AS total FROM reporting.valor_declaraciones WHERE numero ILIKE $1 OR importador ILIKE $1 ORDER BY fecha DESC,id DESC LIMIT 50 OFFSET $2', [`%${q}%`, (page - 1) * 50]);
    res.json({ rows, page, total: Number(rows[0]?.total || 0) });
  });
  app.get('/api/declaraciones/:id', async (req, res) => {
    const id = positiveId.parse(req.params.id);
    const [head, details, containers] = await Promise.all([
      pool.query('SELECT * FROM reporting.valor_declaraciones WHERE id=$1', [id]),
      pool.query('SELECT d.*,p.nombre AS origen FROM aduana.detalles d JOIN aduana.paises p ON p.id=d.pais_id WHERE declaracion_id=$1 ORDER BY linea', [id]),
      pool.query('SELECT * FROM reporting.contenedores WHERE declaracion_id=$1 ORDER BY id', [id]),
    ]);
    if (!head.rows[0]) return res.status(404).json({ error: 'Declaración inexistente' });
    res.json({ ...head.rows[0], detalles: details.rows, contenedores: containers.rows });
  });
  app.post('/api/declaraciones', write, async (req, res) => {
    const input = z.object({ numero: z.string().trim().min(3).max(40), operador_id: positiveId, agente_id: positiveId,
      fecha: z.iso.date(), regimen: z.enum(['IMPORTACION', 'EXPORTACION', 'TRANSITO']),
      detalles: z.array(z.object({ producto_id: positiveId, pais_id: positiveId, cantidad: decimal,
        valor_unitario: z.string().regex(/^\d{1,12}(\.\d{1,4})?$/) })).min(1).max(100),
      contenedores: z.array(z.object({ codigo: z.string().trim().min(3).max(30), pais_id: positiveId, fecha_recepcion: z.iso.date() })).min(1).max(100),
    }).parse(req.body);
    if (input.contenedores.some(c => c.fecha_recepcion < input.fecha)) return res.status(422).json({ error: 'La recepción no puede preceder a la declaración' });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const valid = await c.query('SELECT (SELECT activo FROM aduana.operadores WHERE id=$1) AND (SELECT activo FROM aduana.agentes WHERE id=$2) AS ok', [input.operador_id, input.agente_id]);
      if (!valid.rows[0].ok) throw Object.assign(new Error('Operador o agente no disponible'), { code: 'P0001' });
      const head = await c.query('INSERT INTO aduana.declaraciones(numero,operador_id,agente_id,fecha,regimen) VALUES($1,$2,$3,$4,$5) RETURNING id', [input.numero, input.operador_id, input.agente_id, input.fecha, input.regimen]);
      const id = head.rows[0].id;
      for (const [index, d] of input.detalles.entries()) {
        const product = await c.query('SELECT p.nombre,p.unidad,t.tarifa FROM aduana.productos p JOIN aduana.partidas t ON t.id=p.partida_id WHERE p.id=$1 AND p.activo FOR SHARE OF p,t', [d.producto_id]);
        if (!product.rows[0]) throw Object.assign(new Error('Producto no disponible'), { code: 'P0001' });
        const p = product.rows[0];
        const detail = await c.query('INSERT INTO aduana.detalles(declaracion_id,linea,producto_id,pais_id,cantidad,valor_unitario,tarifa_aplicada,producto_nombre,unidad) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id', [id, index + 1, d.producto_id, d.pais_id, d.cantidad, d.valor_unitario, p.tarifa, p.nombre, p.unidad]);
        await c.query('INSERT INTO aduana.lotes(codigo,detalle_id) VALUES($1,$2)', [`LOT-${id}-${index + 1}`, detail.rows[0].id]);
      }
      for (const ct of input.contenedores) await c.query('INSERT INTO aduana.contenedores(codigo,declaracion_id,pais_id,fecha_recepcion) VALUES($1,$2,$3,$4)', [ct.codigo, id, ct.pais_id, ct.fecha_recepcion]);
      await c.query('COMMIT'); res.status(201).json({ id });
    } catch (err) { await c.query('ROLLBACK'); throw err; } finally { c.release(); }
  });
  app.get('/api/lotes', async (req, res) => {
    const q = z.string().max(160).parse(req.query.q || '');
    const estado = z.enum(['', 'RETENIDO', 'LIBERADO']).parse(req.query.estado || '');
    const bodega = req.query.bodega ? positiveId.parse(req.query.bodega) : null;
    const page = z.coerce.number().int().min(1).max(10000).parse(req.query.page || 1);
    const { rows } = await pool.query(`SELECT l.id,l.codigo,l.estado,d.producto_nombre AS producto,d.unidad,p.nombre AS origen,dc.numero AS declaracion,dc.id AS declaracion_id,coalesce(sum(e.cantidad),0) AS cantidad,count(*) OVER() AS total
      FROM aduana.lotes l JOIN aduana.detalles d ON d.id=l.detalle_id JOIN aduana.paises p ON p.id=d.pais_id JOIN aduana.declaraciones dc ON dc.id=d.declaracion_id LEFT JOIN aduana.existencias e ON e.lote_id=l.id
      WHERE (l.codigo ILIKE $1 OR d.producto_nombre ILIKE $1 OR p.nombre ILIKE $1) AND ($2='' OR l.estado=$2) AND ($3::bigint IS NULL OR EXISTS(SELECT 1 FROM aduana.existencias ex WHERE ex.lote_id=l.id AND ex.bodega_id=$3 AND ex.cantidad>0))
      GROUP BY l.id,d.producto_nombre,d.unidad,p.nombre,dc.numero,dc.id ORDER BY l.id LIMIT 50 OFFSET $4`, [`%${q}%`, estado, bodega, (page - 1) * 50]);
    res.json({ rows, total: Number(rows[0]?.total || 0), page });
  });
  app.get('/api/lotes/:id', async (req, res) => {
    const id = positiveId.parse(req.params.id);
    const [lot, stock, moves, inspections, events] = await Promise.all([
      pool.query('SELECT l.*,d.producto_nombre AS producto,d.unidad,d.cantidad AS declarado,dc.numero AS declaracion,dc.id AS declaracion_id,p.nombre AS origen,o.nombre AS importador FROM aduana.lotes l JOIN aduana.detalles d ON d.id=l.detalle_id JOIN aduana.declaraciones dc ON dc.id=d.declaracion_id JOIN aduana.paises p ON p.id=d.pais_id JOIN aduana.operadores o ON o.id=dc.operador_id WHERE l.id=$1', [id]),
      pool.query('SELECT * FROM reporting.inventario WHERE lote_id=$1 ORDER BY bodega_id', [id]),
      pool.query('SELECT * FROM reporting.movimientos WHERE lote_id=$1 ORDER BY fecha DESC,id DESC LIMIT 100', [id]),
      pool.query('SELECT * FROM reporting.inspecciones WHERE lote_id=$1 ORDER BY fecha DESC,id DESC LIMIT 100', [id]),
      pool.query('SELECT id,accion,motivo,fecha FROM aduana.eventos WHERE lote_id=$1 ORDER BY id DESC LIMIT 100', [id]),
    ]);
    if (!lot.rows[0]) return res.status(404).json({ error: 'Lote inexistente' });
    res.json({ ...lot.rows[0], existencias: stock.rows, movimientos: moves.rows, inspecciones: inspections.rows, eventos: events.rows });
  });
  app.post('/api/movimientos', write, async (req, res) => {
    const input = z.object({ clave: z.uuid(), tipo: z.enum(['RECEPCION', 'TRASLADO', 'SALIDA']), lote_id: positiveId,
      origen_id: positiveId.nullable().default(null), destino_id: positiveId.nullable().default(null), cantidad: decimal, motivo: z.string().trim().min(3).max(500) }).parse(req.body);
    const { rows } = await pool.query('SELECT aduana.mover($1,$2,$3,$4,$5,$6,$7,$8) AS resultado', [input.clave, res.locals.user.id, input.tipo, input.lote_id, input.origen_id, input.destino_id, input.cantidad, input.motivo]);
    res.json(rows[0].resultado);
  });
  app.get('/api/movimientos', async (req, res) => {
    const page = z.coerce.number().int().min(1).max(10000).parse(req.query.page || 1);
    const { rows } = await pool.query('SELECT *,count(*) OVER() AS total FROM reporting.movimientos ORDER BY fecha DESC,id DESC LIMIT 50 OFFSET $1', [(page - 1) * 50]);
    res.json({ rows, total: Number(rows[0]?.total || 0), page });
  });
  app.post('/api/inspecciones', write, async (req, res) => {
    const input = z.object({ lote_id: positiveId, funcionario_id: positiveId, resultado: z.enum(['RETENER', 'APROBADO']), observaciones: z.string().trim().min(3).max(1000) }).parse(req.body);
    const { rows } = await pool.query('SELECT aduana.inspeccionar($1,$2,$3,$4,$5) AS id', [res.locals.user.id, input.lote_id, input.funcionario_id, input.resultado, input.observaciones]);
    res.status(201).json(rows[0]);
  });
  app.get('/api/inspecciones', async (req, res) => {
    const page = z.coerce.number().int().min(1).max(10000).parse(req.query.page || 1);
    const { rows } = await pool.query('SELECT *,count(*) OVER() AS total FROM reporting.inspecciones ORDER BY fecha DESC,id DESC LIMIT 50 OFFSET $1', [(page - 1) * 50]);
    res.json({ rows, total: Number(rows[0]?.total || 0), page });
  });
  app.post('/api/lotes/:id/liberar', write, async (req, res) => {
    const { motivo } = z.object({ motivo: z.string().trim().min(3).max(500) }).parse(req.body);
    await pool.query('SELECT aduana.liberar($1,$2,$3)', [res.locals.user.id, positiveId.parse(req.params.id), motivo]);
    res.json({ ok: true });
  });
  app.get('/api/dashboard', async (_req, res) => {
    const [summary, stock, recent, regimes] = await Promise.all([
      pool.query("SELECT (SELECT count(*) FROM aduana.declaraciones) AS declaraciones,(SELECT count(*) FROM aduana.lotes WHERE estado='RETENIDO') AS retenidos,(SELECT coalesce(sum(valor),0) FROM reporting.valor_declaraciones WHERE estado<>'ANULADA') AS valor,(SELECT count(*) FROM aduana.contenedores) AS contenedores"),
      pool.query('SELECT bodega_id,bodega,unidad,sum(cantidad) AS cantidad FROM reporting.inventario GROUP BY bodega_id,bodega,unidad ORDER BY bodega_id,unidad'),
      pool.query('SELECT * FROM reporting.movimientos ORDER BY fecha DESC,id DESC LIMIT 6'),
      pool.query('SELECT regimen,estado,count(*) AS cantidad FROM aduana.declaraciones GROUP BY regimen,estado ORDER BY regimen,estado'),
    ]);
    res.json({ ...summary.rows[0], stock: stock.rows, recientes: recent.rows, regimenes: regimes.rows, moneda: 'USD' });
  });
  app.get('/api/reportes/:name', async (req, res) => res.json(await reports(req.params.name, req.query)));
  app.get('/api/chat/config', (_req, res) => res.json({ configurado: Boolean(process.env.N8N_CHAT_URL && process.env.N8N_CHAT_TOKEN) }));
  app.post('/api/chat', rateLimit({ windowMs: 60_000, limit: 10, legacyHeaders: false }), async (req, res) => {
    const { mensaje } = z.object({ mensaje: z.string().trim().min(1).max(2000) }).parse(req.body);
    if (!process.env.N8N_CHAT_URL || !process.env.N8N_CHAT_TOKEN) return res.status(503).json({ error: 'Chat sin configurar: falta conectar n8n y el modelo. No se ha enviado el mensaje.' });
    try {
      const response = await fetch(process.env.N8N_CHAT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.N8N_CHAT_TOKEN}` },
        body: JSON.stringify({ action: 'sendMessage', sessionId: req.session.chatSession, chatInput: mensaje }), signal: AbortSignal.timeout(45000) });
      if (!response.ok) return res.status(502).json({ error: 'n8n rechazó la consulta' });
      const data = await response.json() as { output?: unknown };
      if (typeof data.output !== 'string' || data.output.length > 30000) return res.status(502).json({ error: 'Respuesta de n8n no válida' });
      res.json({ respuesta: data.output });
    } catch { res.status(504).json({ error: 'No se recibió respuesta de n8n. Inténtelo de nuevo.' }); }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API inexistente' }));
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof z.ZodError) return res.status(422).json({ error: 'Revise los datos del formulario', fields: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
    const e = err as { code?: string; message?: string; status?: number };
    if (e.code === 'P0001') return res.status(409).json({ error: e.message });
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con ese código' });
    if (e.code === '23503') return res.status(409).json({ error: 'Referencia inexistente o registro vinculado a historia; no se puede completar la acción' });
    if (['23514', '23502', '22003', '22007'].includes(e.code || '')) return res.status(422).json({ error: 'Datos incompatibles con las restricciones del registro' });
    if (e.status === 400 || e.status === 413) return res.status(e.status).json({ error: 'Solicitud inválida o demasiado grande' });
    console.error('Error API', e.code || 'INTERNAL');
    res.status(503).json({ error: 'Servicio temporalmente no disponible. Reintente.' });
  });
  return app;
}
