import api from './client';
import type { CombatState } from '../types';

export const combatApi = {
  getAll: () => api.get<CombatState[]>('/combats').then(r => r.data),
  getById: (id: number) => api.get<CombatState>(`/combats/${id}`).then(r => r.data),
  create: (data: { groupeId: number; monstres: unknown[]; mapId?: number }) =>
    api.post<CombatState>('/combats', data).then(r => r.data),
  remove: (id: number) => api.delete(`/combats/${id}`),
  action: (id: number, data: { entiteId: number; sortId?: number; useArme?: boolean; targetX: number; targetY: number }) =>
    api.post<CombatState>(`/combats/${id}/action`, data).then(r => r.data),
  move: (id: number, data: { entiteId: number; targetX: number; targetY: number }) =>
    api.post<CombatState>(`/combats/${id}/move`, data).then(r => r.data),
  endTurn: (id: number, data: { entiteId: number }) =>
    api.post<CombatState>(`/combats/${id}/end-turn`, data).then(r => r.data),
  flee: (id: number, data: { entiteId: number }) =>
    api.post<CombatState>(`/combats/${id}/flee`, data).then(r => r.data),
};
