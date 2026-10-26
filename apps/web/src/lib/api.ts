let csrf = '';
export function setCsrf(value: string) { csrf = value; }
export class ApiError extends Error {
  status: number;
  fields: { path: string; message: string }[];
  constructor(status: number, message: string, fields = []) { super(message); this.status = status; this.fields = fields; }
}
export async function api<T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options,
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf, ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data.error || 'No se pudo completar la solicitud', data.fields);
  return data;
}
export const post = <T = Record<string, unknown>>(path: string, data: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export type Row = Record<string, string | number | boolean | null>;
export type PageData = { rows: Row[]; total: number; page: number };
export type References = Record<string, Row[]>;
export function money(value: unknown) { return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'USD' }).format(Number(value)); }
export function quantity(value: unknown) { return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 3 }).format(Number(value)); }
export function date(value: unknown) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'America/Costa_Rica' }).format(new Date(String(value).length === 10 ? `${value}T12:00:00-06:00` : String(value)));
}
