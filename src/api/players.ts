import api from './client';
import type { Player, Character, Group } from '../types';

export const playersApi = {
  getAll: () => api.get<Player[]>('/players').then(r => r.data),
  getById: (id: number) => api.get<Player>(`/players/${id}`).then(r => r.data),
  create: (data: { nom: string }) => api.post<Player>('/players', data).then(r => r.data),
  update: (id: number, data: { nom?: string }) => api.patch<Player>(`/players/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/players/${id}`),
  getCharacters: (id: number) => api.get<Character[]>(`/players/${id}/characters`).then(r => r.data),
  getGroups: (id: number) => api.get<Group[]>(`/players/${id}/groups`).then(r => r.data),
};
