# Continuación: n8n SQL y cierre de auditoría

## Objetivo

Avanzar la Fase 9 y comprobar los pendientes sin simular respuestas de un modelo.

## n8n → PostgreSQL real

- Se importaron en la instancia aislada las credenciales PostgreSQL de aduana_reader y Header Auth, obtenidas/generadas localmente. No contienen datos de otras aplicaciones ni se distribuyen en el JSON de entrega.
- Las ocho herramientas del workflow local quedaron vinculadas al lector; la entrada web quedó vinculada a Header Auth. El agente sigue sin activar y sin credencial de modelo.
- Se importó un workflow diagnóstico separado con Manual Trigger y nodo Postgres. Ejecutó las ocho consultas fijas contra aduana bajo el rol aduana_reader.
- Los ocho conjuntos de resultados coinciden con ejecución SQL directa. Evidencia: evidencias/n8n-sql-real.json. El CLI reportó ejecución terminada correctamente.
- Este diagnóstico NO ejecuta el AI Agent, no prueba selección de herramientas por un LLM, no valida memoria ni chat web, y no sustituye LAB-13.

Preparación reproducible: `npm.cmd run n8n:prepare` y `npm.cmd run n8n:verify-sql`. Los archivos temporales con credenciales están en .local; el archivo de importación en texto claro se elimina al terminar. Los logs internos permanecen fuera del paquete.

## Defecto confirmado y corregido

La función SQL mover comprobaba el tipo con NOT IN sin rechazar explícitamente NULL. Una llamada directa con tipo NULL podía insertar una operación y devolver éxito sin movimiento. Se reprodujo únicamente en aduana_test dentro de BEGIN/ROLLBACK, sin dejar cambios. Evidencia inicial: evidencias/defecto-parametro-nulo.json.

Migración 003 agrega rechazo explícito de tipo, cantidad y motivo NULL. Se aplicó a aduana sin reiniciar datos. La prueba de regresión invoca la función con el rol de aplicación y comprueba rechazo P0001, ausencia de operaciones nuevas y saldo intacto.

Resultado: 16 pruebas de integración y 3 E2E aprobadas; build y lint aprobados. Script académico regenerado e instalado en aduana_repro_a_avance y aduana_repro_b_avance, con cero discrepancias de inventario. El esquema real conserva sus 34 movimientos de demostración.

## Pendientes externos

Se comprobó la ausencia de credenciales de modelo en la instancia n8n del proyecto y de claves de proveedor en el entorno usado. Tampoco se encontró un servicio Ollama en el puerto local habitual. No se descargaron modelos ni se compraron recursos.

Falta vincular un modelo disponible y ejecutar el agente, ocho respuestas, aislamiento de conversaciones y ataques desde datos. También faltan DOCX original y datos académicos. Los pendientes siguen visibles; no hay aprobación final.

## Interfaz y servicios

Instancia n8n iniciada únicamente en 127.0.0.1:5678. Se comprobó en Chromium la pantalla real `/setup`, que solicita cuenta de propietario; no se inventaron nombre ni correo de propietario. Captura: evidencias/capturas/n8n-inicio-local.png. El 401 inicial de `/rest/login` corresponde a una instancia sin sesión y no se contabiliza como acceso autenticado.

Web, API, health de n8n y PostgreSQL respondieron al comando npm run status. Un health positivo no demuestra por sí solo que el editor haya terminado de arrancar; la pantalla se comprobó por separado después de su inicialización.

El arranque registró el runner JavaScript. El runner Python interno informó entorno virtual faltante; estos workflows utilizan SQL y JavaScript, por lo que no se instaló una dependencia Python innecesaria ni se declara validado ese runner.
