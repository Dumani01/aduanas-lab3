import 'dotenv/config';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import pg from 'pg';

async function http(url) {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(3000) }); return { url, disponible: response.ok, status: response.status }; }
  catch { return { url, disponible: false }; }
}
const [web, api, n8n] = await Promise.all([
  http('http://127.0.0.1:5173/'), http('http://127.0.0.1:4310/api/health'), http('http://127.0.0.1:5678/healthz'),
]);
let postgres = { disponible: false };
const reader = new pg.Client({ connectionString: process.env.DATABASE_READER_URL, connectionTimeoutMillis: 3000 });
try {
  await reader.connect();
  const { rows } = await reader.query('SELECT current_database() AS base,current_user AS rol,(SELECT count(*) FROM reporting.inventario) AS filas');
  postgres = { disponible: true, ...rows[0] };
} catch {} finally { await reader.end(); }
let modelConfigured = false;
if (process.env.DATABASE_ADMIN_URL) {
  const url = new URL(process.env.DATABASE_ADMIN_URL); url.pathname = '/n8n_lab3';
  const db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 3000 });
  try {
    await db.connect();
    const { rows } = await db.query("SELECT count(*) AS cantidad FROM credentials_entity WHERE type IN ('openAiApi','openRouterApi','anthropicApi','ollamaApi')");
    modelConfigured = Number(rows[0].cantidad) > 0;
  } catch {} finally { await db.end(); }
}
const result = {
  fasePendiente: '9 — agente n8n; después 10 — chat web con modelo real',
  servicios: { web, api, n8n, postgres },
  integracion: { credencialesLocalesPreparadas: existsSync('.local/n8n-bindings.json'), modeloConfigurado: modelConfigured, sqlN8nVerificado: existsSync('evidencias/n8n-sql-real.json') },
  pendientes: ['Documento original del laboratorio', 'Datos académicos de integrantes/docente/sección', ...(!modelConfigured ? ['Credencial del modelo y ocho respuestas reales del agente'] : [])],
};
await writeFile('evidencias/estado-servicios.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
