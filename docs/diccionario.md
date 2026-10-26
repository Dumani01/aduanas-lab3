# Diccionario del esquema real

Generado consultando PostgreSQL. PK: identificación. FK: referencia histórica con ON DELETE NO ACTION, salvo indicación SQL. NULL se permite únicamente donde se indica. Catálogos no se borran si están referenciados.

Unidades: cantidades según unidad del detalle; capacidad en kg; importes USD; tarifa porcentaje académico; timestamps con zona. Tablas técnicas: usuarios, sesiones, operaciones (idempotencia), eventos (auditoría); las restantes son de negocio.

## agentes (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| licencia | character varying(40) | NO | — |
| nombre | character varying(160) | NO | — |
| activo | boolean | NO | true |

Restricciones:

- `NOT NULL activo`
- `NOT NULL id`
- `UNIQUE (licencia)`
- `NOT NULL licencia`
- `NOT NULL nombre`
- `PRIMARY KEY (id)`

## bodegas (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| codigo | character varying(30) | NO | — |
| nombre | character varying(160) | NO | — |
| capacidad_kg | numeric(16,3) | NO | — |
| activo | boolean | NO | true |

Restricciones:

- `NOT NULL activo`
- `CHECK ((capacidad_kg > (0)::numeric))`
- `NOT NULL capacidad_kg`
- `UNIQUE (codigo)`
- `NOT NULL codigo`
- `NOT NULL id`
- `NOT NULL nombre`
- `PRIMARY KEY (id)`

## contenedores (negocio; 30 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| codigo | character varying(30) | NO | — |
| declaracion_id | bigint | NO | — |
| pais_id | bigint | NO | — |
| fecha_recepcion | date | NO | — |

Restricciones:

- `UNIQUE (codigo)`
- `NOT NULL codigo`
- `FOREIGN KEY (declaracion_id) REFERENCES aduana.declaraciones(id)`
- `NOT NULL declaracion_id`
- `NOT NULL fecha_recepcion`
- `NOT NULL id`
- `FOREIGN KEY (pais_id) REFERENCES aduana.paises(id)`
- `NOT NULL pais_id`
- `PRIMARY KEY (id)`

## declaraciones (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| numero | character varying(40) | NO | — |
| operador_id | bigint | NO | — |
| agente_id | bigint | NO | — |
| fecha | date | NO | — |
| regimen | character varying(20) | NO | — |
| estado | character varying(20) | NO | 'REGISTRADA'::character varying |
| moneda | character(3) | NO | 'USD'::bpchar |

Restricciones:

- `FOREIGN KEY (agente_id) REFERENCES aduana.agentes(id)`
- `NOT NULL agente_id`
- `CHECK (((estado)::text = ANY ((ARRAY['REGISTRADA'::character varying, 'ANULADA'::character varying])::text[])))`
- `NOT NULL estado`
- `NOT NULL fecha`
- `NOT NULL id`
- `CHECK ((moneda = 'USD'::bpchar))`
- `NOT NULL moneda`
- `UNIQUE (numero)`
- `NOT NULL numero`
- `FOREIGN KEY (operador_id) REFERENCES aduana.operadores(id)`
- `NOT NULL operador_id`
- `PRIMARY KEY (id)`
- `CHECK (((regimen)::text = ANY ((ARRAY['IMPORTACION'::character varying, 'EXPORTACION'::character varying, 'TRANSITO'::character varying])::text[])))`
- `NOT NULL regimen`

## detalles (negocio; 30 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| declaracion_id | bigint | NO | — |
| linea | integer | NO | — |
| producto_id | bigint | NO | — |
| pais_id | bigint | NO | — |
| cantidad | numeric(16,3) | NO | — |
| valor_unitario | numeric(16,4) | NO | — |
| tarifa_aplicada | numeric(6,3) | NO | — |
| producto_nombre | character varying(160) | NO | — |
| unidad | character varying(10) | NO | — |

Restricciones:

