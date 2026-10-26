import 'dotenv/config';
import pg from 'pg';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const db=new pg.Client({connectionString:process.env.DATABASE_ADMIN_URL});await db.connect();
try{
 await mkdir('docs/diagramas',{recursive:true});await mkdir('evidencias',{recursive:true});
 const columns=(await db.query(`SELECT c.table_name,c.column_name,c.is_nullable,c.column_default,format_type(a.atttypid,a.atttypmod) AS tipo FROM information_schema.columns c JOIN pg_namespace n ON n.nspname=c.table_schema JOIN pg_class t ON t.relnamespace=n.oid AND t.relname=c.table_name JOIN pg_attribute a ON a.attrelid=t.oid AND a.attname=c.column_name WHERE c.table_schema='aduana' ORDER BY c.table_name,c.ordinal_position`)).rows;
 const constraints=(await db.query(`SELECT c.conname,t.relname AS tabla,c.contype,pg_get_constraintdef(c.oid) AS definition,rt.relname AS referencia FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_class rt ON rt.oid=c.confrelid WHERE n.nspname='aduana' ORDER BY t.relname,c.conname`)).rows;
 const tables=[...new Set(columns.map(c=>c.table_name))];const technical=['usuarios','sesiones','operaciones','eventos'];
 const counts={};for(const table of tables) counts[table]=Number((await db.query(`SELECT count(*) FROM aduana.${table}`)).rows[0].count);
 await writeFile('evidencias/esquema-real.json',JSON.stringify({version:(await db.query('SELECT version()')).rows[0].version,columns,constraints,counts},null,2));
 let dictionary='# Diccionario del esquema real\n\nGenerado consultando PostgreSQL. PK: identificación. FK: referencia histórica con ON DELETE NO ACTION, salvo indicación SQL. NULL se permite únicamente donde se indica. Catálogos no se borran si están referenciados.\n\nUnidades: cantidades según unidad del detalle; capacidad en kg; importes USD; tarifa porcentaje académico; timestamps con zona. Tablas técnicas: usuarios, sesiones, operaciones (idempotencia), eventos (auditoría); las restantes son de negocio.\n';
 let dot='digraph Aduana { graph [rankdir=LR,bgcolor="#f7f8f4",pad="0.5",nodesep="0.4",ranksep="1.2",label="INVENTARIO ADUANERO · Modelo físico PostgreSQL\\nPK/FK · NN = NOT NULL · 1 a 0..N · Sin borrados en cascada",labelloc=t,fontsize=24,fontname="Arial"]; node[shape=plain,fontname="Arial"];edge[color="#789780",fontname="Arial",fontsize=9];\n';
 let mermaid='erDiagram\n';
 for(const t of tables){
  const cols=columns.filter(c=>c.table_name===t);const cons=constraints.filter(c=>c.tabla===t);
  dictionary+=`\n## ${t} (${technical.includes(t)?'técnica':'negocio'}; ${counts[t]} filas)\n\n| Columna | Tipo | NULL | Predeterminado |\n|---|---|---|---|\n`;
  const rows=cols.map(c=>{const ispk=cons.some(k=>k.contype==='p'&&k.definition.includes(`(${c.column_name})`));const isfk=cons.some(k=>k.contype==='f'&&k.definition.startsWith(`FOREIGN KEY (${c.column_name})`));
   dictionary+=`| ${c.column_name} | ${c.tipo} | ${c.is_nullable} | ${c.column_default||'—'} |\n`;
   const isUnique=cons.some(k=>k.contype==='u'&&k.definition===`UNIQUE (${c.column_name})`);
   return `<TR><TD ALIGN="LEFT">${ispk?'PK ':isfk?'FK ':''}${isUnique?'UQ ':''}${c.column_name}</TD><TD ALIGN="LEFT">${c.tipo.replaceAll('<','&lt;').replaceAll('>','&gt;')}</TD><TD>${c.is_nullable==='NO'?'NN':'NULL'}</TD></TR>`;}).join('');
  dictionary+='\nRestricciones:\n\n'+cons.map(k=>`- \`${k.definition}\``).join('\n')+'\n';
  const compoundUnique=cons.filter(k=>k.contype==='u'&&k.definition.includes(',')).map(k=>`<TR><TD COLSPAN="3">${k.definition}</TD></TR>`).join('');
  dot+=`${t} [label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="7" COLOR="#d2decd"><TR><TD COLSPAN="3" BGCOLOR="${technical.includes(t)?'#657563':'#244d40'}"><FONT COLOR="white"><B>${t.toUpperCase()}</B>${technical.includes(t)?' (técnica)':''}</FONT></TD></TR>${rows}${compoundUnique}</TABLE>>];\n`;
  mermaid+=`  ${t} {\n${cols.map(c=>`    ${c.tipo.replace(/\W/g,'_')} ${c.column_name}`).join('\n')}\n  }\n`;
 }
 for(const c of constraints.filter(c=>c.contype==='f')) { const field=/FOREIGN KEY \(([^)]+)\)/.exec(c.definition)[1]; dot+=`${c.referencia} -> ${c.tabla} [dir=both,arrowtail=teetee,arrowhead=crowodot,taillabel="1",headlabel="0..N",label="${field}"];\n`;mermaid+=`  ${c.referencia} ||--o{ ${c.tabla} : "${field}"\n`; }
 dot+='}';await writeFile('docs/diccionario.md',dictionary);await writeFile('docs/diagramas/modelo.dot',dot);await writeFile('docs/diagramas/modelo.mmd',mermaid);
 const {instance}=await import('@viz-js/viz');const viz=await instance();await writeFile('docs/diagramas/modelo.svg',viz.renderString(dot,{format:'svg'}));
 const queries=JSON.parse(await readFile('database/queries/reports.json','utf8'));
 const params={'importaciones':['2026-10-01','2026-11-01'],'stock-producto':[1],'movimientos':[1,'2026-10-01T00:00:00-06:00','2026-11-01T00:00:00-06:00']};const results={};
 for(const[name,sql] of Object.entries(queries)){const start=performance.now();const r=await db.query(sql,params[name]||[]);results[name]={parametros:params[name]||[],sql,filas:r.rows,milisegundos:Number((performance.now()-start).toFixed(3)),agente:'NO EJECUTADO: falta credencial de modelo'};}
 const reconciled=(await db.query(`SELECT e.id FROM aduana.existencias e LEFT JOIN (SELECT lote_id,bodega_id,sum(cantidad) saldo FROM aduana.movimientos GROUP BY lote_id,bodega_id)m USING(lote_id,bodega_id) WHERE e.cantidad<>coalesce(m.saldo,0)`)).rows;
 await writeFile('evidencias/consultas-reales.json',JSON.stringify({database:'aduana',fechaReferencia:'2026-10-23',counts,reconciliacionDiferencias:reconciled.length,resultados:results},null,2));
 console.log(JSON.stringify({counts,reconciliacionDiferencias:reconciled.length,consultas:Object.keys(results).length}));
}finally{await db.end()}
