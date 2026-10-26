# Matriz de requisitos

Referencia provisional: prompt-maestro.md. Falta contrastar el DOCX original. Verificado significa únicamente el alcance de prueba descrito. La web es ampliación, no reemplazo de entregables.

| ID | Interpretación | Implementación | Prueba / evidencia | Estado |
|---|---|---|---|---|
| LAB-01 | Investigación 3-6 páginas, A/B/C/D y uso IA | docs/investigacion y PDF | cinco páginas revisadas visualmente; A/B/C/D provisional hasta recibir DOCX | implementado |
| LAB-02 | Comparar SQLite/MySQL/PostgreSQL | docs/decisiones.md; investigación | fuentes oficiales consultadas | implementado |
| LAB-03 | 8+ entidades PK | 14 tablas de negocio; 4 técnicas | evidencias/esquema-real.json | verificado |
| LAB-04 | 1:N y N:M resuelta | declaraciones/detalles/productos | FK reales; UNIQUE declaración/línea | verificado |
| LAB-05 | DER con tipos, PK/FK/cardinalidad | docs/diagramas; diccionario | generado del catálogo PostgreSQL, UQ simple/compuesta, PNG revisado | verificado |
| LAB-06 | SQL completo, encabezado e instalación | entrega/*Aduana_Lab3.sql | versión final instalada en dos bases nuevas, cero discrepancias; integrantes pendientes | implementado |
| LAB-07 | NOT NULL/UNIQUE/CHECK/DEFAULT/PK/FK | database/migrations | 15 pruebas integración; esquema real | verificado |
| LAB-08 | 15 registros por tabla negocio | database/seeds; scripts/database.ts | conteos 15-34 por tabla negocio | verificado |
| LAB-09 | 8 SELECT correctos | database/queries/reports.json y consultas.sql | SQL real y ocho expectativas independientes aprobadas | verificado |
| LAB-10 | Chat Trigger/Agent/modelo/memoria/SQL | n8n/workflow.json | credenciales locales vinculadas y diagnóstico SQL real de ocho consultas aprobado; ejecución del AI Agent con modelo pendiente | bloqueado |
| LAB-11 | Prompt rol/esquema/reglas | n8n/system-prompt.md | esquema coincide; respuestas pendientes | implementado |
| LAB-12 | Lectura efectiva | database/roles/grants.sql | lector rechazó UPDATE y función de liberación incluso desactivando modo read-only | verificado |
| LAB-13 | 8 preguntas reales agente | docs/evaluacion-agente.md | SQL disponible; no hay credencial LLM | bloqueado |
| LAB-14 | PDF/DER/SQL/workflow/capturas | entrega/ | revisión final pendiente; evidencia LLM faltante | bloqueado |
| LAB-15 | Sin secretos en entregables | .gitignore; configuración .local | escaneo con secretos locales conocidos, cero coincidencias en archivos distribuibles | verificado |
| WEB-01 | Persistencia y operaciones completas | apps/api; apps/web | E2E declaración→recepción→inspección→liberación→traslado→salida y recarga | verificado |
| WEB-02 | KPI reales | /api/dashboard | conciliación de conteo/valor SQL y navegación real | verificado |
| WEB-03 | Chat real, sesiones aisladas | backend→n8n; memoria con sessionId de servidor | configuración ausente visible; E2E con LLM pendiente | bloqueado |
| WEB-04 | Dominio/integración/interfaz/seguridad | tests/ | 16 integración + 3 E2E, incluida regresión de parámetros NULL; seguridad limitada a casos documentados | implementado |
| WEB-05 | React Router DOM solicitado | src/app/router.tsx; layouts; features | navegación, deep links, recarga, 404 y 403 en Chromium | verificado |

Rúbrica conservada: investigación 15; Uso IA 5; DER 20; tablas/relaciones 20; datos 10; consultas 10; agente 20. No se asigna calificación. La ausencia de evidencia del agente bloquea aprobación final.
