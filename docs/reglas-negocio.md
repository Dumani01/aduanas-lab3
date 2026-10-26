# Reglas del dominio

Declaración → detalle (línea, producto, país, cantidad, valor y tarifa históricos) → lote → existencia por bodega → movimiento. El importador corresponde a la declaración. Dos países para un producto se conservan en detalles/lotes distintos.

Una declaración registrada es un documento histórico; su edición posterior no está habilitada. La relación N:M declaración/producto se resuelve con detalles; UNIQUE(declaracion_id,linea) permite repetir producto en líneas diferentes. No se agrega una relación recursiva sin necesidad de negocio.

El lote está RETENIDO o LIBERADO. Inspección APROBADO permite una liberación explícita; RETENER vuelve a retenerlo. Liberar no modifica el saldo. Una salida exige liberación y saldo. Disponible significa saldo positivo de lote liberado. Despachado/agotado se deriva de salidas y saldo cero; no es un estado que borre retenciones históricas. Declaración ANULADA rechaza movimientos; no se ofrece anulación hasta definir reversos documentales.

Recepción suma, salida resta y traslado genera dos movimientos en una transacción. Se admiten traslados de mercancía retenida sin que eso la libere. No hay actualización directa de saldo autorizada al rol de aplicación. La función SQL bloquea lote, detalle y bodegas en orden, valida capacidad kg y cantidades declaradas y guarda una clave UUID idempotente ligada al usuario y contenido. Errores revierten toda la operación.

Cantidad numeric(16,3); unidad exige enteros; kg/litro admiten tres decimales. USD numeric(16,4), tarifas numeric(6,3). No se suman unidades incompatibles. Capacidad kg solo controla mercancías en kg; no demuestra capacidad volumétrica ni peso de productos contados por unidad.

Catálogos mantienen referencias por FK sin cascadas. Detalles conservan nombre/unidad/valor/tarifa históricos. Correcciones de saldo no están habilitadas por CRUD: un reverso futuro debe ser una operación explícita auditada; no se borran movimientos.
