# Registro de defectos

| ID | Severidad | Reproducción / causa | Corrección | Regresión / estado |
|---|---|---|---|---|
| DEF-01 | alto (entorno) | n8n import:workflow con SQLite: driver sqlite3 ausente | instancia aislada n8n_lab3 en PostgreSQL; no se modificó instalación global | importación y exportación código 0; resuelto para esta instancia |
| DEF-02 | medio | lint señaló setState en effect y exportaciones mixtas | cierre de menú desde eventos, metadatos separados y componentes de feedback | lint limpio; resuelto |
| DEF-03 | medio | navegador: foco programático desplazaba captura y resaltaba todo main | focus preventScroll y estilo de foco del contenedor | capturas móviles/escritorio repetidas; resuelto |
| DEF-04 | medio (prueba) | E2E getByLabel exact incluía texto de opciones de select | localizar combobox por nombre accesible | 3 E2E aprobados; resuelto |
| DEF-05 | medio (fixture) | prueba esperaba origen China para lote16, pero ese lote es de Estados Unidos | agregar recepción del lote17 chino y usarlo en filtro; conservar ambos orígenes | integración y filtro China+bodega2 aprobados; resuelto |
| DEF-06 | alto | rol app podía INSERT lote con estado LIBERADO explícito | grants por columnas: solo codigo/detalle_id, estado por función | prueba de bypass rechazada por PostgreSQL 42501; resuelto |
| DEF-07 | medio | capacidad de bodega podía reducirse bajo saldo kg; snapshot recibido del cliente podía ser incorrecto | triggers validan capacidad y fijan snapshot desde catálogo | prueba rechaza capacidad menor al saldo y corrige unidad/nombre/tarifa manipulados; resuelto en alcance probado |
| DEF-08 | alto (externo) | no existe credencial de modelo para agente | integración y ocho referencias SQL preparadas | bloquea respuestas reales, memoria y chat E2E; abierto/bloqueado |
| DEF-09 | alto (académico) | DOCX original no entregado, integrantes desconocidos | registrar supuestos y nombres PENDIENTE | bloquea conformidad académica final; abierto/bloqueado |
| DEF-10 | bajo (desarrollo) | variable user añadida antes de condicionar enlace provocó TS6133 | enlace de nueva operación condicionado al rol | build posterior aprobado; resuelto |
| DEF-11 | alto | puerto 3001 ocupado por aplicación ajena; Express 5 entrega error al callback y el arranque lo ignoraba | API movida a 4310, proxy y configuración actualizados; callback comprueba error y falla explícitamente | health directo y vía Vite aprobados; smoke con cuenta local real registrado; no se detuvo servicio ajeno |
| DEF-12 | alto | llamada SQL directa a mover con tipo NULL devolvía éxito sin movimiento; reproducción revertida en aduana_test | migración 003 rechaza explícitamente parámetros NULL | regresión valida P0001, ninguna operación nueva y saldo intacto; 16 integración + 3 E2E aprobadas; resuelto |

No se declara aprobación final mientras existan bloqueos altos. Los fallos de test se corrigieron contrastando datos y comportamiento esperado, sin ocultar errores ni relajar reglas válidas.
