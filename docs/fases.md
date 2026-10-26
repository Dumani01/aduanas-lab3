# Avance por fase del prompt maestro

El siguiente cierre pendiente es la **Fase 9 (agente n8n)**. La conexión SQL ya se ejecutó desde n8n, pero falta la credencial del modelo para validar respuestas y pasar la Fase 10. Se adelantaron pruebas, rendimiento y documentos mientras se resolvían las dependencias.

| Fase | Alcance | Estado comprobado |
|---|---|---|
| 0 | Inspección | Entorno inventariado; DOCX original pendiente |
| 1 | Reglas de negocio | Reglas documentadas y operaciones principales probadas |
| 2 | DER y diccionario | Generados del esquema real; PNG revisado |
| 3 | SQL | Tres migraciones; script actualizado instalado en dos bases nuevas |
| 4 | Datos | 15+ filas por tabla de negocio; stock conciliado |
| 5 | Consultas | Ocho consultas y expectativas independientes; ejecutadas también desde n8n |
| 6 | Backend | Persistencia y transacciones verificadas en alcance de pruebas |
| 7 | Web | React Router DOM; navegación y flujo operativo E2E |
| 8 | Dashboard | KPI reales y comparación con SQL |
| 9 | n8n | Credenciales lector/Header Auth vinculadas; diagnóstico SQL real aprobado; agente con modelo pendiente |
| 10 | Chat web | Implementado, pero bloqueado para validación completa con modelo real |
| 11 | Permisos | Tres roles, sesiones, CSRF y rechazo de escritura no autorizada probados |
| 12 | Inventario | 16 pruebas de integración y 3 E2E aprobados; no es cobertura absoluta |
| 13 | Seguridad | Casos de SQL injection, XSS, CSRF, roles y escaneo del proyecto; pruebas adversariales del agente pendientes |
| 14 | Interfaz/rendimiento | 360/768/1440, recarga, producción y volumen sintético separado comprobados |
| 15 | Investigación | PDF de cinco páginas revisado; faltan confirmación académica y reflexión personal |
| 16 | Entrega | Paquete preparado para revisión; faltan evidencias reales del agente y nombres finales |

No se considera cerrado todo el proyecto por haber llegado a fases posteriores. La puerta final sigue bloqueada por los requisitos del modelo/evidencias y por la documentación académica faltante.

Para consultar disponibilidad actual de servicios: `npm.cmd run status`. No muestra contraseñas. Detalles de lo ejecutado y sus límites en docs/auditorias/02-continuacion.md.
