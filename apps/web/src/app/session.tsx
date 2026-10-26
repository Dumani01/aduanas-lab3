import { createContext, useContext } from 'react';
export type User = { id: string; nombre: string; rol: 'administrador' | 'operador' | 'consulta' };
export const SessionContext = createContext<User | null>(null);
export function useUser() { const user = useContext(SessionContext); if (!user) throw new Error('Sesión requerida'); return user; }
