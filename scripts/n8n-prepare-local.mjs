import 'dotenv/config';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

await mkdir('.local', { recursive: true });
const file = '.local/n8n-bindings.json';
const bindings = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {
  postgresId: randomUUID(), headerId: randomUUID(), token: process.env.N8N_CHAT_TOKEN || randomBytes(32).toString('hex'),
};
await writeFile(file, JSON.stringify(bindings));
const url = new URL(process.env.DATABASE_READER_URL || '');
if (url.pathname !== '/aduana' || url.username !== 'aduana_reader' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Se requiere el rol lector de la base local aduana');

async function run(args, logName) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/n8n-local.mjs', ...args], { windowsHide: true });
    let output = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => output += data);
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
  await writeFile(`.local/${logName}.log`, result.output);
  if (result.code !== 0) throw new Error(`n8n falló; revise .local/${logName}.log`);
}

const credentials = [
  { id: bindings.postgresId, name: 'Aduana lector local', type: 'postgres', data: {
    host: url.hostname, database: 'aduana', user: 'aduana_reader', password: decodeURIComponent(url.password),
    port: Number(url.port), ssl: 'disable', maxConnections: 3, sshTunnel: false,
  } },
  { id: bindings.headerId, name: 'Aduana entrada web local', type: 'httpHeaderAuth', data: { name: 'Authorization', value: `Bearer ${bindings.token}` } },
];
const credentialFile = '.local/n8n-credentials-import.json';
await writeFile(credentialFile, JSON.stringify(credentials));
try { await run(['import:credentials', `--input=${credentialFile}`], 'n8n-import-credentials'); }
finally { await unlink(credentialFile); }

const workflow = JSON.parse(await readFile('n8n/workflow.json', 'utf8'));
for (const node of workflow.nodes) {
  if (node.type === 'n8n-nodes-base.postgresTool') node.credentials = { postgres: { id: bindings.postgresId, name: 'Aduana lector local' } };
  if (node.type === 'n8n-nodes-base.webhook') node.credentials = { httpHeaderAuth: { id: bindings.headerId, name: 'Aduana entrada web local' } };
}
workflow.active = false;
await writeFile('.local/n8n-workflow-configurado.json', JSON.stringify(workflow));
await run(['import:workflow', '--input=.local/n8n-workflow-configurado.json'], 'n8n-import-configured');

const queries = JSON.parse(await readFile('database/queries/reports.json', 'utf8'));
const parameters = {
  importaciones: ["'2026-10-01'", "'2026-11-01'"],
  'stock-producto': ['1'],
  movimientos: ['1', "'2026-10-01T00:00:00-06:00'", "'2026-11-01T00:00:00-06:00'"],
};
const expressions = Object.entries(queries).map(([name, sql]) => {
  const expanded = sql.replace(/\$(\d+)/g, (_, n) => parameters[name][Number(n) - 1]);
  return `'${name}', (SELECT coalesce(jsonb_agg(to_jsonb(fila)),'[]'::jsonb) FROM (${expanded} LIMIT 100) fila)`;
});
const sql = `SELECT current_user AS rol, current_database() AS base, jsonb_build_object(${expressions.join(',')}) AS resultados`;
const diagnostic = {
  id: 'aduana-diagnostico-sql', name: 'Diagnóstico real PostgreSQL — sin LLM', active: false,
  nodes: [
    { id: randomUUID(), name: 'Inicio manual', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {}, position: [0, 0] },
    { id: randomUUID(), name: 'Ocho consultas reales', type: 'n8n-nodes-base.postgres', typeVersion: 2.7, parameters: { operation: 'executeQuery', query: sql, options: { largeNumbersOutput: 'text' } }, credentials: { postgres: { id: bindings.postgresId, name: 'Aduana lector local' } }, position: [240, 0] },
  ],
  connections: { 'Inicio manual': { main: [[{ node: 'Ocho consultas reales', type: 'main', index: 0 }]] } },
  settings: { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', saveManualExecutions: false },
};
await writeFile('.local/n8n-diagnostico.json', JSON.stringify(diagnostic));
await writeFile('.local/n8n-diagnostico.sql', sql);
await run(['import:workflow', '--input=.local/n8n-diagnostico.json'], 'n8n-import-diagnostic');
console.log('Credenciales locales importadas y vinculadas; diagnóstico SQL preparado. Modelo pendiente; chat no activado.');
