import { chromium, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const accounts = JSON.parse(await readFile('database/seeds/demo-accounts.json', 'utf8'));
const browser = await chromium.launch();
const results = [];
try {
  for (const account of accounts) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173/login');
      await page.getByLabel('Usuario', { exact: true }).fill(account.nombre);
      await page.locator('input[name="password"]').fill(account.password);
      await page.getByRole('button', { name: 'Entrar al sistema' }).click();
      await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
      const me = await (await page.request.get('http://127.0.0.1:5173/api/auth/me')).json();
      expect(me.user.nombre).toBe(account.nombre); expect(me.user.rol).toBe(account.rol);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Vista general', exact: true })).toBeVisible();
      results.push({ usuario: account.nombre, rol: account.rol, login: 'aprobado', recarga: 'aprobada' });
    } finally { await context.close(); }
  }
  await writeFile('evidencias/acceso-cuentas-fijas.json', JSON.stringify({ scope: 'Acceso real de las tres cuentas locales; sin contraseñas en esta evidencia', resultados: results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
