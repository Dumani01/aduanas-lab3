param([ValidateSet('init','start','stop')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
$workspacePath = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $workspacePath
$postgresBin = Join-Path $workspacePath '.local\pgsql\bin'
$dataPath = Join-Path $workspacePath '.local\pgdata'
if (!(Test-Path -LiteralPath (Join-Path $postgresBin 'pg_ctl.exe'))) { throw 'Descargue y extraiga los binarios de PostgreSQL en .local/pgsql. Ver README.' }
if ($Action -eq 'init') {
  if (Test-Path -LiteralPath $dataPath) { throw 'El directorio ya existe. No se sobrescribe ninguna base.' }
  node scripts/local-config.mjs
  & "$postgresBin\initdb.exe" -D $dataPath -U postgres -E UTF8 --locale=C --auth=scram-sha-256 --pwfile=.local/admin-password.txt
  if ($LASTEXITCODE -ne 0) { throw 'initdb falló' }
}
if ($Action -eq 'stop') {
  & "$postgresBin\pg_ctl.exe" -D $dataPath -m fast -w stop
} else {
  & "$postgresBin\pg_ctl.exe" -D $dataPath -l .local/postgres.log -o '-p 55432 -h 127.0.0.1' -w start
}
if ($LASTEXITCODE -ne 0) { throw 'pg_ctl falló; revise .local/postgres.log' }
