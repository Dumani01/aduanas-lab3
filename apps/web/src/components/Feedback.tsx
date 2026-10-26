import { ApiError } from '../lib/api';
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="notice error" role="alert"><strong>{error instanceof Error ? error.message : 'No se pudo cargar la información'}</strong>{error instanceof ApiError && error.fields?.length > 0 && <ul>{error.fields.map(f => <li key={f.path}>{f.path}: {f.message}</li>)}</ul>}{retry && <button type="button" className="button secondary" onClick={retry}>Reintentar</button>}</div>;
}
export function Loading() { return <p className="loading" role="status">Cargando información…</p>; }