- `CHECK ((cantidad > (0)::numeric))`
- `NOT NULL cantidad`
- `CHECK ((((unidad)::text <> 'unidad'::text) OR (cantidad = trunc(cantidad))))`
- `FOREIGN KEY (declaracion_id) REFERENCES aduana.declaraciones(id)`
- `UNIQUE (declaracion_id, linea)`
- `NOT NULL declaracion_id`
- `NOT NULL id`
- `CHECK ((linea > 0))`
- `NOT NULL linea`
- `FOREIGN KEY (pais_id) REFERENCES aduana.paises(id)`
- `NOT NULL pais_id`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (producto_id) REFERENCES aduana.productos(id)`
- `NOT NULL producto_id`
- `NOT NULL producto_nombre`
- `CHECK (((tarifa_aplicada >= (0)::numeric) AND (tarifa_aplicada <= (100)::numeric)))`
- `NOT NULL tarifa_aplicada`
- `CHECK (((unidad)::text = ANY ((ARRAY['unidad'::character varying, 'kg'::character varying, 'litro'::character varying])::text[])))`
- `NOT NULL unidad`
- `CHECK ((valor_unitario >= (0)::numeric))`
- `NOT NULL valor_unitario`

## eventos (técnica; 20 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| lote_id | bigint | NO | — |
| usuario_id | bigint | NO | — |
| accion | character varying(30) | NO | — |
| motivo | character varying(500) | NO | — |
| fecha | timestamp with time zone | NO | now() |

Restricciones:

- `NOT NULL accion`
- `NOT NULL fecha`
- `NOT NULL id`
- `FOREIGN KEY (lote_id) REFERENCES aduana.lotes(id)`
- `NOT NULL lote_id`
- `NOT NULL motivo`
- `PRIMARY KEY (id)`
- `FOREIGN KEY (usuario_id) REFERENCES aduana.usuarios(id)`
- `NOT NULL usuario_id`

## existencias (negocio; 31 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| lote_id | bigint | NO | — |
| bodega_id | bigint | NO | — |
| cantidad | numeric(16,3) | NO | 0 |

Restricciones:

- `FOREIGN KEY (bodega_id) REFERENCES aduana.bodegas(id)`
- `NOT NULL bodega_id`
- `CHECK ((cantidad >= (0)::numeric))`
- `NOT NULL cantidad`
- `NOT NULL id`
- `UNIQUE (lote_id, bodega_id)`
- `FOREIGN KEY (lote_id) REFERENCES aduana.lotes(id)`
- `NOT NULL lote_id`
- `PRIMARY KEY (id)`

## funcionarios (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| codigo | character varying(30) | NO | — |
| nombre | character varying(160) | NO | — |
| activo | boolean | NO | true |

Restricciones:

- `NOT NULL activo`
- `UNIQUE (codigo)`
- `NOT NULL codigo`
- `NOT NULL id`
- `NOT NULL nombre`
- `PRIMARY KEY (id)`

## inspecciones (negocio; 30 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| lote_id | bigint | NO | — |
| funcionario_id | bigint | NO | — |
| resultado | character varying(15) | NO | — |
| observaciones | character varying(1000) | NO | — |
| fecha | timestamp with time zone | NO | now() |
| usuario_id | bigint | NO | — |

Restricciones:

- `NOT NULL fecha`
- `FOREIGN KEY (funcionario_id) REFERENCES aduana.funcionarios(id)`
- `NOT NULL funcionario_id`
- `NOT NULL id`
- `FOREIGN KEY (lote_id) REFERENCES aduana.lotes(id)`
- `NOT NULL lote_id`
- `NOT NULL observaciones`
- `PRIMARY KEY (id)`
- `CHECK (((resultado)::text = ANY ((ARRAY['RETENER'::character varying, 'APROBADO'::character varying])::text[])))`
- `NOT NULL resultado`
- `FOREIGN KEY (usuario_id) REFERENCES aduana.usuarios(id)`
- `NOT NULL usuario_id`

## lotes (negocio; 30 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| codigo | character varying(40) | NO | — |
| detalle_id | bigint | NO | — |
| estado | character varying(15) | NO | 'RETENIDO'::character varying |
| creado_en | timestamp with time zone | NO | now() |
| liberado_en | timestamp with time zone | YES | — |

Restricciones:

- `CHECK (((((estado)::text = 'RETENIDO'::text) AND (liberado_en IS NULL)) OR (((estado)::text = 'LIBERADO'::text) AND (liberado_en IS NOT NULL))))`
- `UNIQUE (codigo)`
- `NOT NULL codigo`
- `NOT NULL creado_en`
- `FOREIGN KEY (detalle_id) REFERENCES aduana.detalles(id)`
- `NOT NULL detalle_id`
- `CHECK (((estado)::text = ANY ((ARRAY['RETENIDO'::character varying, 'LIBERADO'::character varying])::text[])))`
- `NOT NULL estado`
- `NOT NULL id`
- `PRIMARY KEY (id)`

## movimientos (negocio; 34 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| lote_id | bigint | NO | — |
| bodega_id | bigint | NO | — |
| tipo | character varying(20) | NO | — |
| cantidad | numeric(16,3) | NO | — |
| fecha | timestamp with time zone | NO | now() |
| motivo | character varying(500) | NO | — |
| usuario_id | bigint | NO | — |
| operacion_id | uuid | NO | — |

Restricciones:

- `FOREIGN KEY (bodega_id) REFERENCES aduana.bodegas(id)`
- `NOT NULL bodega_id`
- `CHECK ((cantidad <> (0)::numeric))`
- `NOT NULL cantidad`
- `CHECK (((((tipo)::text = ANY ((ARRAY['RECEPCION'::character varying, 'TRASLADO_ENTRADA'::character varying])::text[])) AND (cantidad > (0)::numeric)) OR (((tipo)::text = ANY ((ARRAY['SALIDA'::character varying, 'TRASLADO_SALIDA'::character varying])::text[])) AND (cantidad < (0)::numeric))))`
- `NOT NULL fecha`
- `NOT NULL id`
- `FOREIGN KEY (lote_id) REFERENCES aduana.lotes(id)`
- `NOT NULL lote_id`
- `CHECK ((length(TRIM(BOTH FROM motivo)) >= 3))`
- `NOT NULL motivo`
- `FOREIGN KEY (operacion_id) REFERENCES aduana.operaciones(clave)`
- `NOT NULL operacion_id`
- `PRIMARY KEY (id)`
- `CHECK (((tipo)::text = ANY ((ARRAY['RECEPCION'::character varying, 'TRASLADO_ENTRADA'::character varying, 'TRASLADO_SALIDA'::character varying, 'SALIDA'::character varying])::text[])))`
- `NOT NULL tipo`
- `FOREIGN KEY (usuario_id) REFERENCES aduana.usuarios(id)`
- `NOT NULL usuario_id`

## operaciones (técnica; 33 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| clave | uuid | NO | — |
| usuario_id | bigint | NO | — |
| payload | jsonb | NO | — |
| creado_en | timestamp with time zone | NO | now() |

Restricciones:

- `NOT NULL clave`
- `NOT NULL creado_en`
- `NOT NULL payload`
- `PRIMARY KEY (clave)`
- `FOREIGN KEY (usuario_id) REFERENCES aduana.usuarios(id)`
- `NOT NULL usuario_id`

## operadores (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| identificacion | character varying(40) | NO | — |
| nombre | character varying(160) | NO | — |
| activo | boolean | NO | true |

Restricciones:

- `NOT NULL activo`
- `NOT NULL id`
- `UNIQUE (identificacion)`
- `NOT NULL identificacion`
- `NOT NULL nombre`
- `PRIMARY KEY (id)`

## paises (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| codigo | character(2) | NO | — |
| nombre | character varying(100) | NO | — |

Restricciones:

- `UNIQUE (codigo)`
- `NOT NULL codigo`
- `NOT NULL id`
- `UNIQUE (nombre)`
- `NOT NULL nombre`
- `PRIMARY KEY (id)`

## partidas (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| codigo | character varying(20) | NO | — |
| nombre | character varying(160) | NO | — |
| tarifa | numeric(6,3) | NO | 0 |

Restricciones:

- `UNIQUE (codigo)`
- `NOT NULL codigo`
- `NOT NULL id`
- `NOT NULL nombre`
- `PRIMARY KEY (id)`
- `CHECK (((tarifa >= (0)::numeric) AND (tarifa <= (100)::numeric)))`
- `NOT NULL tarifa`

## productos (negocio; 15 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| sku | character varying(40) | NO | — |
| nombre | character varying(160) | NO | — |
| partida_id | bigint | NO | — |
| unidad | character varying(10) | NO | — |
| activo | boolean | NO | true |

Restricciones:

- `NOT NULL activo`
- `NOT NULL id`
- `NOT NULL nombre`
- `FOREIGN KEY (partida_id) REFERENCES aduana.partidas(id)`
- `NOT NULL partida_id`
- `PRIMARY KEY (id)`
- `UNIQUE (sku)`
- `NOT NULL sku`
- `CHECK (((unidad)::text = ANY ((ARRAY['unidad'::character varying, 'kg'::character varying, 'litro'::character varying])::text[])))`
- `NOT NULL unidad`

## sesiones (técnica; 5 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| sid | character varying | NO | — |
| sess | json | NO | — |
| expire | timestamp without time zone | NO | — |

Restricciones:

- `NOT NULL expire`
- `PRIMARY KEY (sid)`
- `NOT NULL sess`
- `NOT NULL sid`

## usuarios (técnica; 3 filas)

| Columna | Tipo | NULL | Predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| nombre | character varying(100) | NO | — |
| password_hash | text | NO | — |
| rol | character varying(15) | NO | — |
| activo | boolean | NO | true |

Restricciones:

- `NOT NULL activo`
- `NOT NULL id`
- `UNIQUE (nombre)`
- `NOT NULL nombre`
- `NOT NULL password_hash`
- `PRIMARY KEY (id)`
- `CHECK (((rol)::text = ANY ((ARRAY['administrador'::character varying, 'operador'::character varying, 'consulta'::character varying])::text[])))`
- `NOT NULL rol`
