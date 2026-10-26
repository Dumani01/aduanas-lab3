import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const queries = JSON.parse(await readFile('database/queries/reports.json','utf8'));
const system = await readFile('n8n/system-prompt.md','utf8');
const node = (name,type,typeVersion,parameters,position,extra={}) => ({id:randomUUID(),name,type,typeVersion,parameters,position,...extra});
const nodes = [
  node('Chat académico','@n8n/n8n-nodes-langchain.chatTrigger',1.5,{public:false,options:{responseMode:'lastNode'}},[0,0],{webhookId:randomUUID()}),
  node('Entrada web protegida','n8n-nodes-base.webhook',2.1,{httpMethod:'POST',path:'aduana-chat',authentication:'headerAuth',responseMode:'lastNode',options:{}},[0,220],{webhookId:randomUUID()}),
  node('Normalizar entrada web','n8n-nodes-base.code',2,{jsCode:"const b=$json.body; if(!b || typeof b.chatInput!=='string' || b.chatInput.length>2000 || !/^[a-f0-9]{48}$/.test(b.sessionId)) throw new Error('Entrada inválida'); return [{json:{chatInput:b.chatInput,sessionId:b.sessionId}}];"},[240,220]),
  node('Agente aduanero','@n8n/n8n-nodes-langchain.agent',3.1,{promptType:'auto',options:{systemMessage:system,maxIterations:5,enableStreaming:false}},[510,0]),
  node('Modelo de chat','@n8n/n8n-nodes-langchain.lmChatOpenAi',1.3,{model:{__rl:true,mode:'list',value:'gpt-5-mini'},options:{timeout:35000,maxRetries:1}},[250,450]),
  node('Memoria por sesión','@n8n/n8n-nodes-langchain.memoryBufferWindow',1.4,{sessionIdType:'customKey',sessionKey:'={{ $json.sessionId }}',contextWindowLength:5},[450,450]),
];
const connections={
 'Chat académico':{main:[[{node:'Agente aduanero',type:'main',index:0}]]},
 'Entrada web protegida':{main:[[{node:'Normalizar entrada web',type:'main',index:0}]]},
 'Normalizar entrada web':{main:[[{node:'Agente aduanero',type:'main',index:0}]]},
 'Modelo de chat':{ai_languageModel:[[{node:'Agente aduanero',type:'ai_languageModel',index:0}]]},
 'Memoria por sesión':{ai_memory:[[{node:'Agente aduanero',type:'ai_memory',index:0}]]},
};
const names=['Importaciones_octubre','Mercancias_retenidas','Pais_con_mas_contenedores','Importador_mayor_valor','Inspecciones_observadas','Stock_producto','China_retenida_bodega_2','Movimientos_lote'];
const parameterExpressions={
 'importaciones':"={{ [ $fromAI('desde', 'Primero de octubre del año explícito YYYY-10-01', 'string'), $fromAI('hasta', 'Primero de noviembre del mismo año YYYY-11-01', 'string') ] }}",
 'stock-producto':"={{ [ $fromAI('producto_id', 'ID numérico explícito del producto', 'number') ] }}",
 'movimientos':"={{ [ $fromAI('lote_id', 'ID numérico explícito del lote', 'number'), $fromAI('desde', 'Inicio ISO con zona, inclusivo', 'string'), $fromAI('hasta', 'Fin ISO con zona, exclusivo', 'string') ] }}",
};
for(const [i,[key,sql]] of Object.entries(queries).entries()) {
 const name=names[i];
 const limited=`WITH resultado AS (${sql}), limitado AS (SELECT * FROM resultado LIMIT 101) SELECT coalesce(jsonb_agg(to_jsonb(fila)) FILTER(WHERE fila IS NOT NULL),'[]'::jsonb) AS filas,(SELECT count(*)>100 FROM limitado) AS limitado,100 AS limite FROM (SELECT * FROM limitado LIMIT 100) fila`;
 nodes.push(node(name,'n8n-nodes-base.postgresTool',2.7,{operation:'executeQuery',query:limited,options:{queryReplacement:parameterExpressions[key]||'',largeNumbersOutput:'text'}},[650+i*170,450]));
 connections[name]={ai_tool:[[{node:'Agente aduanero',type:'ai_tool',index:0}]]};
}
await mkdir('n8n',{recursive:true});
await writeFile('n8n/workflow.json',JSON.stringify({id:'aduana-lab3-local',name:'Inventario aduanero — consultas de solo lectura',nodes,connections,settings:{executionOrder:'v1',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false},active:false,pinData:{},tags:[]},null,2));
console.log('Workflow generado. Sin credenciales; requiere vincular Postgres lector, modelo y Header Auth.');
