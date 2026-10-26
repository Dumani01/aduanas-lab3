import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const evidence=JSON.parse(await readFile('evidencias/consultas-reales.json','utf8'));const r=evidence.resultados;
const expected=[];
assert.equal(r.importaciones.filas.length,14);expected.push('14 declaraciones importación');
assert.equal(r.retenidos.filas.length,10);expected.push('10 lotes retenidos positivos');
assert.equal(r['pais-contenedores'].filas.length,15);assert(r['pais-contenedores'].filas.every(x=>x.cantidad==='2'));expected.push('15 países empatados, dos contenedores');
// Cálculo separado del SQL: la declaración 15 tiene 250*200 + 125*125 USD.
assert.equal(r['importador-valor'].filas[0].valor,(250*200+125*125).toFixed(4));expected.push('Operador 15: 65625 USD');
assert.equal(r.inspecciones.filas.length,30);expected.push('30 inspecciones con observación');
// Línea uno producto 1: 110. Líneas dos: sumatoria 50+5*i, i=1..15.
const stock=110+Array.from({length:15},(_,i)=>50+5*(i+1)).reduce((a,b)=>a+b,0);
assert(r['stock-producto'].filas.every(x=>Number(x.total_producto)===stock));assert.equal(r['stock-producto'].filas.reduce((s,x)=>s+Number(x.cantidad),0),stock);expected.push('1460 unidades producto 1');
assert.deepEqual(r['china-bodega2'].filas.map(x=>[x.lote,x.cantidad,x.unidad]),[['LOT-2026-0001','110.000','unidad']]);expected.push('China bodega 2: lote1, 110 unidades');
assert.equal(r.movimientos.filas.length,1);assert.equal(r.movimientos.filas[0].tipo,'RECEPCION');assert.equal(r.movimientos.filas[0].cantidad,'110.000');expected.push('Lote1 en octubre: recepción110');
await writeFile('evidencias/expectativas-consultas.json',JSON.stringify({scope:'SQL sin agente LLM',passed:8,expected},null,2));console.log('8 expectativas independientes aprobadas.');
