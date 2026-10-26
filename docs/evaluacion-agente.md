# Evaluación del agente

Estado: BLOQUEADO para las ocho respuestas del LLM. El workflow fue importado, no ejecutado con un modelo. Las filas SQL de referencia están en evidencias/consultas-reales.json; no equivalen a respuestas del agente. No se han fabricado capturas de conversaciones.

Avance adicional: un workflow diagnóstico de n8n ejecutó realmente las ocho consultas con aduana_reader, coincidiendo con SQL directo (evidencias/n8n-sql-real.json). El diagnóstico no contiene AI Agent ni modelo; no se registra como respuesta del agente en la tabla siguiente.

| Pregunta | Parámetros reales | Herramienta / referencia | Expectativa | Respuesta del agente | Exactitud / estado |
|---|---|---|---|---|---|
| ¿Cuántas declaraciones de importación hubo en octubre de 2026? | 2026-10-01 a 2026-11-01 | Importaciones_octubre / importaciones | 14 documentos | No ejecutado | bloqueado |
| ¿Qué mercancías siguen retenidas y en qué bodegas? | saldo positivo, RETENIDO | Mercancias_retenidas / retenidos | 10 lotes; cantidades y unidades por bodega | No ejecutado | bloqueado |
| ¿Qué país tiene más contenedores recibidos? | todas las recepciones demo | Pais_con_mas_contenedores | empate de 15 países con 2 cada uno | No ejecutado | bloqueado |
| ¿Qué importador tiene mayor valor declarado? | documentos no anulados, USD | Importador_mayor_valor | operador 15, USD 65 625 | No ejecutado | bloqueado |
| ¿Qué inspecciones tienen observaciones y quién las realizó? | observaciones no vacías | Inspecciones_observadas | 30 inspecciones | No ejecutado | bloqueado |
| ¿Cuál es el stock del producto 1 en todas las bodegas? | producto_id=1, Panel solar | Stock_producto | 1460 unidades total; desglose de bodegas | No ejecutado | bloqueado |
| ¿Qué mercancías de China están retenidas en bodega 2? | origen China, bodega_id=2, saldo>0 | China_retenida_bodega_2 | LOT-2026-0001, 110 unidades de Panel solar | No ejecutado | bloqueado |
| ¿Qué movimientos tuvo lote 1 en octubre de 2026? | lote_id=1, desde 2026-10-01T00:00:00-06:00 hasta 2026-11-01T00:00:00-06:00 | Movimientos_lote | una recepción de 110 unidades, bodega 2 | No ejecutado | bloqueado |

Expectativas aplican al seed de la base aduana sin operaciones posteriores; E2E usa aduana_test y no esas cifras.

Pruebas por ejecutar al conectar modelo: octubre sin año debe pedir aclaración; intentos de DELETE/cambio de rol/secretos; entrada excesiva; consulta fuera de herramientas; vacío; caída de base; dos sesiones y memoria; datos con instrucciones maliciosas. Verificar SQL y filtros, no solo redacción. Capturar ocho respuestas reales en web y registrar comparación por pregunta.
