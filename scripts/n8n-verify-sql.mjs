import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import pg from 'pg';

const result = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/n8n-local.mjs', 'execute', '--id=aduana-diagnostico-sql', '--rawOutput'], { windowsHide: true });
  let output = '';
  child.stdout.on('data', data => output += data);
  child.stderr.on('data', data => output += data);
  child.on('error', reject);
  child.on('close', code => resolve({ code, output }));
});
await writeFile('.local/n8n-execute-diagnostic.log', result.output);
let execution;
// El CLI puede anteponer mensajes de arranque incluso con rawOutput.
for (let start = result.output.indexOf('{'); start >= 0 && !execution; start = result.output.indexOf('{', start + 1)) {
  const end = result.output.lastIndexOf('}');
  try { const candidate = JSON.parse(result.output.slice(start, end + 1)); if (candidate.data?.resultData) execution = candidate; } catch {}
}
if (result.code !== 0 || !execution || execution.data.resultData.error) throw new Error('Diagnóstico n8n no aprobado; revise .local/n8n-execute-diagnostic.log');
const data = execution.data.resultData.runData['Ocho consultas reales']?.[0]?.data?.main?.[0]?.[0]?.json;
assert(data); assert.equal(data.rol, 'aduana_reader'); assert.equal(data.base, 'aduana');
const reader = new pg.Client({ connectionString: process.env.DATABASE_READER_URL });
await reader.connect();
try {
  const sql = await readFile('.local/n8n-diagnostico.sql', 'utf8');
  const reference = (await reader.query(sql)).rows[0];
  assert.deepEqual(data.resultados, reference.resultados);
  const credentialFree = {
    scope: 'Ejecución real n8n → PostgreSQL con rol lector. NO ejecuta ni valida el agente LLM ni el chat web.',
    workflow: 'aduana-diagnostico-sql', role: data.rol, database: data.base,
    timestamp: new Date().toISOString(), passed: true,
    comparison: 'Coincide con la ejecución SQL directa de las mismas ocho consultas',
    reports: Object.fromEntries(Object.entries(data.resultados).map(([key, rows]) => [key, { count: rows.length, rows }])),
  };
  assert.equal(Object.keys(credentialFree.reports).length, 8);
  await writeFile('evidencias/n8n-sql-real.json', JSON.stringify(credentialFree, null, 2));
  console.log('n8n ejecutó ocho consultas reales como aduana_reader; resultados conciliados. Agente LLM todavía pendiente.');
} finally { await reader.end(); }
