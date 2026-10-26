import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
async function login(page: Page, nombre = 'test-admin') {
  await page.goto('/login'); await page.getByLabel('Usuario', { exact: true }).fill(nombre);
  await page.getByLabel('Contraseña', { exact: true }).fill('test-isolated-password');
  await page.getByRole('button', { name: 'Entrar al sistema' }).click();
  await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
}
test('Navegación, filtros, recarga, errores, teclado y tres tamaños', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await login(page); await mkdir('evidencias/capturas', { recursive: true });
  for (const width of [1440, 768, 360]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `evidencias/capturas/dashboard-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/lotes'); await page.getByLabel('Producto, lote u origen').fill('China');
  await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('RETENIDO');
  await page.getByRole('combobox', { name: 'Bodega con saldo', exact: true }).selectOption('2'); await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(/q=China/); await page.reload();
  await expect(page.getByLabel('Producto, lote u origen')).toHaveValue('China');
  await expect(page.getByRole('link', { name: 'LOT-2026-0017', exact: true })).toBeVisible();
  await page.screenshot({ path: 'evidencias/capturas/china-retenida-bodega2.png', fullPage: true });
  await page.goto('/lotes/999999'); await expect(page.getByRole('alert')).toContainText('Lote inexistente');
  await page.goto('/ruta-inexistente'); await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  await page.goto('/chat'); await expect(page.getByText('Pendiente de configuración', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  await page.goto('/productos'); await page.getByRole('button', { name: 'Nuevo registro' }).click();
  await page.getByLabel('SKU', { exact: true }).fill('TECLADO'); await page.keyboard.press('Tab');
  await expect(page.getByLabel('Nombre del producto')).toBeFocused();
  await page.getByRole('link', { name: 'Bodegas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bodegas', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuevo registro', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('Flujo real: declaración → recepción → inspección → liberación → traslado → salida', async ({ page }) => {
  await login(page); const number = `E2E-${Date.now()}`;
  await page.goto('/declaraciones/nueva');
  await page.getByLabel('Número de declaración').fill(number);
  await page.getByRole('combobox', { name: 'Operador comercial', exact: true }).selectOption('1'); await page.getByRole('combobox', { name: 'Agente aduanal', exact: true }).selectOption('1');
  await page.getByLabel('Fecha de declaración').fill('2026-10-23'); await page.getByRole('combobox', { name: 'Producto', exact: true }).selectOption('1');
  await page.getByLabel('País de origen').selectOption('1'); await page.getByLabel('Cantidad declarada').fill('10');
  await page.getByLabel('Valor unitario (USD)').fill('25'); await page.getByLabel('Código', { exact: true }).fill(`CT-${Date.now()}`);
  await page.getByLabel('País de procedencia').selectOption('1'); await page.getByLabel('Fecha de recepción').fill('2026-10-23');
  await page.getByRole('button', { name: 'Registrar declaración', exact: true }).click();
  await expect(page.getByRole('heading', { name: number, exact: true })).toBeVisible(); await page.reload();
  await expect(page.getByRole('heading', { name: number, exact: true })).toBeVisible();
  const data = await (await page.request.get('/api/lotes')).json();
  const lot = data.rows.find((r: { declaracion: string }) => r.declaracion === number); expect(lot).toBeTruthy();
  page.on('dialog', d => d.accept());
  async function movement(type: string, qty: string, from: string | null, to: string | null) {
    await page.goto(`/movimientos/nuevo?lote=${lot.id}`); await page.getByLabel('Tipo de operación').selectOption(type);
    await page.getByLabel('Cantidad (unidad del lote)').fill(qty);
    if (from) await page.getByRole('combobox', { name: 'Bodega de origen', exact: true }).selectOption(from);
    if (to) await page.getByRole('combobox', { name: 'Bodega de destino', exact: true }).selectOption(to);
    await page.getByLabel('Motivo', { exact: true }).fill('Evidencia E2E de demostración');
    await page.getByRole('button', { name: 'Confirmar operación' }).click();
  }
  await movement('RECEPCION', '10', null, '1'); await expect(page.getByRole('heading', { name: lot.codigo, exact: true })).toBeVisible();
  await movement('SALIDA', '1', '1', null); await expect(page.getByRole('alert')).toContainText('Mercancía retenida');
  await page.goto(`/inspecciones/nueva?lote=${lot.id}`); await page.getByRole('combobox', { name: 'Funcionario', exact: true }).selectOption('1');
  await page.getByRole('combobox', { name: 'Resultado', exact: true }).selectOption('APROBADO'); await page.getByLabel('Observaciones').fill('Inspección E2E <img src=x onerror="window.__aduanaXss=1"> conforme');
  await page.getByRole('button', { name: 'Registrar inspección' }).click();
  await expect(page.getByRole('heading', { name: lot.codigo, exact: true })).toBeVisible();
  await expect(page.getByText('Inspección E2E <img src=x onerror="window.__aduanaXss=1"> conforme', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__aduanaXss)).toBeUndefined();
  await page.getByLabel('Motivo de liberación').fill('Liberación E2E verificada'); await page.getByRole('button', { name: 'Liberar lote', exact: true }).click();
  await expect(page.getByText('Lote liberado. El saldo no ha cambiado.', { exact: true })).toBeVisible();
  await movement('TRASLADO', '4', '1', '2'); await expect(page.getByRole('heading', { name: lot.codigo, exact: true })).toBeVisible();
  await movement('SALIDA', '2', '2', null); await expect(page.getByRole('heading', { name: lot.codigo, exact: true })).toBeVisible(); await page.reload();
  const detail = await (await page.request.get(`/api/lotes/${lot.id}`)).json();
  expect(detail.estado).toBe('LIBERADO'); expect(detail.existencias.reduce((s: number, r: { cantidad: string }) => s + Number(r.cantidad), 0)).toBe(8);
  expect(detail.movimientos).toHaveLength(4); await page.screenshot({ path: 'evidencias/capturas/lote-recorrido-e2e.png', fullPage: true });
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
});
test('Consulta no puede abrir operaciones y API rechaza escritura directa', async ({ page }) => {
  await login(page, 'test-read'); await page.goto('/movimientos/nuevo');
  await expect(page.getByRole('alert')).toContainText('403');
  const me = await (await page.request.get('/api/auth/me')).json();
  const result = await page.request.post('/api/movimientos', { headers: { Origin: 'http://127.0.0.1:3002', 'x-csrf-token': me.csrf }, data: {} });
  expect(result.status()).toBe(403);
});
