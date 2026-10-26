# Evidencias reales y límites

Las capturas fueron producidas por Chromium:

- `demo-*`: aplicación de desarrollo y base **aduana**.
- `dashboard-*`, `china-retenida-bodega2` y `lote-recorrido-e2e`: E2E sobre **aduana_test**.
- `n8n-inicio-local`: pantalla real de configuración inicial de la instancia n8n aislada. No es una conversación ni una respuesta del agente.

Las cifras del seed y las ocho consultas SQL de referencia proceden de aduana y constan en consultas-reales.json. No mezclar cifras de aduana y aduana_test.

`n8n-sql-real.json` registra un workflow diagnóstico realmente ejecutado desde n8n como aduana_reader, con ocho consultas y comparación SQL directa. El diagnóstico no utiliza modelo ni AI Agent y no sustituye LAB-13.

Las ocho respuestas del agente LLM, sus capturas web y las pruebas de memoria/sesiones siguen **BLOQUEADAS** por falta de credencial de modelo. No hay capturas fabricadas ni se presenta SQL como respuesta del agente.

Pruebas y alcance: docs/auditorias/01-inventario.md y 02-continuacion.md. Avance por fase: docs/fases.md. Integrantes y nombres de entrega pendientes.
