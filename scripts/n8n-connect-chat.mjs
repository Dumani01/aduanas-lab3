import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import pg from 'pg';

const checkOnly = process.argv.includes('--check');
const url = new URL(process.env.DATABASE_ADMIN_URL || '');
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Este helper solo configura la instancia local');
url.pathname = '/n8n_lab3';
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
try {
  const row = (await db.query('SELECT nodes,connections,active,"activeVersionId" FROM workflow_entity WHERE id=$1', ['aduana-lab3-local'])).rows[0];
  if (!row) throw new Error('Primero ejecute npm run n8n:prepare');
  const agent = row.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
  const modelName = Object.entries(row.connections).find(([, ports]) => ports.ai_languageModel?.flat().some(c => c.node === agent?.name))?.[0];
  const model = row.nodes.find(n => n.name === modelName);
  const modelCredentialIds = Object.values(model?.credentials || {}).map(c => c.id).filter(Boolean);
  const modelCount = modelCredentialIds.length ? Number((await db.query('SELECT count(*) AS cantidad FROM credentials_entity WHERE id=ANY($1::text[])', [modelCredentialIds])).rows[0].cantidad) : 0;
  const bindings = JSON.parse(await readFile('.local/n8n-bindings.json', 'utf8'));
  const webhook = row.nodes.find(n => n.type === 'n8n-nodes-base.webhook' && n.credentials?.httpHeaderAuth?.id === bindings.headerId);
  const problems = [];
  if (!model || modelCount === 0) problems.push('Vincular una credencial válida al modelo conectado al agente');
  if (!row.active && !row.activeVersionId) problems.push('Publicar el workflow después de completar el modelo');
  if (!webhook || !/^[-a-zA-Z0-9/]+$/.test(webhook.parameters.path)) problems.push('Revisar la entrada web protegida y su ruta');
  const report = { readyToConfigure: problems.length === 0, problems, scope: 'Comprueba vínculos y publicación; no ejecuta ni valida respuestas del modelo' };
  await writeFile('evidencias/n8n-requisitos-chat.json', JSON.stringify(report, null, 2));
  if (problems.length) {
    console.log(JSON.stringify(report, null, 2));
    if (!checkOnly) process.exitCode = 2;
  } else if (checkOnly) console.log(JSON.stringify(report, null, 2));
  else {
    let env = await readFile('.env', 'utf8');
    const values = { N8N_CHAT_URL: `http://127.0.0.1:5678/webhook/${webhook.parameters.path}`, N8N_CHAT_TOKEN: bindings.token };
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      env = pattern.test(env) ? env.replace(pattern, `${key}=${value}`) : `${env}\n${key}=${value}\n`;
    }
    await writeFile('.env', env);
    console.log('Conexión de chat escrita solo en .env. Reinicie la API y ejecute las ocho preguntas reales.');
  }
} finally { await db.end(); }
