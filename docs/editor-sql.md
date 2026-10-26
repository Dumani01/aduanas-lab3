# Aviso de SQL Server en archivos PostgreSQL

El mensaje «Non-SQL Server SQL file detected. Disable IntelliSense for such files?» proviene de la extensión ms-mssql.mssql. Este proyecto utiliza PostgreSQL; ese aviso no indica un fallo de ejecución del script académico.

Se verificó la configuración admitida por la extensión instalada ms-mssql.mssql 1.47.0 y se añadió en .vscode/settings.json:

```json
{
  "mssql.autoDisableNonTSqlLanguageService": true
}
```

El ajuste tiene alcance del proyecto y desactiva automáticamente el servicio T-SQL cuando detecta un archivo de otro dialecto. No desinstala ni modifica la extensión en otros proyectos. Reabrir el archivo SQL para que el editor aplique la configuración; si el aviso anterior permanece abierto, puede cerrarse.

El SQL académico debe ejecutarse con PostgreSQL en una base nueva, como explica README.md, no con una conexión a Microsoft SQL Server. No fue necesario convertir ni modificar el SQL para resolver esta incompatibilidad del editor. Las instalaciones limpias previas constan en evidencias/instalaciones-limpias.json.
