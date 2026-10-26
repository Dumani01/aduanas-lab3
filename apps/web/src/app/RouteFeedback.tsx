import { Link, useRouteError, useRevalidator, isRouteErrorResponse } from 'react-router-dom';
import { ErrorBox } from '../components/Feedback';
export function RouteError() {
  const error = useRouteError(); const revalidator = useRevalidator();
  const message = isRouteErrorResponse(error) ? `${error.status}: ${error.data || error.statusText}` : error;
  return <div className="route-error"><h1>No se pudo abrir esta página</h1><ErrorBox error={typeof message === 'string' ? new Error(message) : message} retry={() => revalidator.revalidate()} /><Link className="button secondary" to="/">Ir al inicio</Link><Link className="button secondary" to="/login">Iniciar sesión</Link></div>;
}
export function NotFound() { return <div className="empty"><h1>Página no encontrada</h1><p>Revisa la dirección o vuelve a la vista general.</p><Link className="button" to="/">Volver al inicio</Link></div>; }
