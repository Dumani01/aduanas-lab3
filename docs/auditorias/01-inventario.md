# Auditoría de inventario y aplicación

## Alcance y entorno

Windows; Node 24.19.0; PostgreSQL local aislado, puerto 55432; React Router DOM 7.18.4; n8n 2.44.6. Versión exacta del servidor en evidencias/esquema-real.json y dependencias en package-lock.json.

## Procedimiento ejecutado

1. Crear clúster nuevo en .local/pgdata; roles sin superusuario; bases aduana y aduana_test. No se tocaron bases ajenas.
2. npm run db:migrate y npm run db:seed terminaron con código 0 en aduana.
3. npm test: 15/15 aprobadas en aduana_test, cuyo nombre/host se comprueban antes de limpiar sus esquemas.
4. npm run build: TypeScript de API y frontend y build Vite aprobados.
5. npm run lint: sin advertencias después de corregir cuatro observaciones de React.
6. npm run test:e2e: 15 pruebas de integración + 3 pruebas Chromium aprobadas; capturas a 360/768/1440 y flujo completo con recarga.
7. Ocho SELECT ejecutados contra seed aduana; cero diferencias de reconciliación entre existencias y movimientos.
8. Importar n8n/workflow.json en instancia aislada: código 0, “Successfully imported 1 workflow”. No demuestra ejecución con LLM.

## Resultados significativos

- Una recepción repetida con la misma clave deja un movimiento. Reutilizar la clave con distinto contenido se rechaza.
- Salida retenida o superior al saldo falla sin cambios.
- Dos salidas concurrentes de 80 desde saldo 100: una aprobada, otra rechazada, saldo final 20.
- Traslado conserva total; destino inválido revierte saldo e historia.
- Producto 1 conserva China y Estados Unidos en lotes separados.
- FK impide borrar producto histórico; cambio de nombre no cambia instantánea del detalle.
- Lector rechazó escritura y funciones operativas incluso con read-only desactivado. Aplicación rechazó UPDATE directo de existencia.
- API rechazó origen ajeno, ausencia de CSRF y escritura de usuario consulta. Búsqueda SQL injection no modificó tablas.
- E2E sobre build de producción completó declaración→recepción→rechazo retenido→inspección→liberación→traslado→salida, con saldo e historial comprobados en API después de recarga.

## Límites

Sin credencial del modelo no se prueban exactitud del agente, aislamiento efectivo de su memoria, prompt injection ni chat web completo. No se declara seguridad absoluta. Las pruebas del catálogo no cubren todas sus combinaciones. Correcciones/reversos y anulación no están habilitados. Falta contrastar documento académico original e integrantes.

## Rendimiento local

Base separada aduana_perf, datos sintéticos: 5015 declaraciones, 5030 lotes, 5034 movimientos. Umbrales fijados antes de medir: p95 SQL <150ms y dashboard API <300ms; una muestra de calentamiento excluida y 30 muestras por operación. Resultados: retenidos 4.580ms; China/bodega2 5.797ms; mayor importador 7.466ms; dashboard API 25.208ms. Equipo, OS, memoria, Node y detalles en evidencias/rendimiento.json. No es carga multiusuario ni medición del modelo de IA ni SLA de producción.

## Entregables visuales

PDF de investigación: cinco páginas renderizadas y examinadas visualmente, sin cortes/solapamientos observados. DER generado del esquema real, con PK/FK, tipos, NN/NULL, UQ simple/compuesta y cardinalidad; diccionario incluye restricciones completas. Nombres académicos y documento fuente siguen pendientes.
